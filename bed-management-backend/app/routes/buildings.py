from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from app.dependencies import get_current_user
from app.models.building import BuildingCreate
from app.services import building_service

router = APIRouter(prefix="/api/buildings", tags=["Buildings"])


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_building(
    payload: BuildingCreate,
    user=Depends(get_current_user),
):
    try:
        return building_service.create_building(
            user_id=user["id"],
            payload=payload.model_dump(),
        )
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


@router.put("/{building_id}")
def update_building(
    building_id: str,
    payload: BuildingUpdate,
    user=Depends(get_current_user),
):
    try:
        return building_service.update_building(
            user["id"], building_id, payload.model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{building_id}")
def delete_building(
    building_id: str,
    user=Depends(get_current_user),
):
    result = building_service.delete_building(user["id"], building_id)
    return {"deleted": True, "result": result}

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from app.dependencies import get_current_user
from app.models.building import BuildingCreate
from app.services import building_service

router = APIRouter(prefix="/api/buildings", tags=["Buildings"])


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None


class SyncPayload(BaseModel):
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    floors: List[Dict[str, Any]] = []


@router.post("", status_code=status.HTTP_201_CREATED)
def create_building(
    payload: BuildingCreate,
    user=Depends(get_current_user),
):
    try:
        return building_service.create_building(
            user_id=user["id"],
            payload=payload.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def list_buildings(user=Depends(get_current_user)):
    return building_service.list_buildings(user["id"])


# ---- IMPORTANT: /tree must come before /{building_id} ----
@router.get("/{building_id}/tree")
def get_building_tree(
    building_id: str,
    user=Depends(get_current_user),
):
    tree = building_service.get_building_tree(user["id"], building_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Building not found")
    return tree


@router.put("/{building_id}/sync")
def sync_building(
    building_id: str,
    payload: SyncPayload,
    user=Depends(get_current_user),
):
    try:
        return building_service.sync_building(
            user["id"], building_id, payload.model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{building_id}")
def get_building(
    building_id: str,
    user=Depends(get_current_user),
):
    building = building_service.get_building(user["id"], building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.put("/{building_id}")
def update_building(
    building_id: str,
    payload: BuildingUpdate,
    user=Depends(get_current_user),
):
    try:
        return building_service.update_building(
            user["id"], building_id, payload.model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{building_id}")
def delete_building(
    building_id: str,
    user=Depends(get_current_user),
):
    result = building_service.delete_building(user["id"], building_id)
    return {"deleted": True, "result": result}