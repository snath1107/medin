"""Creates a single-use invite link without needing an account (for the very first users).

Usage (from the backend folder):
    python -m scripts.create_invite
    python -m scripts.create_invite --note "Dr. Sharma" --days 30
"""

import argparse

from app.database import SessionLocal
from app.invites import INVITE_EXPIRY_DAYS, create_invite

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a single-use invite link")
    parser.add_argument("--note", help="who the invite is for (just for your records)")
    parser.add_argument("--days", type=int, default=INVITE_EXPIRY_DAYS, help="days until it expires")
    args = parser.parse_args()

    with SessionLocal() as db:
        _, url = create_invite(db, note=args.note, days=args.days)
    print(url)
