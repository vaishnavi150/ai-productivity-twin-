from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────
class BurnoutClass(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class InsightType(str, Enum):
    SLEEP = "SLEEP"
    BURNOUT = "BURNOUT"
    FOCUS = "FOCUS"
    MOOD = "MOOD"
    EXERCISE = "EXERCISE"
    DISTRACTION = "DISTRACTION"


class Severity(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    CRITICAL = "CRITICAL"


# ─── Auth Schemas ─────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: Optional[str] = Field(None, max_length=255)
    timezone: str = "UTC"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    timezone: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


# ─── Activity Log Schemas ─────────────────────────────────────────────
class ActivityLogCreate(BaseModel):
    log_date: date
    study_hours: float = Field(ge=0, le=24, default=0.0)
    coding_hours: float = Field(ge=0, le=24, default=0.0)
    sleep_hours: float = Field(ge=0, le=24)
    mood_score: int = Field(ge=1, le=10)
    exercise_minutes: int = Field(ge=0, le=1440, default=0)
    distraction_hours: float = Field(ge=0, le=24, default=0.0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("study_hours", "coding_hours", "sleep_hours", "distraction_hours")
    @classmethod
    def round_hours(cls, v):
        return round(float(v), 2)


class ActivityLogUpdate(BaseModel):
    study_hours: Optional[float] = Field(None, ge=0, le=24)
    coding_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    exercise_minutes: Optional[int] = Field(None, ge=0, le=1440)
    distraction_hours: Optional[float] = Field(None, ge=0, le=24)
    notes: Optional[str] = Field(None, max_length=2000)


class ActivityLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    log_date: date
    study_hours: float
    coding_hours: float
    sleep_hours: float
    mood_score: int
    exercise_minutes: int
    distraction_hours: float
    notes: Optional[str]
    created_at: datetime
    prediction: Optional["PredictionResponse"] = None

    model_config = {"from_attributes": True}


# ─── Prediction Schemas ───────────────────────────────────────────────
class PredictionResponse(BaseModel):
    id: UUID
    productivity_score: Optional[float]
    burnout_class: Optional[BurnoutClass]
    burnout_probability: Optional[float]
    best_focus_hour: Optional[int]
    model_version: str
    predicted_at: datetime

    model_config = {"from_attributes": True}


# ─── Insight Schemas ──────────────────────────────────────────────────
class InsightResponse(BaseModel):
    id: UUID
    insight_text: str
    insight_type: InsightType
    severity: Severity
    triggered_by_date: Optional[date]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard Schemas ────────────────────────────────────────────────
class DailyMetric(BaseModel):
    date: date
    productivity_score: Optional[float]
    burnout_class: Optional[str]
    sleep_hours: float
    mood_score: int
    coding_hours: float
    study_hours: float
    distraction_hours: float
    exercise_minutes: int


class WeeklyDashboard(BaseModel):
    weekly_score: float
    avg_sleep: float
    avg_mood: float
    avg_coding: float
    burnout_risk: str
    burnout_probability: float
    daily_metrics: List[DailyMetric]
    unread_insights: int
    best_focus_hour: Optional[int]


class HeatmapEntry(BaseModel):
    date: date
    hour: int
    intensity: float  # 0-1


class TrendData(BaseModel):
    dates: List[date]
    productivity_scores: List[Optional[float]]
    sleep_hours: List[float]
    mood_scores: List[int]
    burnout_classes: List[Optional[str]]


# ─── Pagination ───────────────────────────────────────────────────────
class PaginatedInsights(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[InsightResponse]
