from app.database import supabase_admin


def list_occupants(user_id: str, building_id: str = None):
    """
    List occupants with their full location context in ONE query.
    """
    bq = supabase_admin.table("buildings").select("id").eq("user_id", user_id)
    if building_id:
        bq = bq.eq("id", building_id)
    building_ids = [b["id"] for b in bq.execute().data]

    if not building_ids:
        return []

    res = (
        supabase_admin.table("occupants")
        .select("""
            id, building_id, deck_id, full_name, phone, email,
            emergency_contact, check_in_date, check_out_date, status, created_at,
            decks (
                id, position,
                beds (
                    id, name,
                    rooms (
                        id, name,
                        floors ( id, name )
                    )
                )
            )
        """)
        .in_("building_id", building_ids)
        .order("created_at", desc=True)
        .execute()
    )

    result = []
    for o in res.data:
        deck = o.pop("decks") or {}
        bed = deck.get("beds") or {}
        room = bed.get("rooms") or {}
        floor = room.get("floors") or {}

        o["floor_name"] = floor.get("name", "")
        o["room_name"] = room.get("name", "")
        o["bed_name"] = bed.get("name", "")
        o["deck_position"] = deck.get("position", "")

        result.append(o)

    return result


def create_occupant(user_id: str, payload: dict):
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", payload["building_id"])
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        raise Exception("Building not found for this user")

    deck_id = payload.get("deck_id") or None
    phone = payload.get("phone") or None
    email = payload.get("email") or None
    emergency_contact = payload.get("emergency_contact") or None
    check_in_date = payload.get("check_in_date") or None
    full_name = (payload.get("full_name") or "").strip()

    if not full_name:
        raise Exception("Full name is required")

    # ⭐ TEMP DEBUG — log the exact payload
    print(f"DEBUG create_occupant payload: {payload}")
    print(f"DEBUG normalized: deck_id={deck_id}, full_name={full_name}, check_in_date={check_in_date}")

    try:
        res = (
            supabase_admin.table("occupants")
            .insert({
                "building_id": payload["building_id"],
                "deck_id": deck_id,
                "full_name": full_name,
                "phone": phone,
                "email": email,
                "emergency_contact": emergency_contact,
                "check_in_date": check_in_date,
                "status": "Active",
            })
            .execute()
        )
    except Exception as e:
        # ⭐ Surface the exact Supabase error
        raise Exception(f"Supabase insert failed: {str(e)}")

    occupant = res.data[0]

    if deck_id:
        supabase_admin.table("decks").update(
            {"status": "Occupied"}
        ).eq("id", deck_id).execute()

    return occupant

def update_occupant(user_id: str, occupant_id: str, payload: dict):
    # Verify occupant exists and belongs to user's building
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

    old_deck_id = o[0].get("deck_id")
    new_deck_id = payload.get("deck_id")

    # Build the update dict — skip empty strings
    update_data = {}
    for field in [
        "full_name",
        "phone",
        "email",
        "emergency_contact",
        "check_in_date",
        "status",
    ]:
        value = payload.get(field)
        if value is not None and value != "":
            update_data[field] = value

    # Handle deck swap if a new deck is provided and different
    if new_deck_id and new_deck_id != old_deck_id:
        update_data["deck_id"] = new_deck_id

        if old_deck_id:
            supabase_admin.table("decks").update(
                {"status": "Vacant"}
            ).eq("id", old_deck_id).execute()

        supabase_admin.table("decks").update(
            {"status": "Occupied"}
        ).eq("id", new_deck_id).execute()

    if not update_data:
        return {"message": "Nothing to update"}

    res = (
        supabase_admin.table("occupants")
        .update(update_data)
        .eq("id", occupant_id)
        .execute()
    )
    return res.data[0] if res.data else {"message": "Updated"}


def delete_occupant(user_id: str, occupant_id: str):
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
    """
    Return all vacant decks in a building with full location context in ONE query.
    """
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        return []

    res = (
        supabase_admin.table("decks")
        .select("""
            id, position, status,
            beds (
                id, name,
                rooms (
                    id, name,
                    floors!inner ( id, name, building_id )
                )
            )
        """)
        .eq("status", "Vacant")
        .eq("beds.rooms.floors.building_id", building_id)
        .execute()
    )

    result = []
    for d in res.data:
        bed = d.get("beds") or {}
        room = bed.get("rooms") or {}
        floor = room.get("floors") or {}

        if not bed or not room or not floor:
            continue

        floor_name = floor.get("name", "")
        room_name = room.get("name", "")
        bed_name = bed.get("name", "")

        result.append({
            "deck_id": d["id"],
            "label": f"{floor_name} → Room {room_name} → {bed_name} ({d['position']})",
        })

    return result