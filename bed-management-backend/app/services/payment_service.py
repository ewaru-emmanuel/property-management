from app.database import supabase_admin


def list_payments(user_id: str, building_id: str = None):
    """
    List payments with occupant + location context in ONE query.
    """
    # Get user's buildings
    bq = supabase_admin.table("buildings").select("id").eq("user_id", user_id)
    if building_id:
        bq = bq.eq("id", building_id)
    building_ids = [b["id"] for b in bq.execute().data]

    if not building_ids:
        return []

    # One nested query: payment → occupant → deck → bed → room
    res = (
        supabase_admin.table("payments")
        .select("""
            id, occupant_id, deck_id, amount_paid, balance,
            payment_date, due_date, status, notes, created_at,
            occupants!inner (
                id, full_name, building_id,
                decks (
                    id, position,
                    beds (
                        id, name,
                        rooms ( id, name )
                    )
                )
            )
        """)
        .in_("occupants.building_id", building_ids)
        .order("payment_date", desc=True)
        .execute()
    )

    # Flatten
    result = []
    for p in res.data:
        occ = p.pop("occupants", None) or {}
        deck = occ.get("decks", {}) if occ else {}
        bed = deck.get("beds", {}) if deck else {}
        room = bed.get("rooms", {}) if bed else {}

        p["occupant_name"] = occ.get("full_name", "—")
        p["room_name"] = room.get("name", "—")
        p["bed_name"] = bed.get("name", "—")
        p["deck_position"] = deck.get("position", "")

        result.append(p)

    return result


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


def update_payment(user_id: str, payment_id: str, payload: dict):
    # Verify payment exists and belongs to user's building
    p = (
        supabase_admin.table("payments")
        .select("id, occupant_id")
        .eq("id", payment_id)
        .execute()
    ).data
    if not p:
        raise Exception("Payment not found")

    occ = (
        supabase_admin.table("occupants")
        .select("id, building_id")
        .eq("id", p[0]["occupant_id"])
        .execute()
    ).data
    if not occ:
        raise Exception("Occupant not found")

    building = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", occ[0]["building_id"])
        .eq("user_id", user_id)
        .execute()
    ).data
    if not building:
        raise Exception("Not authorized")

    # Skip empty values
    update_data = {}
    for field in ["amount_paid", "balance", "due_date", "status", "notes"]:
        value = payload.get(field)
        if value is not None and value != "":
            update_data[field] = value

    if not update_data:
        return {"message": "Nothing to update"}

    res = (
        supabase_admin.table("payments")
        .update(update_data)
        .eq("id", payment_id)
        .execute()
    )
    return res.data[0] if res.data else {"message": "Updated"}


def delete_payment(user_id: str, payment_id: str):
    p = (
        supabase_admin.table("payments")
        .select("id, occupant_id")
        .eq("id", payment_id)
        .execute()
    ).data
    if not p:
        raise Exception("Payment not found")

    occ = (
        supabase_admin.table("occupants")
        .select("id, building_id")
        .eq("id", p[0]["occupant_id"])
        .execute()
    ).data
    if not occ:
        raise Exception("Occupant not found")

    building = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", occ[0]["building_id"])
        .eq("user_id", user_id)
        .execute()
    ).data
    if not building:
        raise Exception("Not authorized")

    supabase_admin.table("payments").delete().eq("id", payment_id).execute()
    return {"deleted": True}