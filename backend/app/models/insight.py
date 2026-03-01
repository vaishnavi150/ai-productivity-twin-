import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    insight_text = Column(Text, nullable=False)
    insight_type = Column(String(32), nullable=False)  # SLEEP | BURNOUT | FOCUS | MOOD | EXERCISE
    severity = Column(String(10), default="INFO")       # INFO | WARN | CRITICAL
    triggered_by_date = Column(Date, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="insights")

    def __repr__(self):
        return f"<Insight(type={self.insight_type}, severity={self.severity})>"
