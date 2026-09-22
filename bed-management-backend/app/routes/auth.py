from fastapi import APIRouter, Depends, HTTPException, status
from app.models.auth import SignupRequest, LoginRequest
from app.services import auth_service
from app.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional

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


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None


class ChangePasswordRequest(BaseModel):
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


@router.put("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    user=Depends(get_current_user),
):
    try:
        return auth_service.update_profile(
            user["id"], payload.full_name, payload.phone, payload.currency
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user=Depends(get_current_user),
):
    try:
        return auth_service.change_password(user["id"], payload.new_password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))