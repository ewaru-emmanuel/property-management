from app.database import supabase_admin


def create_building(user_id: str, payload: dict):
    """
    Insert a building and its nested floors, rooms, beds, and decks.
    Uses the admin client so it can bypass RLS for the multi-insert.
    """
    # 1. Insert building
    building_res = (
        supabase_admin.table("buildings")
        .insert({
            "user_id": user_id,
            "name": payload["name"],
            "address": payload.get("address"),
            "description": payload.get("description"),
        })
        .execute()
    )
    building = building_res.data[0]
    building_id = building["id"]

    # 2. Insert floors
    for floor in payload.get("floors", []):
        floor_res = (
            supabase_admin.table("floors")
            .insert({
                "building_id": building_id,
                "name": floor["name"],
                "floor_number": floor["floor_number"],
            })
            .execute()
        )
        floor_id = floor_res.data[0]["id"]

        # 3. Insert rooms
        for room in floor.get("rooms", []):
            room_res = (
                supabase_admin.table("rooms")
                .insert({
                    "floor_id": floor_id,
                    "name": room["name"],
                    "room_type": room.get("room_type"),
                })
                .execute()
            )
            room_id = room_res.data[0]["id"]

            # 4. Insert beds
            for bed in room.get("beds", []):
                bed_res = (
                    supabase_admin.table("beds")
                    .insert({
                        "room_id": room_id,
                        "name": bed["name"],
                    })
                    .execute()
                )
                bed_id = bed_res.data[0]["id"]

                # 5. Insert decks
                for deck in bed.get("decks", []):
                    supabase_admin.table("decks").insert({
                        "bed_id": bed_id,
                        "position": deck["position"],
                        "monthly_rate": deck.get("monthly_rate", 0),
                        "status": "Vacant",
                    }).execute()

    return building


def list_buildings(user_id: str):
    res = (
        supabase_admin.table("buildings")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


def get_building(user_id: str, building_id: str):
    res = (
        supabase_admin.table("buildings")
        .select("*")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_building(user_id: str, building_id: str):
    # RLS cascade handles children, but we still filter by user
    res = (
        supabase_admin.table("buildings")
        .delete()
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data