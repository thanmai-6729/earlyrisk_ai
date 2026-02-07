from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from .risk_engine import ConditionError, _safe_eval_condition


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_ADVICE_PATH = DATA_DIR / "advice_rules.csv"


class Advisor:
    def __init__(self, advice_path: Path | None = None):
        self.advice_path = advice_path or DEFAULT_ADVICE_PATH
        self._df: pd.DataFrame | None = None

    def _load(self) -> pd.DataFrame:
        df = pd.read_csv(self.advice_path)
        required = {"disease", "condition", "advice"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"advice_rules.csv missing columns: {sorted(missing)}")
        self._df = df
        return df

    def _ensure(self) -> pd.DataFrame:
        if self._df is None:
            return self._load()
        return self._df

    def get_advice(
        self,
        risk_snapshot: Dict[str, Any],
        metrics_context: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Return personalized advice when risk is medium/high."""
        df = self._ensure()
        out: List[Dict[str, Any]] = []

        for disease, payload in risk_snapshot.items():
            level = str(payload.get("level", "low"))
            if level not in {"medium", "high"}:
                continue

            disease_df = df[df["disease"].astype(str) == str(disease)]
            for _, row in disease_df.iterrows():
                condition = str(row.get("condition", ""))
                advice = str(row.get("advice", ""))

                try:
                    ok = _safe_eval_condition(condition, metrics_context)
                except ConditionError:
                    ok = False

                if ok:
                    out.append({"disease": disease, "advice": advice})

        # Deduplicate while preserving order
        seen = set()
        uniq: List[Dict[str, Any]] = []
        for item in out:
            key = (item["disease"], item["advice"])
            if key in seen:
                continue
            seen.add(key)
            uniq.append(item)

        return uniq
