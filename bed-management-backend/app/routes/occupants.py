from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.services import occupant_service

router = APIRouter(prefix="/api/occupants", tags=["Occupants"])


class OccupantCreate(BaseModel):
    building_id: str
    deck_id: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact: Optional[str] = None
    check_in_date: Optional[str] = None


@router.get("")
def list_occupants(building_id: Optional[str] = None, user=Depends(get_current_user)):
    return occupant_service.list_occupants(user["id"], building_id)


@router.post("")
def create_occupant(payload: OccupantCreate, user=Depends(get_current_user)):
    try:
        return occupant_service.create_occupant(user["id"], payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{occupant_id}")
def delete_occupant(occupant_id: str, user=Depends(get_current_user)):
    try:
        return occupant_service.delete_occupant(user["id"], occupant_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/vacant-decks")
def vacant_decks(building_id: str, user=Depends(get_current_user)):
    return occupant_service.list_vacant_decks(user["id"], building_id)