from app.database import supabase_admin


def list_occupants(user_id: str, building_id: str = None):
    # Restrict to buildings owned by this user
    bq = supabase_admin.table("buildings").select("id").eq("user_id", user_id)
    if building_id:
        bq = bq.eq("id", building_id)
    building_ids = [b["id"] for b in bq.execute().data]

    if not building_ids:
        return []

    occ = (
        supabase_admin.table("occupants")
        .select("*")
        .in_("building_id", building_ids)
        .order("created_at", desc=True)
        .execute()
    ).data

    # Enrich with room/bed/deck info
    for o in occ:
        if o.get("deck_id"):
            deck = (
                supabase_admin.table("decks")
                .select("id, position, bed_id")
                .eq("id", o["deck_id"])
                .execute()
            ).data
            if deck:
                d = deck[0]
                bed = (
                    supabase_admin.table("beds")
                    .select("id, name, room_id")
                    .eq("id", d["bed_id"])
                    .execute()
                ).data
                if bed:
                    b = bed[0]
                    room = (
                        supabase_admin.table("rooms")
                        .select("id, name, floor_id")
                        .eq("id", b["room_id"])
                        .execute()
                    ).data
                    if room:
                        r = room[0]
                        floor = (
                            supabase_admin.table("floors")
                            .select("id, name")
                            .eq("id", r["floor_id"])
                            .execute()
                        ).data
                        o["floor_name"] = floor[0]["name"] if floor else ""
                        o["room_name"] = r["name"]
                        o["bed_name"] = b["name"]
                        o["deck_position"] = d["position"]

    return occ


def create_occupant(user_id: str, payload: dict):
    # Verify building belongs to user
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", payload["building_id"])
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        raise Exception("Building not found for this user")

    # Insert occupant
    res = (
        supabase_admin.table("occupants")
        .insert({
            "building_id": payload["building_id"],
            "deck_id": payload.get("deck_id"),
            "full_name": payload["full_name"],
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "emergency_contact": payload.get("emergency_contact"),
            "check_in_date": payload.get("check_in_date"),
            "status": "Active",
        })
        .execute()
    )
    occupant = res.data[0]

    # Mark deck as Occupied
    if payload.get("deck_id"):
        supabase_admin.table("decks").update(
            {"status": "Occupied"}
        ).eq("id", payload["deck_id"]).execute()

    return occupant


def delete_occupant(user_id: str, occupant_id: str):
    # Verify ownership
    o = (
        supabase_admin.table("occupants")
        .select("id, deck_id, building_id")
        .eq("id", occupant_id)
        .execute()
    ).data
    if not o:
        raise Exception("Occupant not found")

    building = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", o[0]["building_id"])
        .eq("user_id", user_id)
        .execute()
    ).data
    if not building:
        raise Exception("Not authorized")

    # Free the deck
    if o[0].get("deck_id"):
        supabase_admin.table("decks").update(
            {"status": "Vacant"}
        ).eq("id", o[0]["deck_id"]).execute()

    supabase_admin.table("occupants").delete().eq("id", occupant_id).execute()
    return {"deleted": True}


def list_vacant_decks(user_id: str, building_id: str):
    # Verify ownership
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        return []

    # Get all floors → rooms → beds → decks
    floors = (
        supabase_admin.table("floors")
        .select("id, name")
        .eq("building_id", building_id)
        .execute()
    ).data

    result = []
    for floor in floors:
        rooms = (
            supabase_admin.table("rooms")
            .select("id, name")
            .eq("floor_id", floor["id"])
            .execute()
        ).data
        for room in rooms:
            beds = (
                supabase_admin.table("beds")
                .select("id, name")
                .eq("room_id", room["id"])
                .execute()
            ).data
            for bed in beds:
                decks = (
                    supabase_admin.table("decks")
                    .select("id, position, status")
                    .eq("bed_id", bed["id"])
                    .eq("status", "Vacant")
                    .execute()
                ).data
                for deck in decks:
                    result.append({
                        "deck_id": deck["id"],
                        "label": f"{floor['name']} → Room {room['name']} → {bed['name']} ({deck['position']})",
                    })
    return result