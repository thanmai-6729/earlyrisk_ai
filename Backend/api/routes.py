from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import pandas as pd
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client (optional - graceful fallback if not available)
supabase = None
SupabaseClient = None

try:
    from supabase import create_client, Client as SupabaseClient
    
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    
    # Use service key for backend operations (bypasses RLS)
    if SUPABASE_URL and (SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY):
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY)
except ImportError:
    logging.warning("Supabase package not installed. PDF report features will be limited.")
except Exception as e:
    logging.warning(f"Failed to initialize Supabase client: {e}")

try:
    # Railway deployment (running from Backend folder)
    from engine.advisor import Advisor
    from engine.ml_predictor import MLPredictor
    from engine.risk_engine import RiskEngine, compute_trend_data
    from engine.document_scanner import (
        scan_document,
        validate_and_normalize_metrics,
        ExtractedMetrics,
    )
    from engine.report_generator import generate_health_report, generate_report_filename
except ImportError:
    # Local development (running from project root)
    from Backend.engine.advisor import Advisor
    from Backend.engine.ml_predictor import MLPredictor
    from Backend.engine.risk_engine import RiskEngine, compute_trend_data
    from Backend.engine.document_scanner import (
        scan_document,
        validate_and_normalize_metrics,
        ExtractedMetrics,
    )
    from Backend.engine.report_generator import generate_health_report, generate_report_filename

logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
PATIENTS_CSV = DATA_DIR / "patients.csv"
METRICS_CSV = DATA_DIR / "health_metrics.csv"

router = APIRouter()


UPLOADS_DIR = DATA_DIR / "uploads"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_csv_headers() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not PATIENTS_CSV.exists():
        PATIENTS_CSV.write_text("patient_id,age,gender,height_cm,created_at,updated_at\n", encoding="utf-8")

    if not METRICS_CSV.exists():
        METRICS_CSV.write_text(
            "record_id,patient_id,timestamp,weight_kg,bp_systolic,bp_diastolic,"
            "sugar_mgdl,hba1c_pct,cholesterol_mgdl,sleep_hours,exercise_mins_per_week,stress_level,family_history\n",
            encoding="utf-8",
        )


class HealthForm(BaseModel):
    patient_id: Optional[str] = Field(default=None, description="Existing patient id; omit to create")

    age: int = Field(ge=0, le=120)
    gender: str

    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)

    bp_systolic: float = Field(gt=0)
    bp_diastolic: float = Field(gt=0)

    sugar_mgdl: float = Field(gt=0)
    hba1c_pct: float = Field(gt=0)
    cholesterol_mgdl: float = Field(gt=0)

    sleep_hours: float = Field(ge=0, le=24)
    exercise_mins_per_week: float = Field(ge=0)
    stress_level: float = Field(ge=0, le=10)

    family_history: int = Field(ge=0, le=1, description="0/1")


class ScanDocumentRequest(BaseModel):
    """Request model for /scan-document endpoint"""
    file_url: str = Field(..., description="URL to the file in Supabase Storage")
    file_type: str = Field(..., description="File type: pdf, csv, png, jpg, jpeg")
    user_id: str = Field(..., description="User ID for tracking")
    # Optional baseline values to merge with extracted data
    age: Optional[int] = Field(default=30, ge=0, le=120)
    gender: Optional[str] = Field(default="other")
    height_cm: Optional[float] = Field(default=170, gt=0)
    weight_kg: Optional[float] = Field(default=70, gt=0)
    sleep_hours: Optional[float] = Field(default=7, ge=0, le=24)
    exercise_mins_per_week: Optional[float] = Field(default=120, ge=0)
    stress_level: Optional[float] = Field(default=5, ge=0, le=10)
    family_history: Optional[int] = Field(default=0, ge=0, le=1)


class ScanDocumentResponse(BaseModel):
    """Response model for /scan-document endpoint"""
    success: bool
    extracted_values: Dict[str, Any]
    normalized_values: Dict[str, Any]
    diabetesRisk: Optional[float] = None
    heartRisk: Optional[float] = None
    liverRisk: Optional[float] = None
    depressionRisk: Optional[float] = None
    advice: List[Dict[str, Any]] = []
    warnings: List[str] = []
    confidence: float = 0.0
    source_type: str = ""


def _extract_text_from_upload(file_path: Path, content_type: str) -> str:
    if content_type == "application/pdf" or file_path.suffix.lower() == ".pdf":
        try:
            import pdfplumber  # type: ignore
        except Exception:
            return ""

        text_parts: List[str] = []
        with pdfplumber.open(str(file_path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t.strip():
                    text_parts.append(t)
        return "\n".join(text_parts)

    # Images
    if content_type.startswith("image/") or file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
        try:
            from PIL import Image  # type: ignore
        except Exception:
            return ""
        try:
            import pytesseract  # type: ignore
        except Exception:
            return ""

        img = Image.open(str(file_path))
        return pytesseract.image_to_string(img) or ""

    return ""


def _detect_values(text: str) -> Dict[str, float]:
    """Best-effort parsing of common lab values from unstructured text."""
    if not text:
        return {}

    t = " ".join(text.split())

    def _find_first(patterns: List[str]) -> Optional[re.Match[str]]:
        for p in patterns:
            m = re.search(p, t, flags=re.IGNORECASE)
            if m:
                return m
        return None

    out: Dict[str, float] = {}

    # Glucose / Sugar (mg/dL)
    m = _find_first(
        [
            r"(?:fasting\s+)?(?:glucose|sugar)\s*[:\-]?\s*(\d{2,3})(?:\s*mg/?d[l1])?",
            r"(?:fbs|rbs)\s*[:\-]?\s*(\d{2,3})(?:\s*mg/?d[l1])?",
        ]
    )
    if m:
        out["sugar_mgdl"] = float(m.group(1))

    # HbA1c (%)
    m = _find_first(
        [
            r"hba1c\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%",
            r"a1c\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%",
        ]
    )
    if m:
        out["hba1c_pct"] = float(m.group(1))

    # Cholesterol (mg/dL)
    m = _find_first(
        [
            r"(?:total\s+)?cholesterol\s*[:\-]?\s*(\d{2,3})(?:\s*mg/?d[l1])?",
            r"tc\s*[:\-]?\s*(\d{2,3})(?:\s*mg/?d[l1])?",
        ]
    )
    if m:
        out["cholesterol_mgdl"] = float(m.group(1))

    # Blood pressure (systolic/diastolic)
    m = _find_first(
        [
            r"(?:blood\s*pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*/\s*(\d{2,3})",
            r"\b(\d{2,3})\s*/\s*(\d{2,3})\b\s*(?:mmhg)?",
        ]
    )
    if m:
        out["bp_systolic"] = float(m.group(1))
        out["bp_diastolic"] = float(m.group(2))

    return out


def _compute_analysis(payload: HealthForm, *, persist: bool = True) -> Dict[str, Any]:
    """Core analysis used by both /analyze-health and /upload-report."""
    _ensure_csv_headers()

    patient_id = payload.patient_id or str(uuid.uuid4())

    if persist:
        _upsert_patient(patient_id, payload)
        _append_metrics(patient_id, payload)

    # compute risk snapshot (rule-based)
    risk_engine = RiskEngine()
    risk_snapshot = risk_engine.compute_risk_snapshot(payload.model_dump())

    diabetes_pct = float(risk_snapshot.get("Diabetes", {}).get("scorePct", 0.0))
    heart_pct = float(risk_snapshot.get("Heart Disease", {}).get("scorePct", 0.0))
    liver_pct = float(risk_snapshot.get("Fatty Liver", {}).get("scorePct", 0.0))

    # ML probabilities
    ml = MLPredictor()
    ml_probs = ml.predict_probabilities(payload.model_dump())
    depression_pct = float(ml_probs.get("depression", 0.0)) * 100.0

    # advice (only for medium/high)
    context = payload.model_dump()
    context["bmi"] = risk_engine.compute_bmi(payload.height_cm, payload.weight_kg)
    advisor = Advisor()
    advice = advisor.get_advice(risk_snapshot=risk_snapshot, metrics_context=context)

    # trend data
    if persist:
        records = _patient_history(patient_id)
        enriched: List[Dict[str, Any]] = []
        for r in records:
            rr = dict(r)
            rr["height_cm"] = payload.height_cm
            rr["age"] = payload.age
            rr["gender"] = payload.gender
            enriched.append(rr)
        trend = compute_trend_data(enriched, risk_engine=risk_engine)
    else:
        # single-point trend for guest demo
        rr = payload.model_dump()
        rr["timestamp"] = _utc_now_iso()
        trend = compute_trend_data([rr], risk_engine=risk_engine)

    return {
        "patientId": patient_id,
        "diabetesRisk": diabetes_pct,
        "heartRisk": heart_pct,
        "liverRisk": liver_pct,
        "depressionRisk": depression_pct,
        "mlProbabilities": ml_probs,
        "trendData": trend,
        "advice": advice,
    }


def _read_patients() -> pd.DataFrame:
    _ensure_csv_headers()
    try:
        return pd.read_csv(PATIENTS_CSV)
    except Exception:
        return pd.DataFrame(columns=["patient_id", "age", "gender", "height_cm", "created_at", "updated_at"])


def _read_metrics() -> pd.DataFrame:
    _ensure_csv_headers()
    try:
        return pd.read_csv(METRICS_CSV)
    except Exception:
        return pd.DataFrame(
            columns=[
                "record_id",
                "patient_id",
                "timestamp",
                "weight_kg",
                "bp_systolic",
                "bp_diastolic",
                "sugar_mgdl",
                "hba1c_pct",
                "cholesterol_mgdl",
                "sleep_hours",
                "exercise_mins_per_week",
                "stress_level",
                "family_history",
            ]
        )


def _upsert_patient(patient_id: str, payload: HealthForm) -> None:
    df = _read_patients()
    now = _utc_now_iso()

    if (df["patient_id"].astype(str) == patient_id).any():
        df.loc[df["patient_id"].astype(str) == patient_id, ["age", "gender", "height_cm", "updated_at"]] = [
            payload.age,
            payload.gender,
            payload.height_cm,
            now,
        ]
    else:
        new_row = {
            "patient_id": patient_id,
            "age": payload.age,
            "gender": payload.gender,
            "height_cm": payload.height_cm,
            "created_at": now,
            "updated_at": now,
        }
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

    df.to_csv(PATIENTS_CSV, index=False)


def _append_metrics(patient_id: str, payload: HealthForm) -> str:
    df = _read_metrics()

    record_id = str(uuid.uuid4())
    row = {
        "record_id": record_id,
        "patient_id": patient_id,
        "timestamp": _utc_now_iso(),
        "weight_kg": payload.weight_kg,
        "bp_systolic": payload.bp_systolic,
        "bp_diastolic": payload.bp_diastolic,
        "sugar_mgdl": payload.sugar_mgdl,
        "hba1c_pct": payload.hba1c_pct,
        "cholesterol_mgdl": payload.cholesterol_mgdl,
        "sleep_hours": payload.sleep_hours,
        "exercise_mins_per_week": payload.exercise_mins_per_week,
        "stress_level": payload.stress_level,
        "family_history": payload.family_history,
    }

    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_csv(METRICS_CSV, index=False)
    return record_id


def _patient_history(patient_id: str) -> List[Dict[str, Any]]:
    df = _read_metrics()
    if df.empty:
        return []

    subset = df[df["patient_id"].astype(str) == str(patient_id)].copy()
    if subset.empty:
        return []

    subset = subset.sort_values("timestamp")
    return subset.to_dict(orient="records")


@router.post("/analyze-health")
def analyze_health(payload: HealthForm, persist: bool = True) -> Dict[str, Any]:
    return _compute_analysis(payload, persist=persist)


@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    payload_json: str = Form(..., description="JSON string of HealthForm fields"),
) -> Dict[str, Any]:
    """Upload a PDF/image report, extract key values, and run analysis.

    The client supplies baseline HealthForm fields in payload_json; extracted values override them.
    """

    try:
        raw_payload = json.loads(payload_json)
        if not isinstance(raw_payload, dict):
            raise ValueError("payload_json must be a JSON object")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload_json: {exc}") from exc

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload").suffix
    if not suffix:
        # best-effort extension based on content-type
        if file.content_type == "application/pdf":
            suffix = ".pdf"
        elif (file.content_type or "").startswith("image/"):
            suffix = ".png"
        else:
            suffix = ".bin"

    upload_id = str(uuid.uuid4())
    out_path = UPLOADS_DIR / f"{upload_id}{suffix}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    out_path.write_bytes(content)

    extracted_text = _extract_text_from_upload(out_path, file.content_type or "")
    detected = _detect_values(extracted_text)

    merged = dict(raw_payload)
    merged.update(detected)

    # Validate into HealthForm
    try:
        form = HealthForm.model_validate(merged)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid merged health payload: {exc}") from exc

    analysis = _compute_analysis(form, persist=True)

    return {
        "uploadId": upload_id,
        "fileName": file.filename,
        "contentType": file.content_type,
        "detectedValues": detected,
        "analysis": analysis,
    }


@router.get("/patient-history/{patient_id}")
def patient_history(patient_id: str) -> Dict[str, Any]:
    patients = _read_patients()
    patient_row = patients[patients["patient_id"].astype(str) == str(patient_id)]
    if patient_row.empty:
        raise HTTPException(status_code=404, detail="Patient not found")

    metrics = _patient_history(patient_id)

    # derive trends using last known height/age from patient row
    patient = patient_row.iloc[0].to_dict()
    height_cm = float(patient.get("height_cm") or 0.0)
    age = int(patient.get("age") or 0)
    gender = str(patient.get("gender") or "")

    risk_engine = RiskEngine()
    enriched = []
    for r in metrics:
        rr = dict(r)
        rr["height_cm"] = height_cm
        rr["age"] = age
        rr["gender"] = gender
        enriched.append(rr)

    trend = compute_trend_data(enriched, risk_engine=risk_engine)

    return {
        "patient": patient,
        "history": metrics,
        "trendData": trend,
    }


@router.get("/patient-latest/{patient_id}")
def patient_latest(patient_id: str) -> Dict[str, Any]:
    """Return latest known metrics + analysis without persisting a new record."""

    patients = _read_patients()
    patient_row = patients[patients["patient_id"].astype(str) == str(patient_id)]
    if patient_row.empty:
        raise HTTPException(status_code=404, detail="Patient not found")

    metrics = _patient_history(patient_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="No metrics found for patient")

    patient = patient_row.iloc[0].to_dict()
    latest = metrics[-1]

    merged = dict(latest)
    merged["patient_id"] = str(patient_id)
    merged["age"] = int(patient.get("age") or 0)
    merged["gender"] = str(patient.get("gender") or "")
    merged["height_cm"] = float(patient.get("height_cm") or 0.0)

    try:
        form = HealthForm.model_validate(merged)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stored metrics invalid: {exc}") from exc

    analysis = _compute_analysis(form, persist=False)

    # Trend data from full history
    risk_engine = RiskEngine()
    enriched = []
    for r in metrics:
        rr = dict(r)
        rr["height_cm"] = float(patient.get("height_cm") or 0.0)
        rr["age"] = int(patient.get("age") or 0)
        rr["gender"] = str(patient.get("gender") or "")
        enriched.append(rr)
    trend = compute_trend_data(enriched, risk_engine=risk_engine)

    analysis["trendData"] = trend

    return {
        "patient": patient,
        "latest": latest,
        "analysis": analysis,
    }


@router.post("/scan-document", response_model=ScanDocumentResponse)
async def scan_document_endpoint(request: ScanDocumentRequest) -> Dict[str, Any]:
    """
    Scan a medical document (PDF, CSV, or image) and extract health metrics.
    
    This endpoint:
    1. Downloads the file from Supabase Storage
    2. Parses the document based on file type
    3. Extracts health metrics using regex/OCR
    4. Normalizes values to standard units
    5. Runs AI analysis on extracted + baseline values
    6. Returns extracted values, risk scores, and advice
    """
    
    try:
        # Download file from Supabase Storage URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.file_url)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download file: HTTP {response.status_code}"
                )
            
            file_content = response.content
            
            if not file_content or len(file_content) < 100:
                raise HTTPException(
                    status_code=400,
                    detail="Downloaded file is empty or too small"
                )
        
        # Scan the document
        metrics: ExtractedMetrics = await scan_document(file_content, request.file_type)
        
        # Validate and normalize extracted values
        normalized = validate_and_normalize_metrics(metrics)
        
        # Build analysis payload by merging baseline values with extracted
        analysis_payload = {
            "patient_id": request.user_id,
            "age": request.age or 30,
            "gender": request.gender or "other",
            "height_cm": request.height_cm or 170,
            "weight_kg": request.weight_kg or 70,
            "sleep_hours": request.sleep_hours or 7,
            "exercise_mins_per_week": request.exercise_mins_per_week or 120,
            "stress_level": request.stress_level or 5,
            "family_history": request.family_history or 0,
            # Default values for required fields
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "sugar_mgdl": 100,
            "hba1c_pct": 5.5,
            "cholesterol_mgdl": 180,
        }
        
        # Override with extracted values
        if normalized.get("sugar_mgdl"):
            analysis_payload["sugar_mgdl"] = normalized["sugar_mgdl"]
        if normalized.get("hba1c_pct"):
            analysis_payload["hba1c_pct"] = normalized["hba1c_pct"]
        if normalized.get("cholesterol_mgdl"):
            analysis_payload["cholesterol_mgdl"] = normalized["cholesterol_mgdl"]
        if normalized.get("bp_systolic"):
            analysis_payload["bp_systolic"] = normalized["bp_systolic"]
        if normalized.get("bp_diastolic"):
            analysis_payload["bp_diastolic"] = normalized["bp_diastolic"]
        
        # Run analysis if we have enough extracted data
        analysis_result = None
        if len(normalized) >= 1:  # At least one value extracted
            try:
                form = HealthForm.model_validate(analysis_payload)
                analysis_result = _compute_analysis(form, persist=True)
            except Exception as e:
                logger.warning(f"Analysis failed: {e}")
                metrics.warnings.append(f"Analysis warning: {str(e)}")
        
        # Build response
        response_data = {
            "success": True,
            "extracted_values": metrics.to_dict(),
            "normalized_values": normalized,
            "confidence": metrics.confidence,
            "source_type": metrics.source_type,
            "warnings": metrics.warnings,
            "advice": [],
        }
        
        if analysis_result:
            response_data["diabetesRisk"] = analysis_result.get("diabetesRisk")
            response_data["heartRisk"] = analysis_result.get("heartRisk")
            response_data["liverRisk"] = analysis_result.get("liverRisk")
            response_data["depressionRisk"] = analysis_result.get("depressionRisk")
            response_data["advice"] = analysis_result.get("advice", [])
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document scan failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document scanning failed: {str(e)}"
        )


@router.post("/scan-document-upload")
async def scan_document_upload(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    age: int = Form(default=30),
    gender: str = Form(default="other"),
    height_cm: float = Form(default=170),
    weight_kg: float = Form(default=70),
) -> Dict[str, Any]:
    """
    Alternative endpoint: Upload file directly instead of via URL.
    Useful for testing or when Supabase Storage is not available.
    """
    
    # Determine file type from filename/content-type
    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower().lstrip(".")
    
    if suffix in ("pdf",):
        file_type = "pdf"
    elif suffix in ("csv",):
        file_type = "csv"
    elif suffix in ("png", "jpg", "jpeg"):
        file_type = suffix
    elif file.content_type:
        if "pdf" in file.content_type:
            file_type = "pdf"
        elif "csv" in file.content_type:
            file_type = "csv"
        elif file.content_type.startswith("image/"):
            file_type = "png"
        else:
            file_type = "pdf"  # Default guess
    else:
        file_type = "pdf"
    
    try:
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Scan the document
        metrics: ExtractedMetrics = await scan_document(file_content, file_type)
        
        # Validate and normalize
        normalized = validate_and_normalize_metrics(metrics)
        
        # Build analysis payload
        analysis_payload = {
            "patient_id": user_id,
            "age": age,
            "gender": gender,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "sleep_hours": 7,
            "exercise_mins_per_week": 120,
            "stress_level": 5,
            "family_history": 0,
            "bp_systolic": normalized.get("bp_systolic", 120),
            "bp_diastolic": normalized.get("bp_diastolic", 80),
            "sugar_mgdl": normalized.get("sugar_mgdl", 100),
            "hba1c_pct": normalized.get("hba1c_pct", 5.5),
            "cholesterol_mgdl": normalized.get("cholesterol_mgdl", 180),
        }
        
        # Run analysis
        analysis_result = None
        try:
            form = HealthForm.model_validate(analysis_payload)
            analysis_result = _compute_analysis(form, persist=True)
        except Exception as e:
            logger.warning(f"Analysis failed: {e}")
        
        response_data = {
            "success": True,
            "fileName": filename,
            "fileType": file_type,
            "extracted_values": metrics.to_dict(),
            "normalized_values": normalized,
            "confidence": metrics.confidence,
            "source_type": metrics.source_type,
            "warnings": metrics.warnings,
        }
        
        if analysis_result:
            response_data["diabetesRisk"] = analysis_result.get("diabetesRisk")
            response_data["heartRisk"] = analysis_result.get("heartRisk")
            response_data["liverRisk"] = analysis_result.get("liverRisk")
            response_data["depressionRisk"] = analysis_result.get("depressionRisk")
            response_data["advice"] = analysis_result.get("advice", [])
            response_data["analysis"] = analysis_result
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload scan failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document scanning failed: {str(e)}"
        )


# ============================================
# PDF Report Generation Endpoints
# ============================================

def _verify_jwt_token(authorization: str) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and extract user info.
    Returns user data from the token if valid.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    
    if not supabase:
        logger.warning("Supabase client not initialized - skipping JWT verification")
        # Return a minimal user dict for development/testing
        return {"sub": "anonymous", "email": "anonymous@test.com"}
    
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return {
            "sub": user_response.user.id,
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


def _get_analysis_by_id(analysis_id: str, user_id: str) -> Dict[str, Any]:
    """
    Fetch analysis record from Supabase by ID.
    Verifies the analysis belongs to the requesting user.
    """
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )
    
    try:
        # Query analysis_history table
        response = supabase.table("analysis_history").select("*").eq("id", analysis_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        analysis = response.data
        
        # Security check: verify user owns this analysis
        if str(analysis.get("user_id")) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied: You can only access your own reports")
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis: {str(e)}")


def _get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch user profile from Supabase."""
    if not supabase:
        return None
    
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        return response.data if response.data else None
    except Exception as e:
        logger.warning(f"Could not fetch user profile: {e}")
        return None


# ============================================
# IMPORTANT: More specific routes must come BEFORE generic path parameter routes
# /report/latest/{patient_id} MUST be before /report/{analysis_id}
# ============================================

@router.get("/report/latest/{patient_id}")
async def generate_latest_report(
    patient_id: str,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Response:
    """
    Generate a PDF report from the latest patient analysis.
    This endpoint works without Supabase by using local CSV data.
    
    Args:
        patient_id: Patient/User ID
        authorization: Bearer token from Supabase auth (optional for local dev)
    
    Returns:
        PDF file as downloadable response
    """
    
    # Try to verify JWT if provided, but allow anonymous for local dev
    user_id = patient_id
    patient_name = "Patient"
    
    if authorization:
        try:
            user_info = _verify_jwt_token(authorization)
            user_id = user_info.get("sub", patient_id)
            if user_info.get("user_metadata"):
                meta = user_info["user_metadata"]
                patient_name = meta.get("full_name") or meta.get("name") or meta.get("username") or "Patient"
        except HTTPException:
            pass  # Continue with patient_id
    
    # Try to get latest analysis from local CSV first
    try:
        # Fetch from local patient data
        patients = _read_patients()
        patient_row = patients[patients["patient_id"].astype(str) == str(patient_id)]
        
        if patient_row.empty:
            raise HTTPException(status_code=404, detail="Patient not found. Run a health analysis first.")
        
        metrics = _patient_history(patient_id)
        if not metrics:
            raise HTTPException(status_code=404, detail="No analysis data found. Run a health analysis first.")
        
        patient = patient_row.iloc[0].to_dict()
        latest = metrics[-1]
        
        # Get patient name from profile if we have Supabase
        if supabase and patient_name == "Patient":
            profile = _get_user_profile(patient_id)
            if profile:
                patient_name = profile.get("full_name") or profile.get("username") or "Patient"
        
        # Run analysis on latest data
        merged = dict(latest)
        merged["patient_id"] = str(patient_id)
        merged["age"] = int(patient.get("age") or 30)
        merged["gender"] = str(patient.get("gender") or "other")
        merged["height_cm"] = float(patient.get("height_cm") or 170)
        
        form = HealthForm.model_validate(merged)
        analysis_result = _compute_analysis(form, persist=False)
        
        # Build analysis_data dict for PDF generator
        analysis_data = {
            "id": latest.get("record_id", "local"),
            "user_id": patient_id,
            "analyzed_at": latest.get("timestamp", datetime.utcnow().isoformat()),
            "source": "local",
            
            # Input metrics
            "age": merged.get("age"),
            "gender": merged.get("gender"),
            "height_cm": merged.get("height_cm"),
            "weight_kg": latest.get("weight_kg"),
            "bp_systolic": latest.get("bp_systolic"),
            "bp_diastolic": latest.get("bp_diastolic"),
            "sugar_mgdl": latest.get("sugar_mgdl"),
            "hba1c_pct": latest.get("hba1c_pct"),
            "cholesterol_mgdl": latest.get("cholesterol_mgdl"),
            "sleep_hours": latest.get("sleep_hours"),
            "exercise_mins_per_week": latest.get("exercise_mins_per_week"),
            "stress_level": latest.get("stress_level"),
            "family_history": latest.get("family_history", 0),
            
            # Computed
            "bmi": analysis_result.get("bmi") or (
                float(latest.get("weight_kg", 70)) / ((float(merged.get("height_cm", 170)) / 100) ** 2)
            ),
            
            # Risk scores
            "diabetes_risk": analysis_result.get("diabetesRisk", 0),
            "heart_risk": analysis_result.get("heartRisk", 0),
            "liver_risk": analysis_result.get("liverRisk", 0),
            "depression_risk": analysis_result.get("depressionRisk", 0),
            "overall_risk": (
                analysis_result.get("diabetesRisk", 0) +
                analysis_result.get("heartRisk", 0) +
                analysis_result.get("liverRisk", 0) +
                analysis_result.get("depressionRisk", 0)
            ) / 4,
            
            # Full analysis
            "full_analysis": analysis_result,
        }
        
        report_date = datetime.utcnow()
        if latest.get("timestamp"):
            try:
                report_date = datetime.fromisoformat(str(latest["timestamp"]).replace("Z", "+00:00"))
            except Exception:
                pass
        
        # Generate PDF
        pdf_bytes = generate_health_report(
            analysis_data=analysis_data,
            patient_name=patient_name,
            report_date=report_date,
        )
        
        filename = generate_report_filename(patient_name, report_date)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate report from local data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/report/latest/{patient_id}/preview")
async def preview_latest_report(
    patient_id: str,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Response:
    """Same as /report/latest/{patient_id} but for inline preview."""
    response = await generate_latest_report(patient_id, authorization)
    # Change Content-Disposition to inline for preview
    response.headers["Content-Disposition"] = response.headers["Content-Disposition"].replace("attachment", "inline")
    return response


@router.get("/report/{analysis_id}")
async def generate_report(
    analysis_id: str,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Response:
    """
    Generate and download a medical-grade PDF health report.
    
    This endpoint:
    1. Verifies the user's JWT token
    2. Fetches the analysis from Supabase
    3. Verifies the user owns the analysis
    4. Generates a professional PDF report
    5. Returns the PDF for download
    
    Args:
        analysis_id: UUID of the analysis record in analysis_history table
        authorization: Bearer token from Supabase auth
    
    Returns:
        PDF file as downloadable response
    """
    
    # Verify JWT and get user info
    user_info = _verify_jwt_token(authorization or "")
    user_id = user_info.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user identity")
    
    # Fetch analysis data
    analysis_data = _get_analysis_by_id(analysis_id, user_id)
    
    # Get user profile for patient name
    profile = _get_user_profile(user_id)
    patient_name = "Patient"
    
    if profile:
        patient_name = profile.get("full_name") or profile.get("username") or "Patient"
    elif user_info.get("user_metadata"):
        meta = user_info["user_metadata"]
        patient_name = meta.get("full_name") or meta.get("name") or meta.get("username") or "Patient"
    
    # Parse report date from analysis
    report_date = datetime.utcnow()
    if analysis_data.get("analyzed_at"):
        try:
            analyzed_at = analysis_data["analyzed_at"]
            if isinstance(analyzed_at, str):
                # Handle ISO format with timezone
                report_date = datetime.fromisoformat(analyzed_at.replace("Z", "+00:00"))
        except Exception:
            pass
    
    # Generate PDF
    try:
        pdf_bytes = generate_health_report(
            analysis_data=analysis_data,
            patient_name=patient_name,
            report_date=report_date,
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
    
    # Generate filename
    filename = generate_report_filename(patient_name, report_date)
    
    # Return PDF as downloadable file
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )


@router.get("/report/{analysis_id}/preview")
async def preview_report(
    analysis_id: str,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Response:
    """
    Generate and return a PDF report for inline preview (not download).
    Same as /report/{analysis_id} but opens in browser instead of downloading.
    """
    
    # Verify JWT and get user info
    user_info = _verify_jwt_token(authorization or "")
    user_id = user_info.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user identity")
    
    # Fetch analysis data
    analysis_data = _get_analysis_by_id(analysis_id, user_id)
    
    # Get user profile for patient name
    profile = _get_user_profile(user_id)
    patient_name = "Patient"
    
    if profile:
        patient_name = profile.get("full_name") or profile.get("username") or "Patient"
    elif user_info.get("user_metadata"):
        meta = user_info["user_metadata"]
        patient_name = meta.get("full_name") or meta.get("name") or meta.get("username") or "Patient"
    
    # Parse report date from analysis
    report_date = datetime.utcnow()
    if analysis_data.get("analyzed_at"):
        try:
            analyzed_at = analysis_data["analyzed_at"]
            if isinstance(analyzed_at, str):
                report_date = datetime.fromisoformat(analyzed_at.replace("Z", "+00:00"))
        except Exception:
            pass
    
    # Generate PDF
    try:
        pdf_bytes = generate_health_report(
            analysis_data=analysis_data,
            patient_name=patient_name,
            report_date=report_date,
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
    
    filename = generate_report_filename(patient_name, report_date)
    
    # Return PDF for inline display
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )


@router.get("/user/analyses")
async def get_user_analyses(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Get list of user's analysis history for report generation.
    Returns analysis IDs, dates, and risk summaries.
    """
    
    # Verify JWT and get user info
    user_info = _verify_jwt_token(authorization or "")
    user_id = user_info.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user identity")
    
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase client not initialized"
        )
    
    try:
        response = supabase.table("analysis_history").select(
            "id, analyzed_at, diabetes_risk, heart_risk, liver_risk, depression_risk, overall_risk, source"
        ).eq("user_id", user_id).order("analyzed_at", desc=True).limit(limit).execute()
        
        analyses = response.data if response.data else []
        
        return {
            "success": True,
            "count": len(analyses),
            "analyses": analyses,
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch user analyses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch analyses: {str(e)}")

