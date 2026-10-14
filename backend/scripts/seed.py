"""Fills an empty database with demo doctors, posts, follows, likes and comments.

Usage (from the backend folder, after `alembic upgrade head`):
    python -m scripts.seed

Every demo account uses the password: password123
"""

import random
from datetime import date

from app import models
from app.database import SessionLocal
from app.post_helpers import extract_preview_text
from app.security import hash_password
from app.invites import create_invite

DEMO_PASSWORD = "password123"

DOCTORS = [
    ("Asha", "Rao", "Cardiology", 12, "Apollo Hospital", "Chennai", "Tamil Nadu"),
    ("Vikram", "Mehta", "Cardiology", 6, "Apollo Hospital", "Chennai", "Tamil Nadu"),
    ("Neha", "Sharma", "Neurology", 9, "AIIMS", "New Delhi", "Delhi"),
    ("Rahul", "Verma", "Neurology", 4, "Fortis Hospital", "Mumbai", "Maharashtra"),
    ("Priya", "Nair", "Pediatrics", 15, "AIIMS", "New Delhi", "Delhi"),
    ("Arjun", "Iyer", "Orthopedics", 7, "Manipal Hospital", "Bengaluru", "Karnataka"),
    ("Sana", "Khan", "Dermatology", 5, "Fortis Hospital", "Mumbai", "Maharashtra"),
    ("Karan", "Das", "Emergency Medicine", 3, "Manipal Hospital", "Bengaluru", "Karnataka"),
    ("Meera", "Iyer", "Cardiology", 13, "AIIMS", "New Delhi", "Delhi"),
    ("Rohan", "Kulkarni", "Radiology", 5, "Apollo Hospital", "Chennai", "Tamil Nadu"),
    ("Farah", "Siddiqui", "Neurology", 12, "Manipal Hospital", "Bengaluru", "Karnataka"),
    ("Suresh", "Menon", "Cardiology", 21, "Fortis Hospital", "Mumbai", "Maharashtra"),
]

POSTS = [
    ("Young patient, chest pain, normal ECG: what we nearly missed",
     "A 29-year-old came in with intermittent chest pain and a completely normal ECG. "
     "Troponin was borderline. Serial ECGs eventually showed Wellens pattern. "
     "Lesson: one normal ECG doesn't rule out a critical LAD lesion.",
     ["cardiology", "ecg", "case study"]),
    ("When a 'migraine' wasn't a migraine",
     "Thunderclap headache in a patient with a migraine history. CT was negative at 8 hours. "
     "We still did the LP, and it showed xanthochromia. Always respect the thunderclap.",
     ["neurology", "headache"]),
    ("Fever without a focus in infants: how we approach it",
     "Sharing the stepwise approach our pediatric ward follows for febrile infants under 90 days, "
     "including when we skip the LP. Would love to compare protocols.",
     ["pediatrics", "protocols"]),
    ("Night shift lessons from the ED",
     "Three things I wish I knew in my first year: write down every handover, recheck vitals "
     "before discharge, and never ignore a nurse who says 'something feels off'.",
     ["emergency medicine", "residency"]),
    ("Ankle injuries: are we over-imaging?",
     "Applying the Ottawa ankle rules strictly cut our X-ray requests by almost a third "
     "with no missed fractures in the audit period.",
     ["orthopedics", "evidence based medicine"]),
    ("Isotretinoin counselling checklist",
     "A short checklist I go through with every patient before starting isotretinoin, "
     "covering pregnancy prevention, mood monitoring and lab follow-up.",
     ["dermatology", "patient education"]),
    ("Statins in the elderly: how do you decide?",
     "For patients over 80 with no prior events, the evidence is thin. How are others "
     "weighing benefit against pill burden?",
     ["cardiology", "geriatrics", "discussion"]),
    ("Early mobilisation after stroke",
     "Our unit moved to structured mobilisation within 48 hours. Sharing what changed and "
     "where we still struggle.",
     ["neurology", "stroke", "rehabilitation"]),
]

COMMENTS = [
    "Great case, thanks for sharing.",
    "We follow almost the same approach at our hospital.",
    "Very useful for residents. Saving this.",
    "Did you consider repeating the test after 6 hours?",
    "This happened to me last month too.",
]

PROMPTS = [
    ("Share a case", "What's a case from this week that taught you something?", ["case study"]),
    ("Ask your peers", "Is there a clinical question you'd like other doctors' views on?", ["discussion"]),
]


def text_doc(text: str) -> dict:
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def seed():
    random.seed(7)  # same demo data every time

    with SessionLocal() as db:
        if db.query(models.User).count():
            print("The database already has users, so nothing was seeded.")
            return

        password_hash = hash_password(DEMO_PASSWORD)  # hashing is slow, so do it once
        users = []
        for first, last, specialization, years, hospital, city, state in DOCTORS:
            user = models.User(
                email=f"{first.lower()}.{last.lower()}@example.com",
                password_hash=password_hash,
                first_name=first,
                last_name=last,
                specialization=specialization,
                experience_years=years,
                hospital=hospital,
                city=city,
                state=state,
                headline=f"Consultant, {specialization}" if years >= 8 else f"Registrar, {specialization}",
                about=f"{specialization} specialist at {hospital}, {city}.",
            )
            db.add(user)
            users.append(user)
        db.flush()

        posts = []
        for index, (title, body, tags) in enumerate(POSTS):
            content = text_doc(body)
            post = models.Post(
                author_id=users[index % len(users)].id,
                title=title,
                content=content,
                preview_text=extract_preview_text(content),
                tags=tags,
                visibility="connections" if index == 6 else "public",
                is_anonymous=index == 3,
            )
            db.add(post)
            posts.append(post)
        db.flush()

        for user in users:
            for other in random.sample(users, 3):
                if other.id != user.id:
                    db.add(models.Follow(follower_id=user.id, following_id=other.id))
            for post in random.sample(posts, 3):
                db.add(models.Like(user_id=user.id, post_id=post.id))

        for post in posts:
            for author in random.sample(users, 2):
                db.add(models.Comment(post_id=post.id, author_id=author.id, content=text_doc(random.choice(COMMENTS))))

        # A fuller profile for the main demo account.
        asha = users[0]
        db.add_all([
            models.Experience(user_id=asha.id, position="Consultant Cardiologist", organization=asha.hospital,
                              start_date=date(2018, 6, 1), is_current=True),
            models.Experience(user_id=asha.id, position="Senior Resident, Cardiology", organization="AIIMS",
                              start_date=date(2014, 7, 1), end_date=date(2018, 5, 31)),
            models.Education(user_id=asha.id, degree="DM Cardiology", institution="AIIMS, New Delhi",
                             start_year=2011, end_year=2014),
            models.Education(user_id=asha.id, degree="MBBS", institution="Madras Medical College",
                             start_year=2003, end_year=2009),
            models.Publication(user_id=asha.id, title="Wellens syndrome in young adults: a case series",
                               journal="Indian Heart Journal", year=2022),
        ])
        draft = text_doc("Two patients this month with SVT that terminated with a modified Valsalva. Writing up the technique.")
        db.add(models.Post(author_id=asha.id, title="Modified Valsalva: worth teaching every junior",
                           content=draft, preview_text=extract_preview_text(draft), tags=["cardiology"],
                           visibility="private"))

        for title, body, tags in PROMPTS:
            db.add(models.EngagementPrompt(title=title, body=body, suggested_tags=tags))

        db.commit()

        # An invite from the first demo doctor, so the sign-up page shows who invited you.
        _, invite_url = create_invite(db, created_by_id=users[0].id, note="seed")

    print(f"Seeded {len(DOCTORS)} doctors and {len(POSTS)} posts.")
    print(f"Log in as asha.rao@example.com with password: {DEMO_PASSWORD}")
    print(f"Invite link for a new signup: {invite_url}")


if __name__ == "__main__":
    seed()
