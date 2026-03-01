"""
ML Training Pipeline for AI Productivity Twin
============================================
Run: python train_pipeline.py --mode synthetic
       (generates synthetic data and trains models)
Run: python train_pipeline.py --mode db --db-url postgresql://...
       (trains on real data from DB)
"""

import argparse
import os
import sys
import logging
import numpy as np
import pandas as pd
import joblib
from datetime import date, timedelta
from pathlib import Path

from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score, classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

FEATURES = [
    "sleep_hours", "coding_hours", "study_hours", "mood_score",
    "exercise_minutes", "distraction_hours",
    "total_productive", "sleep_deficit", "focus_ratio", "day_of_week",
]


# ─── Productivity Score Formula ───────────────────────────────────────
def compute_productivity_score(row: dict) -> float:
    sleep_n    = min(float(row["sleep_hours"]), 10) / 10
    coding_n   = min(float(row["coding_hours"]), 12) / 12
    study_n    = min(float(row["study_hours"]), 12) / 12
    mood_n     = (float(row["mood_score"]) - 1) / 9
    exercise_n = min(float(row["exercise_minutes"]), 120) / 120
    distract_n = 1 - min(float(row["distraction_hours"]), 12) / 12

    score = (
        0.25 * sleep_n +
        0.20 * coding_n +
        0.15 * study_n +
        0.20 * mood_n +
        0.10 * exercise_n +
        0.10 * distract_n
    )
    return round(score * 100, 2)


def classify_burnout(row: dict, score: float) -> str:
    sleep = float(row["sleep_hours"])
    mood  = float(row["mood_score"])
    dist  = float(row["distraction_hours"])

    if score < 35 or sleep < 4 or (mood <= 3 and dist > 6):
        return "HIGH"
    elif score < 55 or sleep < 6:
        return "MEDIUM"
    return "LOW"


# ─── Synthetic Data Generation ────────────────────────────────────────
def generate_synthetic_data(n_samples: int = 1000) -> pd.DataFrame:
    """Generate realistic synthetic productivity data for training."""
    logger.info(f"Generating {n_samples} synthetic samples...")
    np.random.seed(42)

    records = []
    base_date = date.today() - timedelta(days=n_samples)

    for i in range(n_samples):
        log_date = base_date + timedelta(days=i)
        is_weekend = log_date.weekday() in [5, 6]

        # Realistic distributions
        sleep = np.clip(np.random.normal(6.5, 1.5), 2, 10)
        mood  = np.clip(int(np.random.normal(6, 2)), 1, 10)
        exercise = max(0, int(np.random.exponential(25)))
        distraction = np.clip(np.random.exponential(2.5), 0, 10)

        # Coding/study adjusted by sleep and mood
        max_work = max(0, 14 - sleep * 0.5 - distraction)
        coding   = np.clip(np.random.normal(3, 2) * (mood / 7) * (0.5 if is_weekend else 1), 0, max_work)
        study    = np.clip(np.random.normal(2, 1.5) * (mood / 7) * (0.5 if is_weekend else 1), 0, max_work - coding)

        row = {
            "sleep_hours": round(sleep, 2),
            "coding_hours": round(coding, 2),
            "study_hours": round(study, 2),
            "mood_score": mood,
            "exercise_minutes": min(exercise, 150),
            "distraction_hours": round(distraction, 2),
            "day_of_week": log_date.weekday(),
            "log_date": log_date,
        }
        records.append(row)

    df = pd.DataFrame(records)
    return df


# ─── Feature Engineering ─────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["total_productive"] = df["coding_hours"] + df["study_hours"]
    df["sleep_deficit"]    = np.maximum(0, 7 - df["sleep_hours"])
    df["focus_ratio"]      = df["total_productive"] / (df["total_productive"] + df["distraction_hours"] + 1e-6)

    # Compute targets
    df["productivity_score"] = df.apply(lambda r: compute_productivity_score(r.to_dict()), axis=1)
    df["burnout_class"]      = df.apply(lambda r: classify_burnout(r.to_dict(), r["productivity_score"]), axis=1)

    return df


# ─── Model Training ───────────────────────────────────────────────────
def train_productivity_model(df: pd.DataFrame):
    logger.info("Training Productivity Score Regressor...")
    X = df[FEATURES]
    y = df["productivity_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=5,
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2  = r2_score(y_test, preds)
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="r2")

    logger.info(f"Productivity Model - MAE: {mae:.2f} | R2: {r2:.3f} | CV-R2: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # Feature importance
    model = pipeline.named_steps["model"]
    importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: x[1], reverse=True)
    logger.info("Feature importances: " + " | ".join(f"{f}: {v:.3f}" for f, v in importances[:5]))

    return pipeline, {"mae": mae, "r2": r2, "cv_r2_mean": cv_scores.mean()}


def train_burnout_model(df: pd.DataFrame):
    logger.info("Training Burnout Risk Classifier...")
    le = LabelEncoder()
    X = df[FEATURES]
    y = le.fit_transform(df["burnout_class"])  # LOW=0, MEDIUM=1, HIGH=2

    logger.info(f"Class distribution: {dict(zip(le.classes_, np.bincount(y)))}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # SMOTE to handle class imbalance
    try:
        sm = SMOTE(random_state=42)
        X_res, y_res = sm.fit_resample(X_train, y_train)
        logger.info(f"After SMOTE: {dict(zip(le.classes_, np.bincount(y_res)))}")
    except Exception as e:
        logger.warning(f"SMOTE failed ({e}), training without oversampling")
        X_res, y_res = X_train, y_train

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingClassifier(
            n_estimators=300,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )),
    ])

    pipeline.fit(X_res, y_res)
    preds = pipeline.predict(X_test)
    report = classification_report(y_test, preds, target_names=le.classes_)
    logger.info(f"\n{report}")

    # ROC-AUC (one-vs-rest)
    proba = pipeline.predict_proba(X_test)
    try:
        auc = roc_auc_score(y_test, proba, multi_class="ovr")
        logger.info(f"ROC-AUC (OvR): {auc:.3f}")
    except Exception:
        auc = None

    return pipeline, le, {"report": report, "auc": auc}


# ─── Persistence ─────────────────────────────────────────────────────
def save_model(model, path: str, label_encoder=None):
    joblib.dump(model, path)
    logger.info(f"Model saved to {path}")
    if label_encoder:
        le_path = path.replace(".pkl", "_label_encoder.pkl")
        joblib.dump(label_encoder, le_path)
        logger.info(f"Label encoder saved to {le_path}")


# ─── Main Pipeline ────────────────────────────────────────────────────
def run_pipeline(mode: str = "synthetic", db_url: str = None, n_samples: int = 1500):
    logger.info(f"=== AI Productivity Twin - ML Training Pipeline ===")
    logger.info(f"Mode: {mode}")

    if mode == "synthetic":
        df_raw = generate_synthetic_data(n_samples)
    elif mode == "db":
        if not db_url:
            raise ValueError("--db-url required for db mode")
        import sqlalchemy
        engine = sqlalchemy.create_engine(db_url)
        df_raw = pd.read_sql("""
            SELECT al.sleep_hours, al.coding_hours, al.study_hours, al.mood_score,
                   al.exercise_minutes, al.distraction_hours,
                   EXTRACT(DOW FROM al.log_date) as day_of_week,
                   al.log_date
            FROM activity_logs al
            ORDER BY al.log_date
        """, engine)
        logger.info(f"Loaded {len(df_raw)} rows from database")
    else:
        raise ValueError(f"Unknown mode: {mode}")

    if len(df_raw) < 50:
        logger.warning(f"Only {len(df_raw)} samples — need 50+ for reliable training")

    df = engineer_features(df_raw)
    logger.info(f"Dataset: {len(df)} samples | Burnout distribution: {df['burnout_class'].value_counts().to_dict()}")

    # Train models
    prod_model, prod_metrics = train_productivity_model(df)
    burn_model, le, burn_metrics = train_burnout_model(df)

    # Save
    prod_path = str(MODELS_DIR / "productivity_model.pkl")
    burn_path = str(MODELS_DIR / "burnout_model.pkl")
    save_model(prod_model, prod_path)
    save_model(burn_model, burn_path, label_encoder=le)

    logger.info("=== Training Complete ===")
    logger.info(f"Productivity - R2: {prod_metrics['r2']:.3f}, MAE: {prod_metrics['mae']:.2f}")
    if burn_metrics.get("auc"):
        logger.info(f"Burnout - AUC: {burn_metrics['auc']:.3f}")

    return prod_model, burn_model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AI Productivity Twin ML models")
    parser.add_argument("--mode", choices=["synthetic", "db"], default="synthetic")
    parser.add_argument("--db-url", type=str, default=None)
    parser.add_argument("--samples", type=int, default=1500)
    args = parser.parse_args()

    run_pipeline(mode=args.mode, db_url=args.db_url, n_samples=args.samples)
