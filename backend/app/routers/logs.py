from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.activity import ActivityLog
from app.models.user import User
from app.schemas import ActivityLogCreate, ActivityLogUpdate, ActivityLogResponse
from app.core.security import get_current_user
from app.services.ml_service import MLService

router = APIRouter(prefix="/logs", tags=["Activity Logs"])


@router.post("/", response_model=ActivityLogResponse, status_code=201)
def create_log(
    log_data: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check for duplicate date
    existing = db.query(ActivityLog).filter(
        and_(
            ActivityLog.user_id == current_user.id,
            ActivityLog.log_date == log_data.log_date,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Log for {log_data.log_date} already exists. Use PUT to update.")

    log = ActivityLog(
        user_id=current_user.id,
        **log_data.model_dump(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Run ML inference synchronously (use Celery for async in production)
    try:
        ml_service = MLService()
        ml_service.run_inference(db, log)
    except Exception as e:
        # Non-blocking: log creation succeeds even if ML fails
        import logging
        logging.getLogger(__name__).error(f"ML inference failed: {e}")

    db.refresh(log)
    return log


@router.get("/", response_model=List[ActivityLogResponse])
def get_logs(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)
    if start_date:
        query = query.filter(ActivityLog.log_date >= start_date)
    if end_date:
        query = query.filter(ActivityLog.log_date <= end_date)
    return query.order_by(ActivityLog.log_date.desc()).limit(limit).all()


@router.get("/{log_date}", response_model=ActivityLogResponse)
def get_log_by_date(
    log_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(ActivityLog).filter(
        and_(ActivityLog.user_id == current_user.id, ActivityLog.log_date == log_date)
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail=f"No log found for {log_date}")
    return log


@router.put("/{log_id}", response_model=ActivityLogResponse)
def update_log(
    log_id: UUID,
    updates: ActivityLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(ActivityLog).filter(
        and_(ActivityLog.id == log_id, ActivityLog.user_id == current_user.id)
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)

    # Re-run ML inference after update
    try:
        ml_service = MLService()
        ml_service.run_inference(db, log)
    except Exception:
        pass

    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(ActivityLog).filter(
        and_(ActivityLog.id == log_id, ActivityLog.user_id == current_user.id)
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
