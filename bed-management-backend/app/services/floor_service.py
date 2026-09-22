from app.database import supabase_admin


def list_floors(user_id: str, building_id: str):
    """
    Return floors for a building with room/bed/occupied counts.
    """
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

    floors = (
        supabase_admin.table("floors")
        .select("*")
        .eq("building_id", building_id)
        .order("floor_number")
        .execute()
    ).data

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
            bed_ids = [b_["id"] for b_ in beds]

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
    """
    List rooms with beds, decks, and occupant info in ONE nested query.
    """
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
    buildings = floor.get("buildings") or {}
    if buildings.get("user_id") != user_id:
        return None

    # One nested query: rooms → beds → decks → occupants
    res = (
        supabase_admin.table("rooms")
        .select("""
            id, name, room_type,
            beds (
                id, name,
                decks (
                    id, position, monthly_rate, status,
                    occupants ( id, full_name, status, phone )
                )
            )
        """)
        .eq("floor_id", floor_id)
        .order("name")
        .execute()
    )

    rooms = res.data or []
    deck_order = {"Upper": 0, "Middle": 1, "Lower": 2}

    for room in rooms:
        beds = room.get("beds") or []
        beds.sort(key=lambda b: b.get("name") or "")

        total_decks = 0
        occupied_decks = 0

        for bed in beds:
            decks = bed.get("decks") or []
            decks.sort(key=lambda d: deck_order.get(d.get("position"), 99))

            for deck in decks:
                occupants = deck.pop("occupants", None) or []

                active = next(
                    (o for o in occupants if o.get("status") == "Active"),
                    occupants[0] if occupants else None,
                )

                if active and deck.get("status") == "Occupied":
                    deck["occupant_id"] = active["id"]
                    deck["occupant_name"] = active["full_name"]
                    deck["occupant_phone"] = active.get("phone")

                    pays = (
                        supabase_admin.table("payments")
                        .select("amount_paid, balance, status")
                        .eq("occupant_id", active["id"])
                        .order("payment_date", desc=True)
                        .limit(1)
                        .execute()
                    ).data

                    if pays:
                        deck["balance"] = float(pays[0].get("balance") or 0)
                        deck["last_paid"] = float(pays[0].get("amount_paid") or 0)
                    else:
                        deck["balance"] = 0
                        deck["last_paid"] = 0
                else:
                    deck["occupant_id"] = None
                    deck["occupant_name"] = None
                    deck["balance"] = 0

            bed["decks"] = decks
            total_decks += len(decks)
            occupied_decks += sum(1 for d in decks if d.get("status") == "Occupied")

        room["beds"] = beds
        room["beds_count"] = len(beds)
        room["total_decks"] = total_decks
        room["occupied_decks"] = occupied_decks

    return rooms


def get_building_stats(user_id: str, building_id: str):
    """
    Return aggregated stats for a building.
    """
    b = (
        supabase_admin.table("buildings")
        .select("id, name")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        return None

    floors = (
        supabase_admin.table("floors")
        .select("id")
        .eq("building_id", building_id)
        .execute()
    ).data
    floor_ids = [f["id"] for f in floors]

    room_ids = []
    if floor_ids:
        rooms = (
            supabase_admin.table("rooms")
            .select("id")
            .in_("floor_id", floor_ids)
            .execute()
        ).data
        room_ids = [r["id"] for r in rooms]

    bed_ids = []
    if room_ids:
        beds = (
            supabase_admin.table("beds")
            .select("id")
            .in_("room_id", room_ids)
            .execute()
        ).data
        bed_ids = [b_["id"] for b_ in beds]

    total_decks = 0
    occupied = 0
    if bed_ids:
        decks = (
            supabase_admin.table("decks")
            .select("id, status")
            .in_("bed_id", bed_ids)
            .execute()
        ).data
        total_decks = len(decks)
        occupied = len([d for d in decks if d["status"] == "Occupied"])

    occupant_count = (
        supabase_admin.table("occupants")
        .select("id", count="exact")
        .eq("building_id", building_id)
        .eq("status", "Active")
        .execute()
    )
    total_occupants = occupant_count.count or 0

    occ_ids = [
        o["id"]
        for o in supabase_admin.table("occupants")
        .select("id")
        .eq("building_id", building_id)
        .execute()
        .data
    ]

    total_paid = 0
    total_pending = 0
    if occ_ids:
        payments = (
            supabase_admin.table("payments")
            .select("amount_paid, balance, status")
            .in_("occupant_id", occ_ids)
            .execute()
        ).data
        total_paid = sum(
            float(p["amount_paid"] or 0) for p in payments if p["status"] == "Paid"
        )
        total_pending = sum(
            float(p["balance"] or 0) for p in payments if p["status"] != "Paid"
        )

    return {
        "building_name": b.data[0]["name"],
        "total_floors": len(floor_ids),
        "total_rooms": len(room_ids),
        "total_beds": total_decks,
        "occupied_beds": occupied,
        "available_beds": total_decks - occupied,
        "total_occupants": total_occupants,
        "total_paid": total_paid,
        "total_pending": total_pending,
    }