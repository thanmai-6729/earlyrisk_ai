from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import pandas as pd


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_RULES_PATH = DATA_DIR / "health_rules.csv"


class ConditionError(ValueError):
    pass


_ALLOWED_COMPARE_OPS = (ast.Gt, ast.GtE, ast.Lt, ast.LtE, ast.Eq, ast.NotEq)


def _safe_eval_condition(condition: str, context: Dict[str, Any]) -> bool:
    """Safely evaluate simple boolean conditions against a context.

    Supports:
    - comparisons: <, <=, >, >=, ==, !=
    - boolean ops: and, or
    - parentheses
    - numeric literals and 0/1 booleans

    Example: "sugar_mgdl >= 126 and bmi >= 30"
    """

    try:
        expr = ast.parse(condition, mode="eval")
    except SyntaxError as exc:
        raise ConditionError(f"Invalid condition syntax: {condition}") from exc

    def eval_node(node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return eval_node(node.body)

        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(bool(eval_node(v)) for v in node.values)
            if isinstance(node.op, ast.Or):
                return any(bool(eval_node(v)) for v in node.values)
            raise ConditionError("Unsupported boolean operator")

        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            return not bool(eval_node(node.operand))

        if isinstance(node, ast.Compare):
            left_val = eval_node(node.left)
            result = True
            for op, comp in zip(node.ops, node.comparators, strict=False):
                right_val = eval_node(comp)
                if isinstance(op, ast.Gt):
                    ok = left_val > right_val
                elif isinstance(op, ast.GtE):
                    ok = left_val >= right_val
                elif isinstance(op, ast.Lt):
                    ok = left_val < right_val
                elif isinstance(op, ast.LtE):
                    ok = left_val <= right_val
                elif isinstance(op, ast.Eq):
                    ok = left_val == right_val
                elif isinstance(op, ast.NotEq):
                    ok = left_val != right_val
                else:
                    raise ConditionError("Unsupported comparison operator")
                result = result and ok
                left_val = right_val
            return result

        if isinstance(node, ast.Name):
            if node.id not in context:
                raise ConditionError(f"Unknown field in condition: {node.id}")
            return context[node.id]

        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float, bool, str)):
                return node.value
            raise ConditionError("Unsupported constant")

        # Allow parentheses via AST structure; disallow function calls, subscripts, attrs, etc.
        raise ConditionError(f"Unsupported expression in condition: {ast.dump(node)}")

    value = eval_node(expr)
    return bool(value)


@dataclass(frozen=True)
class RiskResult:
    disease: str
    score: float  # 0..100
    matched_rules: List[Dict[str, Any]]


class RiskEngine:
    def __init__(self, rules_path: Path | None = None):
        self.rules_path = rules_path or DEFAULT_RULES_PATH
        self._rules_df: pd.DataFrame | None = None

    def load_rules(self) -> pd.DataFrame:
        df = pd.read_csv(self.rules_path)
        required = {"disease", "signal", "condition", "weight"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"health_rules.csv missing columns: {sorted(missing)}")
        df["weight"] = pd.to_numeric(df["weight"], errors="coerce").fillna(0.0)
        self._rules_df = df
        return df

    def _ensure_rules(self) -> pd.DataFrame:
        if self._rules_df is None:
            return self.load_rules()
        return self._rules_df

    @staticmethod
    def compute_bmi(height_cm: float, weight_kg: float) -> float:
        if height_cm <= 0:
            return 0.0
        h_m = height_cm / 100.0
        return float(weight_kg) / (h_m * h_m)

    def compute_risks(self, metrics: Dict[str, Any]) -> Dict[str, RiskResult]:
        rules = self._ensure_rules()

        # Build evaluation context
        height_cm = float(metrics.get("height_cm") or 0)
        weight_kg = float(metrics.get("weight_kg") or 0)
        bmi = self.compute_bmi(height_cm=height_cm, weight_kg=weight_kg)

        context = dict(metrics)
        context["bmi"] = bmi

        results: Dict[str, RiskResult] = {}

        for disease, group in rules.groupby("disease"):
            total_weight = float(group["weight"].sum()) or 1.0
            matched: List[Dict[str, Any]] = []
            earned = 0.0

            for _, row in group.iterrows():
                cond = str(row["condition"])
                weight = float(row["weight"])
                try:
                    ok = _safe_eval_condition(cond, context)
                except ConditionError:
                    ok = False

                if ok:
                    earned += weight
                    matched.append(
                        {
                            "signal": str(row.get("signal", "")),
                            "condition": cond,
                            "weight": weight,
                        }
                    )

            score_pct = max(0.0, min(100.0, (earned / total_weight) * 100.0))
            results[disease] = RiskResult(disease=disease, score=score_pct, matched_rules=matched)

        return results

    @staticmethod
    def bucket_risk(score_pct: float) -> str:
        if score_pct < 35:
            return "low"
        if score_pct < 70:
            return "medium"
        return "high"

    def compute_risk_snapshot(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        results = self.compute_risks(metrics)
        out: Dict[str, Any] = {}
        for disease, rr in results.items():
            out[disease] = {
                "scorePct": rr.score,
                "score": rr.score / 100.0,
                "level": self.bucket_risk(rr.score),
                "matchedSignals": [m["signal"] for m in rr.matched_rules],
            }
        return out


def compute_trend_data(
    records: Iterable[Dict[str, Any]],
    risk_engine: RiskEngine,
) -> Dict[str, Any]:
    """Convert historical metric records into chart-friendly trend arrays."""

    timestamps: List[str] = []
    sugar: List[float] = []
    bp_sys: List[float] = []
    bp_dia: List[float] = []
    hba1c: List[float] = []
    cholesterol: List[float] = []
    bmi: List[float] = []

    disease_series: Dict[str, List[float]] = {}

    for rec in records:
        ts = str(rec.get("timestamp", ""))
        timestamps.append(ts)
        sugar.append(float(rec.get("sugar_mgdl") or 0.0))
        bp_sys.append(float(rec.get("bp_systolic") or 0.0))
        bp_dia.append(float(rec.get("bp_diastolic") or 0.0))
        hba1c.append(float(rec.get("hba1c_pct") or 0.0))
        cholesterol.append(float(rec.get("cholesterol_mgdl") or 0.0))

        height_cm = float(rec.get("height_cm") or 0.0)
        weight_kg = float(rec.get("weight_kg") or 0.0)
        bmi.append(risk_engine.compute_bmi(height_cm, weight_kg))

        risks = risk_engine.compute_risks(rec)
        for disease, rr in risks.items():
            disease_series.setdefault(disease, []).append(rr.score / 100.0)

    # Keep a stable set of disease keys
    disease_series = {k: disease_series.get(k, []) for k in sorted(disease_series.keys())}

    return {
        "timestamps": timestamps,
        "metrics": {
            "sugar": sugar,
            "bpSystolic": bp_sys,
            "bpDiastolic": bp_dia,
            "hba1c": hba1c,
            "cholesterol": cholesterol,
            "bmi": bmi,
        },
        "riskEvolution": disease_series,
    }
