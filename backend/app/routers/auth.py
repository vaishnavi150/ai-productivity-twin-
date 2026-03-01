from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        timezone=user_data.timezone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email, User.is_active == True).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(lambda: None)):
    # Placeholder - actual dependency injection handled in main app
    pass
