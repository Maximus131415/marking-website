from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import security 

router = APIRouter(prefix="/api")

@router.post("/register", status_code=201)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    user = models.User(
        username=data.username,
        email=data.email,
        # Обращаемся к security
        hashed_password=security.hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Регистрация прошла успешно"}


@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    # Обращаемся к security
    if not user or not security.verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    # Обращаемся к security
    token = security.create_access_token({"sub": user.email})
    return {
        "token": token,
        "user": {"username": user.username, "role": user.role}
    }


@router.get("/me", response_model=schemas.UserOut)
# Обращаемся к security
def get_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user