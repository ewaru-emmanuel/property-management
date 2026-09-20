from app.database import supabase_admin


def list_payments(user_id: str, building_id: str = None):
    bq = supabase_admin.table("buildings").select("id").eq("user_id", user_id)
    if building_id:
        bq = bq.eq("id", building_id)
    building_ids = [b["id"] for b in bq.execute().data]

    if not building_ids:
        return []

    # Get occupants in these buildings
    occ = (
        supabase_admin.table("occupants")
        .select("id, full_name, building_id, deck_id")
        .in_("building_id", building_ids)
        .execute()
    ).data
    occ_map = {o["id"]: o for o in occ}

    if not occ_map:
        return []

    pays = (
        supabase_admin.table("payments")
        .select("*")
        .in_("occupant_id", list(occ_map.keys()))
        .order("payment_date", desc=True)
        .execute()
    ).data

    # Enrich with occupant name + room/bed info
    for p in pays:
        o = occ_map.get(p["occupant_id"])
        p["occupant_name"] = o["full_name"] if o else "—"

        if o and o.get("deck_id"):
            deck = (
                supabase_admin.table("decks")
                .select("position, bed_id")
                .eq("id", o["deck_id"])
                .execute()
            ).data
            if deck:
                bed = (
                    supabase_admin.table("beds")
                    .select("name, room_id")
                    .eq("id", deck[0]["bed_id"])
                    .execute()
                ).data
                if bed:
                    room = (
                        supabase_admin.table("rooms")
                        .select("name")
                        .eq("id", bed[0]["room_id"])
                        .execute()
                    ).data
                    p["room_name"] = room[0]["name"] if room else "—"
                    p["bed_name"] = bed[0]["name"]
                    p["deck_position"] = deck[0]["position"]

    return pays


def create_payment(user_id: str, payload: dict):
    # Verify occupant belongs to user's building
    o = (
        supabase_admin.table("occupants")
        .select("id, deck_id, building_id")
        .eq("id", payload["occupant_id"])
        .execute()
    ).data
    if not o:
        raise Exception("Occupant not found")

    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", o[0]["building_id"])
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        raise Exception("Not authorized")

    res = (
        supabase_admin.table("payments")
        .insert({
            "occupant_id": payload["occupant_id"],
            "deck_id": o[0].get("deck_id"),
            "amount_paid": payload.get("amount_paid", 0),
            "balance": payload.get("balance", 0),
            "due_date": payload.get("due_date"),
            "status": payload.get("status", "Pending"),
            "notes": payload.get("notes"),
        })
        .execute()
    )
    return res.data[0]