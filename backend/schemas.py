from pydantic import BaseModel, EmailStr
from typing import Literal


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Literal["worker", "customer"] = "worker"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    username: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token: str
    user: UserOut
