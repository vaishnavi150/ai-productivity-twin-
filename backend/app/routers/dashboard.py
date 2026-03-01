from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional, List
import numpy as np

from app.database import get_db
from app.models.activity import ActivityLog
from app.models.prediction import Prediction
from app.models.insight import Insight
from app.models.user import User
from app.schemas import WeeklyDashboard, TrendData, DailyMetric, HeatmapEntry
from app.core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _build_daily_metric(log: ActivityLog) -> DailyMetric:
    pred = log.prediction
    return DailyMetric(
        date=log.log_date,
        productivity_score=float(pred.productivity_score) if pred and pred.productivity_score else None,
        burnout_class=pred.burnout_class if pred else None,
        sleep_hours=float(log.sleep_hours),
        mood_score=log.mood_score,
        coding_hours=float(log.coding_hours),
        study_hours=float(log.study_hours),
        distraction_hours=float(log.distraction_hours),
        exercise_minutes=log.exercise_minutes,
    )


@router.get("/weekly", response_model=WeeklyDashboard)
def get_weekly_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = date.today()
    start_date = end_date - timedelta(days=6)

    logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.log_date >= start_date,
        ActivityLog.log_date <= end_date,
    ).order_by(ActivityLog.log_date.asc()).all()

    daily_metrics = [_build_daily_metric(log) for log in logs]

    # Compute weekly aggregates
    scores = [m.productivity_score for m in daily_metrics if m.productivity_score is not None]
    sleeps = [m.sleep_hours for m in daily_metrics]
    moods = [m.mood_score for m in daily_metrics]
    codings = [m.coding_hours for m in daily_metrics]

    # Recency-weighted weekly score
    if scores:
        weights = np.linspace(0.5, 1.0, len(scores))
        weights = weights / weights.sum()
        weekly_score = float(np.average(scores, weights=weights))
    else:
        weekly_score = 0.0

    # Burnout risk: most recent HIGH prediction or aggregate
    burnout_risk = "LOW"
    burnout_prob = 0.0
    recent_preds = [log.prediction for log in reversed(logs) if log.prediction]
    if recent_preds:
        latest_pred = recent_preds[0]
        burnout_risk = latest_pred.burnout_class or "LOW"
        burnout_prob = float(latest_pred.burnout_probability or 0.0)

    # Best focus hour
    best_focus = recent_preds[0].best_focus_hour if recent_preds else None

    unread_count = db.query(Insight).filter(
        Insight.user_id == current_user.id,
        Insight.is_read == False,
    ).count()

    return WeeklyDashboard(
        weekly_score=round(weekly_score, 2),
        avg_sleep=round(float(np.mean(sleeps)) if sleeps else 0.0, 2),
        avg_mood=round(float(np.mean(moods)) if moods else 0.0, 2),
        avg_coding=round(float(np.mean(codings)) if codings else 0.0, 2),
        burnout_risk=burnout_risk,
        burnout_probability=burnout_prob,
        daily_metrics=daily_metrics,
        unread_insights=unread_count,
        best_focus_hour=best_focus,
    )


@router.get("/trends", response_model=TrendData)
def get_trends(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.log_date >= start_date,
        ActivityLog.log_date <= end_date,
    ).order_by(ActivityLog.log_date.asc()).all()

    return TrendData(
        dates=[log.log_date for log in logs],
        productivity_scores=[
            float(log.prediction.productivity_score) if log.prediction and log.prediction.productivity_score else None
            for log in logs
        ],
        sleep_hours=[float(log.sleep_hours) for log in logs],
        mood_scores=[log.mood_score for log in logs],
        burnout_classes=[log.prediction.burnout_class if log.prediction else None for log in logs],
    )


@router.get("/heatmap", response_model=List[HeatmapEntry])
def get_heatmap(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate focus intensity heatmap based on historical productivity patterns."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.log_date >= start_date,
    ).order_by(ActivityLog.log_date.asc()).all()

    heatmap = []
    for log in logs:
        # Simulate hourly intensity based on best_focus_hour + productivity score
        pred = log.prediction
        if pred and pred.best_focus_hour is not None:
            focus_hour = pred.best_focus_hour
            base_score = float(pred.productivity_score or 50) / 100
            for hour in range(6, 24):  # Working hours 6am-midnight
                distance = abs(hour - focus_hour)
                intensity = max(0, base_score * (1 - distance / 8))
                heatmap.append(HeatmapEntry(
                    date=log.log_date,
                    hour=hour,
                    intensity=round(intensity, 3),
                ))

    return heatmap
