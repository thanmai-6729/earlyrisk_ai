from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
ML_DIR = BASE_DIR / "ml"
DEFAULT_MODEL_PATH = ML_DIR / "disease_model.pkl"
DEFAULT_TRAINING_DATA = DATA_DIR / "sample_health_data.csv"


class MLPredictor:
    def __init__(
        self,
        model_path: Path | None = None,
        training_csv: Path | None = None,
    ):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.training_csv = training_csv or DEFAULT_TRAINING_DATA
        self._model: Any | None = None

    def _ensure_model(self) -> Any:
        if self._model is not None:
            return self._model

        if self.model_path.exists() and self.model_path.stat().st_size > 0:
            self._model = joblib.load(self.model_path)
            return self._model

        # Lazy-train for demo friendliness
        try:
            from ml.train_model import train_and_save
        except ImportError:
            from Backend.ml.train_model import train_and_save

        train_and_save(training_csv=self.training_csv, model_path=self.model_path)
        self._model = joblib.load(self.model_path)
        return self._model

    @staticmethod
    def _to_features(payload: Dict[str, Any]) -> pd.DataFrame:
        age = float(payload.get("age") or 0)
        height_cm = float(payload.get("height_cm") or 0)
        weight_kg = float(payload.get("weight_kg") or 0)
        bmi = 0.0
        if height_cm > 0:
            bmi = weight_kg / ((height_cm / 100.0) ** 2)

        row = {
            "age": age,
            "bmi": bmi,
            "sugar_mgdl": float(payload.get("sugar_mgdl") or 0),
            "bp_systolic": float(payload.get("bp_systolic") or 0),
            "hba1c_pct": float(payload.get("hba1c_pct") or 0),
            "sleep_hours": float(payload.get("sleep_hours") or 0),
            "family_history": int(payload.get("family_history") or 0),
        }
        return pd.DataFrame([row])

    def predict_probabilities(self, payload: Dict[str, Any]) -> Dict[str, float]:
        model = self._ensure_model()
        X = self._to_features(payload)

        # MultiOutputClassifier returns list of estimators and predict_proba per target.
        try:
            probs = model.predict_proba(X)
        except Exception:
            # Fallback for single-target model
            p = float(model.predict_proba(X)[:, 1][0])
            return {"disease": p}

        targets = getattr(model, "targets_", None)
        if not targets:
            targets = ["diabetes", "heart_disease", "fatty_liver", "depression"]

        out: Dict[str, float] = {}
        for name, p in zip(targets, probs, strict=False):
            # p is (n_samples, 2)
            out[str(name)] = float(p[:, 1][0])
        return out
