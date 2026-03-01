import numpy as np
import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog
from app.models.prediction import Prediction
from app.models.insight import Insight

logger = logging.getLogger(__name__)

MODEL_VERSION = "v1.0.0"


class ProductivityCalculator:
    """Rule-based productivity score calculator. Used as ground truth for ML training labels."""

    WEIGHTS = {
        "sleep": 0.25,
        "coding": 0.20,
        "study": 0.15,
        "mood": 0.20,
        "exercise": 0.10,
        "distraction": 0.10,
    }

    def compute(self, log_data: dict) -> float:
        sleep_n = min(float(log_data.get("sleep_hours", 0)), 10) / 10
        coding_n = min(float(log_data.get("coding_hours", 0)), 12) / 12
        study_n = min(float(log_data.get("study_hours", 0)), 12) / 12
        mood_n = (int(log_data.get("mood_score", 5)) - 1) / 9
        exercise_n = min(int(log_data.get("exercise_minutes", 0)), 120) / 120
        distract_n = 1 - min(float(log_data.get("distraction_hours", 0)), 12) / 12

        score = (
            self.WEIGHTS["sleep"] * sleep_n
            + self.WEIGHTS["coding"] * coding_n
            + self.WEIGHTS["study"] * study_n
            + self.WEIGHTS["mood"] * mood_n
            + self.WEIGHTS["exercise"] * exercise_n
            + self.WEIGHTS["distraction"] * distract_n
        )
        return round(score * 100, 2)

    def classify_burnout(self, log_data: dict, score: float) -> Tuple[str, float]:
        sleep = float(log_data.get("sleep_hours", 0))
        mood = int(log_data.get("mood_score", 5))
        distraction = float(log_data.get("distraction_hours", 0))

        if score < 35 or sleep < 4 or (mood <= 3 and distraction > 6):
            label = "HIGH"
            prob = min(1.0, round(0.6 + (35 - max(score, 0)) / 100, 3))
        elif score < 55 or sleep < 6:
            label = "MEDIUM"
            prob = min(0.6, round(0.3 + (55 - max(score, 0)) / 150, 3))
        else:
            label = "LOW"
            prob = max(0.0, round(0.3 - (score - 55) / 150, 3))

        return label, max(0.0, min(1.0, prob))

    def predict_best_focus_hour(self, log_data: dict) -> int:
        """Heuristic: sleep-adjusted focus time prediction (9am-1pm window baseline)."""
        sleep = float(log_data.get("sleep_hours", 7))
        mood = int(log_data.get("mood_score", 5))
        day_of_week = log_data.get("day_of_week", 1)

        base_hour = 9  # Default 9am
        if sleep >= 8:
            base_hour = 8   # Well-rested: earlier focus
        elif sleep < 5:
            base_hour = 11  # Sleep-deprived: later focus

        if mood >= 8:
            base_hour = max(7, base_hour - 1)
        elif mood <= 3:
            base_hour = min(13, base_hour + 2)

        if day_of_week in [5, 6]:  # Weekend
            base_hour += 1

        return int(np.clip(base_hour, 6, 20))


class MLService:
    """Handles ML inference pipeline. Falls back to rule-based if model not loaded."""

    def __init__(self):
        self.calculator = ProductivityCalculator()
        self._productivity_model = None
        self._burnout_model = None
        self._try_load_models()

    def _try_load_models(self):
        """Attempt to load trained sklearn models. Silently falls back to rule-based."""
        try:
            import joblib, os
            prod_path = os.path.join(os.path.dirname(__file__), "../ml/models/productivity_model.pkl")
            burn_path = os.path.join(os.path.dirname(__file__), "../ml/models/burnout_model.pkl")
            if os.path.exists(prod_path):
                self._productivity_model = joblib.load(prod_path)
                logger.info("Loaded productivity model from disk")
            if os.path.exists(burn_path):
                self._burnout_model = joblib.load(burn_path)
                logger.info("Loaded burnout model from disk")
        except Exception as e:
            logger.warning(f"Could not load ML models, using rule-based fallback: {e}")

    def _extract_features(self, log: ActivityLog) -> list:
        import datetime
        log_date = log.log_date if hasattr(log.log_date, "weekday") else log.log_date
        return [
            float(log.sleep_hours),
            float(log.coding_hours),
            float(log.study_hours),
            float(log.mood_score),
            float(log.exercise_minutes),
            float(log.distraction_hours),
            float(log.coding_hours) + float(log.study_hours),  # total_productive
            max(0, 7 - float(log.sleep_hours)),                 # sleep_deficit
            (float(log.coding_hours) + float(log.study_hours)) / (float(log.coding_hours) + float(log.study_hours) + float(log.distraction_hours) + 1e-6),  # focus_ratio
            log_date.weekday() if hasattr(log_date, "weekday") else 0,
        ]

    def run_inference(self, db: Session, log: ActivityLog) -> Prediction:
        """Run full inference pipeline and save prediction + insights."""
        log_dict = {
            "sleep_hours": float(log.sleep_hours),
            "coding_hours": float(log.coding_hours),
            "study_hours": float(log.study_hours),
            "mood_score": int(log.mood_score),
            "exercise_minutes": int(log.exercise_minutes),
            "distraction_hours": float(log.distraction_hours),
            "day_of_week": log.log_date.weekday() if hasattr(log.log_date, "weekday") else 0,
        }

        # Predict productivity score
        if self._productivity_model:
            features = self._extract_features(log)
            score = float(self._productivity_model.predict([features])[0])
            score = round(max(0, min(100, score)), 2)
        else:
            score = self.calculator.compute(log_dict)

        # Predict burnout
        if self._burnout_model:
            features = self._extract_features(log)
            burnout_label = self._burnout_model.predict([features])[0]
            proba = self._burnout_model.predict_proba([features])[0]
            burnout_class = burnout_label if isinstance(burnout_label, str) else ["LOW", "MEDIUM", "HIGH"][burnout_label]
            burnout_prob = float(max(proba))
        else:
            burnout_class, burnout_prob = self.calculator.classify_burnout(log_dict, score)

        focus_hour = self.calculator.predict_best_focus_hour(log_dict)

        # Upsert prediction
        existing = db.query(Prediction).filter(Prediction.activity_log_id == log.id).first()
        if existing:
            existing.productivity_score = score
            existing.burnout_class = burnout_class
            existing.burnout_probability = burnout_prob
            existing.best_focus_hour = focus_hour
            existing.model_version = MODEL_VERSION
            prediction = existing
        else:
            prediction = Prediction(
                user_id=log.user_id,
                activity_log_id=log.id,
                productivity_score=score,
                burnout_class=burnout_class,
                burnout_probability=burnout_prob,
                best_focus_hour=focus_hour,
                model_version=MODEL_VERSION,
            )
            db.add(prediction)

        db.commit()

        # Generate and save insights
        insight_engine = InsightEngine()
        insights = insight_engine.generate(log_dict, {
            "productivity_score": score,
            "burnout_class": burnout_class,
            "burnout_probability": burnout_prob,
            "best_focus_hour": focus_hour,
        })

        for ins_data in insights:
            db.add(Insight(
                user_id=log.user_id,
                insight_text=ins_data["text"],
                insight_type=ins_data["type"],
                severity=ins_data["severity"],
                triggered_by_date=log.log_date,
            ))

        db.commit()
        db.refresh(prediction)
        return prediction


class InsightEngine:
    """Rule-based engine that generates human-readable, actionable insights."""

    def generate(self, log: dict, prediction: dict) -> list:
        insights = []
        sleep = log.get("sleep_hours", 0)
        mood = log.get("mood_score", 5)
        distraction = log.get("distraction_hours", 0)
        exercise = log.get("exercise_minutes", 0)
        coding = log.get("coding_hours", 0)
        study = log.get("study_hours", 0)
        score = prediction.get("productivity_score", 50)
        burnout_class = prediction.get("burnout_class", "LOW")
        focus_hour = prediction.get("best_focus_hour", 9)

        # Sleep insights
        if sleep >= 8 and score >= 70:
            insights.append({
                "text": f"Great sleep ({sleep:.1f}hrs) correlated with high productivity ({score:.0f}/100). Keep it up!",
                "type": "SLEEP", "severity": "INFO",
            })
        elif sleep < 5:
            deficit = round(7 - sleep, 1)
            insights.append({
                "text": f"Sleep deficit of {deficit}hrs detected. Chronic sleep < 5hrs reduces cognitive performance by up to 25%.",
                "type": "SLEEP", "severity": "CRITICAL",
            })
        elif 5 <= sleep < 6.5:
            insights.append({
                "text": f"Sleep at {sleep:.1f}hrs is below the optimal 7-8hr range. Consider an earlier bedtime tonight.",
                "type": "SLEEP", "severity": "WARN",
            })

        # Burnout insights
        if burnout_class == "HIGH":
            insights.append({
                "text": f"⚠️ High burnout risk detected. Productivity score is {score:.0f}/100 and sleep is {sleep:.1f}hrs. Take a scheduled recovery day this week.",
                "type": "BURNOUT", "severity": "CRITICAL",
            })
        elif burnout_class == "MEDIUM":
            insights.append({
                "text": f"Moderate burnout risk. Consider reducing workload by 20% and prioritizing sleep improvement.",
                "type": "BURNOUT", "severity": "WARN",
            })

        # Focus insights
        if distraction >= 5:
            insights.append({
                "text": f"High distraction time ({distraction:.1f}hrs). Try time-blocking: 90-min deep work sessions with 15-min breaks.",
                "type": "DISTRACTION", "severity": "WARN",
            })
        elif distraction < 1 and (coding + study) >= 5:
            insights.append({
                "text": f"Excellent focus! Low distraction ({distraction:.1f}hrs) with {coding+study:.1f}hrs of deep work. Your predicted peak focus window is {focus_hour}:00.",
                "type": "FOCUS", "severity": "INFO",
            })

        # Mood insights
        if mood <= 3:
            insights.append({
                "text": f"Low mood ({mood}/10) detected. Physical activity has been shown to improve mood within 30 minutes. Try a short walk.",
                "type": "MOOD", "severity": "WARN",
            })
        elif mood >= 9 and score >= 75:
            insights.append({
                "text": f"Peak performance state: mood {mood}/10 and productivity {score:.0f}/100. Log what you did today as a template.",
                "type": "MOOD", "severity": "INFO",
            })

        # Exercise insights
        if exercise == 0:
            insights.append({
                "text": "No exercise logged today. Even 20 minutes of walking improves focus and reduces cortisol levels.",
                "type": "EXERCISE", "severity": "WARN",
            })
        elif exercise >= 60:
            insights.append({
                "text": f"Strong exercise habit ({exercise}min). Regular exercise increases neuroplasticity and sustained attention.",
                "type": "EXERCISE", "severity": "INFO",
            })

        return insights
