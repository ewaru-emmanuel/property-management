from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.services import floor_service, stats_service

router = APIRouter(prefix="/api", tags=["Floors"])


@router.get("/buildings/{building_id}/floors")
def get_floors(building_id: str, user=Depends(get_current_user)):
    floors = floor_service.list_floors(user["id"], building_id)
    if floors is None:
        raise HTTPException(status_code=404, detail="Building not found")
    return floors


@router.get("/floors/{floor_id}/rooms")
def get_rooms(floor_id: str, user=Depends(get_current_user)):
    rooms = floor_service.list_rooms(user["id"], floor_id)
    if rooms is None:
        raise HTTPException(status_code=404, detail="Floor not found")
    return rooms


@router.get("/buildings/{building_id}/stats")
def building_stats(building_id: str, user=Depends(get_current_user)):
    stats = stats_service.get_building_stats(user["id"], building_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Building not found")
    return stats