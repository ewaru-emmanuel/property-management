from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.models.building import BuildingCreate, BuildingResponse
from app.services import building_service

router = APIRouter(prefix="/api/buildings", tags=["Buildings"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_building(
    payload: BuildingCreate,
    user=Depends(get_current_user),
):
    try:
        building = building_service.create_building(
            user_id=user["id"],
            payload=payload.model_dump(),
        )
        return building
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def list_buildings(user=Depends(get_current_user)):
    return building_service.list_buildings(user["id"])


@router.get("/{building_id}")
def get_building(
    building_id: str,
    user=Depends(get_current_user),
):
    building = building_service.get_building(user["id"], building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.delete("/{building_id}")
def delete_building(
    building_id: str,
    user=Depends(get_current_user),
):
    result = building_service.delete_building(user["id"], building_id)
    return {"deleted": True, "result": result}