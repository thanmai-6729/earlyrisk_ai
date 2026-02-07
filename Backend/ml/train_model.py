from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DEFAULT_TRAINING_CSV = DATA_DIR / "sample_health_data.csv"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "disease_model.pkl"


FEATURES = [
    "age",
    "bmi",
    "sugar_mgdl",
    "bp_systolic",
    "hba1c_pct",
    "sleep_hours",
    "family_history",
]

TARGETS = ["diabetes", "heart_disease", "fatty_liver", "depression"]


def _prepare_training_frame(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    # Create BMI if not present
    if "bmi" not in df.columns:
        height_cm = pd.to_numeric(df.get("height_cm"), errors="coerce")
        weight_kg = pd.to_numeric(df.get("weight_kg"), errors="coerce")
        bmi = weight_kg / ((height_cm / 100.0) ** 2)
        df["bmi"] = bmi

    return df


def train_model(training_csv: Path) -> Tuple[Pipeline, List[str]]:
    df = _prepare_training_frame(training_csv)

    missing_features = [c for c in FEATURES if c not in df.columns]
    missing_targets = [c for c in TARGETS if c not in df.columns]
    if missing_features:
        raise ValueError(f"Training CSV missing features: {missing_features}")
    if missing_targets:
        raise ValueError(f"Training CSV missing targets: {missing_targets}")

    X = df[FEATURES].copy()
    y = df[TARGETS].astype(int).copy()

    numeric_features = FEATURES

    pre = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_features,
            )
        ],
        remainder="drop",
    )

    base = LogisticRegression(max_iter=2000)
    clf = MultiOutputClassifier(base)

    pipe = Pipeline(steps=[("pre", pre), ("clf", clf)])
    pipe.fit(X, y)

    # store targets for inference
    pipe.targets_ = TARGETS

    return pipe, TARGETS


def train_and_save(training_csv: Path | None = None, model_path: Path | None = None) -> Path:
    training_csv = training_csv or DEFAULT_TRAINING_CSV
    model_path = model_path or DEFAULT_MODEL_PATH

    model, _ = train_model(training_csv)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    return model_path


if __name__ == "__main__":
    out = train_and_save()
    print(f"Saved model to: {out}")
