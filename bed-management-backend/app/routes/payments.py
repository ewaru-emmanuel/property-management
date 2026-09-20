from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.services import payment_service

router = APIRouter(prefix="/api/payments", tags=["Payments"])


class PaymentCreate(BaseModel):
    occupant_id: str
    amount_paid: float = 0
    balance: float = 0
    due_date: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None


@router.get("")
def list_payments(building_id: Optional[str] = None, user=Depends(get_current_user)):
    return payment_service.list_payments(user["id"], building_id)


@router.post("")
def create_payment(payload: PaymentCreate, user=Depends(get_current_user)):
    try:
        return payment_service.create_payment(user["id"], payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))