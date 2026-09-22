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


def update_building(user_id: str, building_id: str, payload: dict):
    # Verify ownership
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        raise Exception("Building not found or not authorized")

    # Only include fields that were actually sent
    update_data = {}
    for field in ["name", "address", "description"]:
        value = payload.get(field)
        if value is not None:
            update_data[field] = value

    if not update_data:
        return {"message": "Nothing to update"}

    res = (
        supabase_admin.table("buildings")
        .update(update_data)
        .eq("id", building_id)
        .execute()
    )
    return res.data[0] if res.data else {"message": "Updated"}


def get_building_tree(user_id: str, building_id: str):
    """
    Return the full nested structure plus aggregated stats:
    building → floors → rooms → beds → decks
    """
    # Verify ownership
    b = (
        supabase_admin.table("buildings")
        .select("id, name, address, description")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        return None

    building = b.data[0]

    # Floors
    floors = (
        supabase_admin.table("floors")
        .select("id, name, floor_number")
        .eq("building_id", building_id)
        .order("floor_number")
        .execute()
    ).data

    # Aggregates
    total_rooms = 0
    total_beds = 0
    total_decks = 0
    occupied_decks = 0

    for floor in floors:
        rooms = (
            supabase_admin.table("rooms")
            .select("id, name, room_type")
            .eq("floor_id", floor["id"])
            .order("name")
            .execute()
        ).data

        floor_decks = 0
        floor_occupied = 0
        floor_beds = 0

        for room in rooms:
            beds = (
                supabase_admin.table("beds")
                .select("id, name")
                .eq("room_id", room["id"])
                .order("name")
                .execute()
            ).data

            room_decks = 0
            room_occupied = 0

            for bed in beds:
                decks = (
                    supabase_admin.table("decks")
                    .select("id, position, monthly_rate, status")
                    .eq("bed_id", bed["id"])
                    .execute()
                ).data
                order = {"Upper": 0, "Middle": 1, "Lower": 2}
                decks.sort(key=lambda d: order.get(d["position"], 99))
                bed["decks"] = decks

                room_decks += len(decks)
                room_occupied += sum(
                    1 for d in decks if d["status"] == "Occupied"
                )

            room["beds"] = beds
            room["decks_count"] = room_decks
            room["occupied_count"] = room_occupied

            floor_decks += room_decks
            floor_occupied += room_occupied
            floor_beds += len(beds)

        floor["rooms"] = rooms
        floor["rooms_count"] = len(rooms)
        floor["beds_count"] = floor_beds
        floor["decks_count"] = floor_decks
        floor["occupied_count"] = floor_occupied

        total_rooms += len(rooms)
        total_beds += floor_beds
        total_decks += floor_decks
        occupied_decks += floor_occupied

    building["floors"] = floors

    # Occupants count
    occupants = (
        supabase_admin.table("occupants")
        .select("id", count="exact")
        .eq("building_id", building_id)
        .eq("status", "Active")
        .execute()
    )
    total_occupants = occupants.count or 0

    # Financials
    occupant_ids = [
        o["id"]
        for o in supabase_admin.table("occupants")
        .select("id")
        .eq("building_id", building_id)
        .execute()
        .data
    ]

    total_paid = 0
    total_pending = 0
    if occupant_ids:
        pays = (
            supabase_admin.table("payments")
            .select("amount_paid, balance, status")
            .in_("occupant_id", occupant_ids)
            .execute()
        ).data
        total_paid = sum(
            float(p["amount_paid"] or 0)
            for p in pays
            if p["status"] == "Paid"
        )
        total_pending = sum(
            float(p["balance"] or 0)
            for p in pays
            if p["status"] != "Paid"
        )

    building["stats"] = {
        "total_floors": len(floors),
        "total_rooms": total_rooms,
        "total_beds": total_beds,
        "total_decks": total_decks,
        "occupied_decks": occupied_decks,
        "vacant_decks": total_decks - occupied_decks,
        "total_occupants": total_occupants,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "occupancy_rate": round(
            (occupied_decks / total_decks * 100) if total_decks else 0, 1
        ),
    }

    return building


def sync_building(user_id: str, building_id: str, payload: dict):
    """
    Diff the incoming tree against the DB and apply changes:
      - Items with id  → UPDATE
      - Items with no id → INSERT
      - Items in DB but not in payload → DELETE (cascade)
    Returns the fresh tree.
    """
    # Verify ownership
    b = (
        supabase_admin.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not b.data:
        raise Exception("Building not found or not authorized")

    # ---------- 1. Update building basic info ----------
    supabase_admin.table("buildings").update({
        "name": payload["name"],
        "address": payload.get("address"),
        "description": payload.get("description"),
    }).eq("id", building_id).execute()

    # ---------- 2. Floors ----------
    existing_floors = (
        supabase_admin.table("floors")
        .select("id")
        .eq("building_id", building_id)
        .execute()
    ).data
    existing_floor_ids = {f["id"] for f in existing_floors}

    payload_floor_ids = set()

    for floor_idx, floor in enumerate(payload.get("floors", [])):
        floor_id = floor.get("id")

        if floor_id:
            supabase_admin.table("floors").update({
                "name": floor["name"],
                "floor_number": floor_idx + 1,
            }).eq("id", floor_id).execute()
            payload_floor_ids.add(floor_id)
        else:
            res = (
                supabase_admin.table("floors")
                .insert({
                    "building_id": building_id,
                    "name": floor["name"],
                    "floor_number": floor_idx + 1,
                })
                .execute()
            )
            floor_id = res.data[0]["id"]
            payload_floor_ids.add(floor_id)

        # ---------- Rooms per floor ----------
        existing_rooms = (
            supabase_admin.table("rooms")
            .select("id")
            .eq("floor_id", floor_id)
            .execute()
        ).data
        existing_room_ids = {r["id"] for r in existing_rooms}
        payload_room_ids = set()

        for room in floor.get("rooms", []):
            room_id = room.get("id")

            if room_id:
                supabase_admin.table("rooms").update({
                    "name": room["name"],
                    "room_type": room.get("room_type"),
                }).eq("id", room_id).execute()
                payload_room_ids.add(room_id)
            else:
                res = (
                    supabase_admin.table("rooms")
                    .insert({
                        "floor_id": floor_id,
                        "name": room["name"],
                        "room_type": room.get("room_type"),
                    })
                    .execute()
                )
                room_id = res.data[0]["id"]
                payload_room_ids.add(room_id)

            # ---------- Beds per room ----------
            existing_beds = (
                supabase_admin.table("beds")
                .select("id")
                .eq("room_id", room_id)
                .execute()
            ).data
            existing_bed_ids = {b["id"] for b in existing_beds}
            payload_bed_ids = set()

            for bed in room.get("beds", []):
                bed_id = bed.get("id")

                if bed_id:
                    supabase_admin.table("beds").update({
                        "name": bed["name"],
                    }).eq("id", bed_id).execute()
                    payload_bed_ids.add(bed_id)
                else:
                    res = (
                        supabase_admin.table("beds")
                        .insert({
                            "room_id": room_id,
                            "name": bed["name"],
                        })
                        .execute()
                    )
                    bed_id = res.data[0]["id"]
                    payload_bed_ids.add(bed_id)

                # ---------- Decks per bed ----------
                existing_decks = (
                    supabase_admin.table("decks")
                    .select("id, position, status")
                    .eq("bed_id", bed_id)
                    .execute()
                ).data
                existing_deck_by_pos = {d["position"]: d for d in existing_decks}
                payload_positions = set()

                for deck in bed.get("decks", []):
                    pos = deck["position"]
                    payload_positions.add(pos)

                    if pos in existing_deck_by_pos:
                        supabase_admin.table("decks").update({
                            "monthly_rate": deck.get("monthly_rate", 0),
                        }).eq("id", existing_deck_by_pos[pos]["id"]).execute()
                    else:
                        supabase_admin.table("decks").insert({
                            "bed_id": bed_id,
                            "position": pos,
                            "monthly_rate": deck.get("monthly_rate", 0),
                            "status": "Vacant",
                        }).execute()

                # DELETE decks not in payload
                for pos, deck in existing_deck_by_pos.items():
                    if pos not in payload_positions:
                        if deck.get("status") != "Occupied":
                            supabase_admin.table("decks").delete().eq(
                                "id", deck["id"]
                            ).execute()
                        else:
                            raise Exception(
                                f"Cannot remove {pos} deck — it has an occupant."
                            )

            # DELETE beds not in payload
            for bed_id_db in existing_bed_ids:
                if bed_id_db not in payload_bed_ids:
                    decks = (
                        supabase_admin.table("decks")
                        .select("status")
                        .eq("bed_id", bed_id_db)
                        .execute()
                    ).data
                    if any(d["status"] == "Occupied" for d in decks):
                        raise Exception("Cannot remove a bed with an occupant.")
                    supabase_admin.table("beds").delete().eq(
                        "id", bed_id_db
                    ).execute()

        # DELETE rooms not in payload
        for room_id_db in existing_room_ids:
            if room_id_db not in payload_room_ids:
                beds = (
                    supabase_admin.table("beds")
                    .select("id")
                    .eq("room_id", room_id_db)
                    .execute()
                ).data
                bed_ids = [b["id"] for b in beds]
                if bed_ids:
                    decks = (
                        supabase_admin.table("decks")
                        .select("status")
                        .in_("bed_id", bed_ids)
                        .execute()
                    ).data
                    if any(d["status"] == "Occupied" for d in decks):
                        raise Exception("Cannot remove a room with an occupant.")
                supabase_admin.table("rooms").delete().eq(
                    "id", room_id_db
                ).execute()

    # DELETE floors not in payload
    for floor_id_db in existing_floor_ids:
        if floor_id_db not in payload_floor_ids:
            rooms = (
                supabase_admin.table("rooms")
                .select("id")
                .eq("floor_id", floor_id_db)
                .execute()
            ).data
            room_ids = [r["id"] for r in rooms]
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
                        .select("status")
                        .in_("bed_id", bed_ids)
                        .execute()
                    ).data
                    if any(d["status"] == "Occupied" for d in decks):
                        raise Exception("Cannot remove a floor with an occupant.")
            supabase_admin.table("floors").delete().eq(
                "id", floor_id_db
            ).execute()

    # Return fresh tree
    return get_building_tree(user_id, building_id)