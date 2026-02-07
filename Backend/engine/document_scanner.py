"""
Document Scanner Module
Extracts health metrics from PDF, CSV, and image files
"""

import re
import io
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

import pandas as pd

# PDF parsing
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError as e:
    HAS_PDFPLUMBER = False
    print(f"pdfplumber not available: {e}")

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError as e:
    HAS_PYMUPDF = False
    print(f"PyMuPDF not available: {e}")

# Image parsing
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    Image = None  # type: ignore
    PIL_AVAILABLE = False

try:
    import pytesseract
    import cv2
    import numpy as np
    HAS_OCR = PIL_AVAILABLE and True
except ImportError:
    HAS_OCR = False

logger = logging.getLogger(__name__)


@dataclass
class ExtractedMetrics:
    """Container for extracted health metrics"""
    blood_sugar: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol_total: Optional[float] = None
    cholesterol_hdl: Optional[float] = None
    cholesterol_ldl: Optional[float] = None
    triglycerides: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    hemoglobin: Optional[float] = None
    creatinine: Optional[float] = None
    uric_acid: Optional[float] = None
    bilirubin: Optional[float] = None
    sgpt_alt: Optional[float] = None
    sgot_ast: Optional[float] = None
    tsh: Optional[float] = None
    vitamin_d: Optional[float] = None
    vitamin_b12: Optional[float] = None
    raw_text: str = ""
    confidence: float = 0.0
    source_type: str = ""
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values"""
        result = {}
        for key, value in self.__dict__.items():
            if value is not None and key not in ('raw_text', 'warnings'):
                result[key] = value
        result['warnings'] = self.warnings
        return result

    def to_analysis_payload(self) -> Dict[str, Any]:
        """Convert to payload format for /analyze-health endpoint"""
        payload = {}
        
        # Map extracted values to analysis payload fields
        if self.blood_sugar is not None:
            payload['sugar_mgdl'] = self.blood_sugar
        if self.hba1c is not None:
            payload['hba1c_pct'] = self.hba1c
        if self.cholesterol_total is not None:
            payload['cholesterol_mgdl'] = self.cholesterol_total
        if self.bp_systolic is not None:
            payload['bp_systolic'] = self.bp_systolic
        if self.bp_diastolic is not None:
            payload['bp_diastolic'] = self.bp_diastolic
            
        return payload


class HealthMetricPatterns:
    """Regex patterns for extracting health metrics from text"""
    
    # Blood Sugar patterns
    BLOOD_SUGAR = [
        r'(?:fasting\s*)?(?:blood\s*)?(?:sugar|glucose)[\s:]+(\d+(?:\.\d+)?)\s*(?:mg/?dl)?',
        r'(?:FBS|FBG|RBS|PPBS|glucose)[\s:]+(\d+(?:\.\d+)?)',
        r'blood\s*glucose[\s:]+(\d+(?:\.\d+)?)',
        r'glucose[\s,:\-]+(\d{2,3}(?:\.\d+)?)\s*(?:mg|mg/dl)?',
    ]
    
    # HbA1c patterns
    HBA1C = [
        r'(?:hba1c|hb\s*a1c|glycated\s*h(?:ae)?moglobin|a1c)[\s:]+(\d+(?:\.\d+)?)\s*%?',
        r'(?:hba1c|a1c)[\s:\-]+(\d+(?:\.\d+)?)',
        r'glycosylated\s*h(?:ae)?moglobin[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    # Cholesterol patterns
    CHOLESTEROL_TOTAL = [
        r'(?:total\s*)?cholesterol[\s:]+(\d+(?:\.\d+)?)\s*(?:mg/?dl)?',
        r'(?:TC|T\.?\s*Chol)[\s:]+(\d+(?:\.\d+)?)',
        r'serum\s*cholesterol[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    CHOLESTEROL_HDL = [
        r'(?:hdl|hdl[\s\-]?c(?:holesterol)?)[\s:]+(\d+(?:\.\d+)?)',
        r'high\s*density\s*lipoprotein[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    CHOLESTEROL_LDL = [
        r'(?:ldl|ldl[\s\-]?c(?:holesterol)?)[\s:]+(\d+(?:\.\d+)?)',
        r'low\s*density\s*lipoprotein[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    TRIGLYCERIDES = [
        r'(?:triglycerides?|tg|trigs?)[\s:]+(\d+(?:\.\d+)?)',
        r'tri[\s\-]?glycerides?[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    # Blood Pressure patterns
    BP = [
        r'(?:bp|blood\s*pressure)[\s:]+(\d{2,3})\s*/\s*(\d{2,3})',
        r'(\d{2,3})\s*/\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)',
        r'systolic[\s:]+(\d{2,3}).*?diastolic[\s:]+(\d{2,3})',
    ]
    
    BP_SYSTOLIC = [
        r'systolic[\s:]+(\d{2,3})',
        r'sys[\s:]+(\d{2,3})',
    ]
    
    BP_DIASTOLIC = [
        r'diastolic[\s:]+(\d{2,3})',
        r'dia[\s:]+(\d{2,3})',
    ]
    
    # Hemoglobin
    HEMOGLOBIN = [
        r'(?:h(?:ae)?moglobin|hgb|hb)[\s:]+(\d+(?:\.\d+)?)\s*(?:g/?dl|gm/?dl)?',
        r'(?:hb|hgb)[\s:\-]+(\d+(?:\.\d+)?)',
    ]
    
    # Kidney function
    CREATININE = [
        r'(?:creatinine|creat)[\s:]+(\d+(?:\.\d+)?)\s*(?:mg/?dl)?',
        r's\.?\s*creatinine[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    URIC_ACID = [
        r'uric\s*acid[\s:]+(\d+(?:\.\d+)?)',
        r'(?:ua|urate)[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    # Liver function
    BILIRUBIN = [
        r'(?:total\s*)?bilirubin[\s:]+(\d+(?:\.\d+)?)',
        r'(?:t\.?\s*bil|tbil)[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    SGPT_ALT = [
        r'(?:sgpt|alt|alanine\s*(?:amino)?transferase)[\s:]+(\d+(?:\.\d+)?)',
        r'(?:sgpt|alt)[\s:\-]+(\d+(?:\.\d+)?)',
    ]
    
    SGOT_AST = [
        r'(?:sgot|ast|aspartate\s*(?:amino)?transferase)[\s:]+(\d+(?:\.\d+)?)',
        r'(?:sgot|ast)[\s:\-]+(\d+(?:\.\d+)?)',
    ]
    
    # Thyroid
    TSH = [
        r'(?:tsh|thyroid\s*stimulating\s*hormone)[\s:]+(\d+(?:\.\d+)?)',
        r'tsh[\s:\-]+(\d+(?:\.\d+)?)',
    ]
    
    # Vitamins
    VITAMIN_D = [
        r'(?:vitamin\s*d|vit\.?\s*d|25[\s\-]?oh[\s\-]?d)[\s:]+(\d+(?:\.\d+)?)',
        r'(?:vit\s*d3?|cholecalciferol)[\s:]+(\d+(?:\.\d+)?)',
    ]
    
    VITAMIN_B12 = [
        r'(?:vitamin\s*b12|vit\.?\s*b12|cobalamin)[\s:]+(\d+(?:\.\d+)?)',
        r'b12[\s:]+(\d+(?:\.\d+)?)',
    ]


def extract_value(text: str, patterns: List[str]) -> Optional[float]:
    """Extract a numeric value using multiple regex patterns"""
    text_lower = text.lower()
    
    for pattern in patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
        if matches:
            try:
                # Handle tuple matches (for BP patterns)
                if isinstance(matches[0], tuple):
                    return float(matches[0][0])
                return float(matches[0])
            except (ValueError, IndexError):
                continue
    return None


def extract_bp(text: str) -> tuple[Optional[float], Optional[float]]:
    """Extract blood pressure (systolic/diastolic) from text"""
    text_lower = text.lower()
    
    # Try combined BP patterns first
    for pattern in HealthMetricPatterns.BP:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            try:
                systolic = float(matches[0][0])
                diastolic = float(matches[0][1])
                # Validate reasonable BP values
                if 60 <= systolic <= 250 and 40 <= diastolic <= 150:
                    return systolic, diastolic
            except (ValueError, IndexError):
                continue
    
    # Try separate patterns
    systolic = extract_value(text, HealthMetricPatterns.BP_SYSTOLIC)
    diastolic = extract_value(text, HealthMetricPatterns.BP_DIASTOLIC)
    
    return systolic, diastolic


def extract_metrics_from_text(text: str) -> ExtractedMetrics:
    """Extract all health metrics from text content"""
    metrics = ExtractedMetrics()
    metrics.raw_text = text[:5000]  # Store first 5000 chars for reference
    
    if not text or len(text.strip()) < 10:
        metrics.warnings.append("Text content too short or empty")
        return metrics
    
    # Extract each metric
    metrics.blood_sugar = extract_value(text, HealthMetricPatterns.BLOOD_SUGAR)
    metrics.hba1c = extract_value(text, HealthMetricPatterns.HBA1C)
    metrics.cholesterol_total = extract_value(text, HealthMetricPatterns.CHOLESTEROL_TOTAL)
    metrics.cholesterol_hdl = extract_value(text, HealthMetricPatterns.CHOLESTEROL_HDL)
    metrics.cholesterol_ldl = extract_value(text, HealthMetricPatterns.CHOLESTEROL_LDL)
    metrics.triglycerides = extract_value(text, HealthMetricPatterns.TRIGLYCERIDES)
    
    # Blood pressure
    systolic, diastolic = extract_bp(text)
    metrics.bp_systolic = systolic
    metrics.bp_diastolic = diastolic
    
    # Other metrics
    metrics.hemoglobin = extract_value(text, HealthMetricPatterns.HEMOGLOBIN)
    metrics.creatinine = extract_value(text, HealthMetricPatterns.CREATININE)
    metrics.uric_acid = extract_value(text, HealthMetricPatterns.URIC_ACID)
    metrics.bilirubin = extract_value(text, HealthMetricPatterns.BILIRUBIN)
    metrics.sgpt_alt = extract_value(text, HealthMetricPatterns.SGPT_ALT)
    metrics.sgot_ast = extract_value(text, HealthMetricPatterns.SGOT_AST)
    metrics.tsh = extract_value(text, HealthMetricPatterns.TSH)
    metrics.vitamin_d = extract_value(text, HealthMetricPatterns.VITAMIN_D)
    metrics.vitamin_b12 = extract_value(text, HealthMetricPatterns.VITAMIN_B12)
    
    # Calculate confidence based on how many values were extracted
    extracted_count = sum(1 for v in [
        metrics.blood_sugar, metrics.hba1c, metrics.cholesterol_total,
        metrics.bp_systolic, metrics.hemoglobin
    ] if v is not None)
    metrics.confidence = min(extracted_count / 5.0, 1.0)
    
    # Add warnings for suspicious values
    if metrics.blood_sugar and (metrics.blood_sugar < 20 or metrics.blood_sugar > 600):
        metrics.warnings.append(f"Blood sugar value {metrics.blood_sugar} seems unusual")
    if metrics.hba1c and (metrics.hba1c < 3 or metrics.hba1c > 20):
        metrics.warnings.append(f"HbA1c value {metrics.hba1c} seems unusual")
    if metrics.cholesterol_total and (metrics.cholesterol_total < 50 or metrics.cholesterol_total > 500):
        metrics.warnings.append(f"Cholesterol value {metrics.cholesterol_total} seems unusual")
    
    return metrics


def parse_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    text_parts = []
    errors = []
    
    logger.info(f"parse_pdf called. HAS_PDFPLUMBER={HAS_PDFPLUMBER}, HAS_PYMUPDF={HAS_PYMUPDF}")
    
    if not HAS_PDFPLUMBER and not HAS_PYMUPDF:
        raise ValueError("No PDF parsing libraries installed. Install pdfplumber or PyMuPDF.")
    
    # Try pdfplumber first (better for structured tables)
    if HAS_PDFPLUMBER:
        try:
            logger.info("Attempting pdfplumber...")
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text_parts.append(page_text)
                    
                    # Also try to extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                text_parts.append(" ".join(str(cell) for cell in row if cell))
            
            combined_text = "\n".join(text_parts).strip()
            if combined_text:
                logger.info(f"pdfplumber extracted {len(combined_text)} characters")
                return combined_text
            else:
                errors.append("pdfplumber: No text found in PDF")
        except Exception as e:
            errors.append(f"pdfplumber: {str(e)}")
            logger.warning(f"pdfplumber failed: {e}")
    
    # Fallback to PyMuPDF
    text_parts = []  # Reset for PyMuPDF
    if HAS_PYMUPDF:
        try:
            logger.info("Attempting PyMuPDF...")
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()
            
            combined_text = "\n".join(text_parts).strip()
            if combined_text:
                logger.info(f"PyMuPDF extracted {len(combined_text)} characters")
                return combined_text
            else:
                errors.append("PyMuPDF: No text found in PDF")
        except Exception as e:
            errors.append(f"PyMuPDF: {str(e)}")
            logger.warning(f"PyMuPDF failed: {e}")
    
    # If we get here, both parsers failed or returned empty text
    error_detail = "; ".join(errors) if errors else "Unknown error"
    raise ValueError(f"PDF parsing failed: {error_detail}")


def parse_csv(file_content: bytes) -> ExtractedMetrics:
    """Parse CSV file and extract health metrics"""
    metrics = ExtractedMetrics()
    metrics.source_type = "csv"
    
    try:
        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Could not decode CSV with any encoding")
        
        # Normalize column names
        df.columns = df.columns.str.lower().str.strip().str.replace(r'[^\w]', '_', regex=True)
        
        # Column name mappings
        column_mappings = {
            'blood_sugar': ['sugar', 'blood_sugar', 'glucose', 'fbs', 'fasting_sugar', 'sugar_mgdl', 'blood_glucose'],
            'hba1c': ['hba1c', 'a1c', 'glycated_hemoglobin', 'hba1c_pct', 'hemoglobin_a1c'],
            'cholesterol_total': ['cholesterol', 'total_cholesterol', 'chol', 'tc', 'cholesterol_mgdl'],
            'cholesterol_hdl': ['hdl', 'hdl_cholesterol', 'hdl_c'],
            'cholesterol_ldl': ['ldl', 'ldl_cholesterol', 'ldl_c'],
            'triglycerides': ['triglycerides', 'tg', 'trigs'],
            'bp_systolic': ['systolic', 'bp_systolic', 'sys', 'sbp'],
            'bp_diastolic': ['diastolic', 'bp_diastolic', 'dia', 'dbp'],
            'hemoglobin': ['hemoglobin', 'hb', 'hgb'],
            'creatinine': ['creatinine', 'creat'],
            'sgpt_alt': ['sgpt', 'alt', 'sgpt_alt'],
            'sgot_ast': ['sgot', 'ast', 'sgot_ast'],
        }
        
        # Extract values from CSV
        for metric_name, possible_columns in column_mappings.items():
            for col in possible_columns:
                if col in df.columns:
                    values = df[col].dropna()
                    if len(values) > 0:
                        # Take the most recent (last) value
                        value = values.iloc[-1]
                        try:
                            setattr(metrics, metric_name, float(value))
                        except (ValueError, TypeError):
                            pass
                    break
        
        # Calculate confidence
        extracted_count = sum(1 for v in [
            metrics.blood_sugar, metrics.hba1c, metrics.cholesterol_total,
            metrics.bp_systolic, metrics.hemoglobin
        ] if v is not None)
        metrics.confidence = min(extracted_count / 5.0, 1.0)
        
        # Store some raw data
        metrics.raw_text = df.head(10).to_string()
        
    except Exception as e:
        logger.error(f"CSV parsing failed: {e}")
        metrics.warnings.append(f"CSV parsing error: {str(e)}")
    
    return metrics


def preprocess_image(image_bytes: bytes) -> "Image.Image":
    """Preprocess image for better OCR results"""
    if not HAS_OCR:
        raise ValueError("OCR libraries not available")
    
    # Read image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Could not decode image")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding for better text detection
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
    
    # Scale up if image is small
    height, width = denoised.shape
    if width < 1000:
        scale = 1000 / width
        denoised = cv2.resize(denoised, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Convert back to PIL Image
    return Image.fromarray(denoised)


def parse_image(file_content: bytes) -> str:
    """Extract text from image using OCR"""
    if not HAS_OCR:
        raise ValueError("OCR libraries (pytesseract, opencv-python, Pillow) not available")
    
    try:
        # Preprocess image
        processed_img = preprocess_image(file_content)
        
        # Run OCR with optimized config
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./%:- '
        text = pytesseract.image_to_string(processed_img, config=custom_config)
        
        if not text.strip():
            # Try without preprocessing as fallback
            raw_img = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(raw_img)
        
        return text
        
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise ValueError(f"OCR processing failed: {str(e)}")


async def scan_document(file_content: bytes, file_type: str) -> ExtractedMetrics:
    """
    Main entry point for document scanning
    
    Args:
        file_content: Raw bytes of the file
        file_type: One of 'pdf', 'csv', 'png', 'jpg', 'jpeg'
    
    Returns:
        ExtractedMetrics object with extracted health values
    """
    file_type = file_type.lower().strip()
    
    if file_type == 'csv':
        # CSV is parsed directly into metrics
        metrics = parse_csv(file_content)
        metrics.source_type = 'csv'
        return metrics
    
    elif file_type == 'pdf':
        # Extract text from PDF then parse
        text = parse_pdf(file_content)
        metrics = extract_metrics_from_text(text)
        metrics.source_type = 'pdf'
        return metrics
    
    elif file_type in ('png', 'jpg', 'jpeg', 'image'):
        # OCR the image then parse
        text = parse_image(file_content)
        metrics = extract_metrics_from_text(text)
        metrics.source_type = 'image'
        return metrics
    
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def validate_and_normalize_metrics(metrics: ExtractedMetrics) -> Dict[str, Any]:
    """
    Validate extracted metrics and normalize to standard units
    
    Returns a clean dictionary ready for the analysis endpoint
    """
    normalized = {}
    
    # Blood sugar (mg/dL) - typical range 50-400
    if metrics.blood_sugar is not None:
        val = metrics.blood_sugar
        # Check if might be in mmol/L and convert
        if val < 30:
            val = val * 18  # Convert mmol/L to mg/dL
        if 30 <= val <= 600:
            normalized['sugar_mgdl'] = round(val, 1)
    
    # HbA1c (%) - typical range 4-15
    if metrics.hba1c is not None:
        val = metrics.hba1c
        if 3 <= val <= 20:
            normalized['hba1c_pct'] = round(val, 1)
    
    # Total Cholesterol (mg/dL) - typical range 100-400
    if metrics.cholesterol_total is not None:
        val = metrics.cholesterol_total
        # Check if might be in mmol/L and convert
        if val < 15:
            val = val * 38.67  # Convert mmol/L to mg/dL
        if 50 <= val <= 500:
            normalized['cholesterol_mgdl'] = round(val, 1)
    
    # Blood Pressure
    if metrics.bp_systolic is not None and 60 <= metrics.bp_systolic <= 250:
        normalized['bp_systolic'] = int(metrics.bp_systolic)
    if metrics.bp_diastolic is not None and 40 <= metrics.bp_diastolic <= 150:
        normalized['bp_diastolic'] = int(metrics.bp_diastolic)
    
    # Additional metrics (for extended analysis)
    if metrics.cholesterol_hdl is not None and 10 <= metrics.cholesterol_hdl <= 150:
        normalized['hdl_mgdl'] = round(metrics.cholesterol_hdl, 1)
    if metrics.cholesterol_ldl is not None and 20 <= metrics.cholesterol_ldl <= 300:
        normalized['ldl_mgdl'] = round(metrics.cholesterol_ldl, 1)
    if metrics.triglycerides is not None and 20 <= metrics.triglycerides <= 1000:
        normalized['triglycerides_mgdl'] = round(metrics.triglycerides, 1)
    if metrics.hemoglobin is not None and 5 <= metrics.hemoglobin <= 25:
        normalized['hemoglobin_gdl'] = round(metrics.hemoglobin, 1)
    if metrics.sgpt_alt is not None and 0 <= metrics.sgpt_alt <= 500:
        normalized['sgpt_alt'] = round(metrics.sgpt_alt, 1)
    if metrics.sgot_ast is not None and 0 <= metrics.sgot_ast <= 500:
        normalized['sgot_ast'] = round(metrics.sgot_ast, 1)
    if metrics.creatinine is not None and 0 <= metrics.creatinine <= 20:
        normalized['creatinine_mgdl'] = round(metrics.creatinine, 2)
    
    return normalized
