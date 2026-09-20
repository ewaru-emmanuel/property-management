from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


# ---------- Request models ----------

class DeckCreate(BaseModel):
    position: str  # "Upper" | "Middle" | "Lower"
    monthly_rate: float = 0


class BedCreate(BaseModel):
    name: str
    decks: List[DeckCreate]


class RoomCreate(BaseModel):
    name: str
    room_type: Optional[str] = None
    beds: List[BedCreate]


class FloorCreate(BaseModel):
    name: str
    floor_number: int
    rooms: List[RoomCreate]


class BuildingCreate(BaseModel):
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    floors: List[FloorCreate]


# ---------- Response models ----------

class BuildingResponse(BaseModel):
    id: UUID
    name: str
    address: Optional[str]
    description: Optional[str]