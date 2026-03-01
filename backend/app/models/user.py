import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    full_name = Column(String(255), nullable=True)
    timezone = Column(String(64), default="UTC")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
