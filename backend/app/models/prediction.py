import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Numeric, SmallInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_log_id = Column(UUID(as_uuid=True), ForeignKey("activity_logs.id", ondelete="CASCADE"), nullable=False, unique=True)
    productivity_score = Column(Numeric(5, 2), nullable=True)
    burnout_class = Column(String(10), nullable=True)   # LOW | MEDIUM | HIGH
    burnout_probability = Column(Numeric(5, 4), nullable=True)
    best_focus_hour = Column(SmallInteger, nullable=True)  # 0-23
    model_version = Column(String(32), default="v1.0.0")
    predicted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="predictions")
    activity_log = relationship("ActivityLog", back_populates="prediction")

    def __repr__(self):
        return f"<Prediction(score={self.productivity_score}, burnout={self.burnout_class})>"
