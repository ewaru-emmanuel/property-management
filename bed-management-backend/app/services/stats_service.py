from app.database import supabase_admin


def get_building_stats(user_id: str, building_id: str):
    # Uses the Postgres function we created earlier
    res = supabase_admin.rpc(
        "get_building_stats",
        {"b_id": building_id, "u_id": user_id},
    ).execute()

    if not res.data:
        return None

    return res.data