import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Numeric, SmallInteger, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    __table_args__ = (
        UniqueConstraint("user_id", "log_date", name="uq_user_log_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date = Column(Date, nullable=False)
    study_hours = Column(Numeric(4, 2), default=0.0)
    coding_hours = Column(Numeric(4, 2), default=0.0)
    sleep_hours = Column(Numeric(4, 2), default=0.0)
    mood_score = Column(SmallInteger, nullable=False)  # 1-10
    exercise_minutes = Column(SmallInteger, default=0)
    distraction_hours = Column(Numeric(4, 2), default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")
    prediction = relationship("Prediction", back_populates="activity_log", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, date={self.log_date}, user={self.user_id})>"
