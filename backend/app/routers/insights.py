from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.insight import Insight
from app.models.user import User
from app.schemas import InsightResponse, PaginatedInsights
from app.core.security import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/", response_model=PaginatedInsights)
def get_insights(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Insight).filter(Insight.user_id == current_user.id)
    if unread_only:
        query = query.filter(Insight.is_read == False)

    total = query.count()
    items = query.order_by(Insight.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return PaginatedInsights(total=total, page=page, per_page=per_page, items=items)


@router.patch("/{insight_id}/read", response_model=InsightResponse)
def mark_as_read(
    insight_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.user_id == current_user.id,
    ).first()
    if not insight:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    db.commit()
    db.refresh(insight)
    return insight


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Insight).filter(
        Insight.user_id == current_user.id,
        Insight.is_read == False,
    ).update({"is_read": True})
    db.commit()


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Insight).filter(
        Insight.user_id == current_user.id,
        Insight.is_read == False,
    ).count()
    return {"unread_count": count}
