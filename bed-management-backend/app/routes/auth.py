from fastapi import APIRouter, Depends, HTTPException, status
from app.models.auth import SignupRequest, LoginRequest
from app.services import auth_service
from app.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class VerifyOtpRequest(BaseModel):
    email: str
    token: str

class RequestResetRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str


@router.post("/request-password-reset")
def request_password_reset(payload: RequestResetRequest):
    try:
        return auth_service.request_password_reset(payload.email)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    try:
        return auth_service.reset_password(
            payload.email, payload.token, payload.new_password
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    try:
        return auth_service.signup(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    try:
        return auth_service.verify_otp(payload.email, payload.token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(payload: LoginRequest):
    try:
        return auth_service.login(payload.email, payload.password)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
def me(user=Depends(get_current_user)):
    profile = auth_service.get_profile(user["id"])
    return {"user": user, "profile": profile}