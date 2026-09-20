from app.database import supabase_admin


def list_floors(user_id: str, building_id: str):
    # Verify building belongs to user
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        return None

    # Get floors
    floors = (
        supabase_admin.table("floors")
        .select("*")
        .eq("building_id", building_id)
        .order("floor_number")
        .execute()
    ).data

    # Attach room/occupied counts
    for floor in floors:
        rooms = (
            supabase_admin.table("rooms")
            .select("id")
            .eq("floor_id", floor["id"])
            .execute()
        ).data
        room_ids = [r["id"] for r in rooms]

        occupied = 0
        total = 0
        if room_ids:
            beds = (
                supabase_admin.table("beds")
                .select("id")
                .in_("room_id", room_ids)
                .execute()
            ).data
            bed_ids = [b["id"] for b in beds]

            if bed_ids:
                decks = (
                    supabase_admin.table("decks")
                    .select("id, status")
                    .in_("bed_id", bed_ids)
                    .execute()
                ).data
                total = len(decks)
                occupied = len([d for d in decks if d["status"] == "Occupied"])

        floor["rooms_count"] = len(rooms)
        floor["total_beds"] = total
        floor["occupied_beds"] = occupied

    return floors


def list_rooms(user_id: str, floor_id: str):
    # Verify floor belongs to user via building
    f = (
        supabase_admin.table("floors")
        .select("id, building_id, buildings(user_id)")
        .eq("id", floor_id)
        .execute()
    )
    if not f.data:
        return None

    floor = f.data[0]
    if floor["buildings"]["user_id"] != user_id:
        return None

    rooms = (
        supabase_admin.table("rooms")
        .select("*")
        .eq("floor_id", floor_id)
        .order("name")
        .execute()
    ).data

    for room in rooms:
        beds = (
            supabase_admin.table("beds")
            .select("id")
            .eq("room_id", room["id"])
            .execute()
        ).data
        bed_ids = [b["id"] for b in beds]

        total = 0
        occupied = 0
        if bed_ids:
            decks = (
                supabase_admin.table("decks")
                .select("id, status")
                .in_("bed_id", bed_ids)
                .execute()
            ).data
            total = len(decks)
            occupied = len([d for d in decks if d["status"] == "Occupied"])

        room["beds_count"] = len(beds)
        room["total_decks"] = total
        room["occupied_decks"] = occupied

    return rooms