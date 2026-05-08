
import requests
import uuid

cards_to_remove = [
    "2a7aa8e7-fd0b-4aff-958e-90a72b9b180a",
    "fb754aed-004b-4289-829c-acc18e101145",
    "6076f908-4d9c-4b47-a42c-ca64da719e48",
    "3888ac1e-1766-45cb-b525-dcf95df319f8",
    "53647258-9939-492a-8552-3f64e05bb6a3",
    "af608550-3914-4a30-9608-68ad88fc6534"
]

base_url = "http://127.0.0.1:8000"

for card_id in cards_to_remove:
    print(f"Updating card {card_id}...")
    try:
        # Assuming there's a PATCH /cards/{id} endpoint
        # The tool snaps_update_card likely maps to an endpoint or direct DB call.
        # Let's try to use the MCP server directly if we can run it?
        # No, let's try to find the endpoint in main.py.
        pass
    except Exception as e:
        print(f"Error: {e}")
