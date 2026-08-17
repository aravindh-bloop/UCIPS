import random
from datetime import datetime, timedelta, timezone

from app.db.models import Complaint
from app.db.session import SessionLocal
from app.services.clustering import DEMO_WARD_NAME, recompute_all_clusters
from app.services.evidence import get_or_create_evidence
from app.services.project_generation import generate_or_update_project
from app.utils import generate_reference_code

# (lat, lng) jitter radius in degrees (~275m) -- tight enough that each seed group reads as
# one coherent hotspot rather than a diffuse scatter (see clustering.py for why this matters)
JITTER = 0.0025


def _jitter(center_lat: float, center_lng: float) -> tuple[float, float]:
    return (
        center_lat + random.uniform(-JITTER, JITTER),
        center_lng + random.uniform(-JITTER, JITTER),
    )


def _days_ago(max_days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=random.uniform(0, max_days), hours=random.uniform(0, 23))


# hand-crafted synthetic complaint groups: (category, description, severity range, center, count, spread_days)
SEED_GROUPS = [
    (
        "drainage",
        [
            "Stormwater drain is completely blocked, water floods the street every time it rains",
            "Open drain overflowing near the bus stop, terrible smell and mosquito breeding",
            "Drainage water entering ground floor houses during heavy rain",
            "Clogged drain has been overflowing onto the road for over a week",
            "Sewage mixing with rainwater on the main road due to broken drain cover",
        ],
        (4, 5),
        (12.9756, 80.2207),
        18,
        45,
    ),
    (
        "road",
        [
            "Large pothole on the main road, several two-wheelers have skidded here",
            "Road surface has completely eroded near the junction, very dangerous at night",
            "Multiple potholes making the street almost undrivable after last month's rain",
            "Broken road edge causing accidents, no barricade or warning sign",
        ],
        (3, 5),
        (12.9820, 80.2150),
        14,
        30,
    ),
    (
        "streetlight",
        [
            "Streetlight has been off for two weeks, the lane is pitch dark at night",
            "Several streetlights in a row are non-functional, feels unsafe walking here",
            "Streetlight pole is damaged and sparking, needs urgent attention",
        ],
        (2, 4),
        (12.9700, 80.2260),
        10,
        20,
    ),
    (
        "waste_management",
        [
            "Garbage has not been collected in this street for over 10 days",
            "Overflowing garbage bin attracting stray animals and creating a health hazard",
        ],
        (2, 3),
        (12.9780, 80.2100),
        6,
        15,
    ),
]

# scattered, non-clustering noise complaints spread across the ward
NOISE_COMPLAINTS = [
    ("water_supply", "No water supply for the third day this week", 3, (12.9650, 80.2300)),
    ("sanitation", "Public toilet near the market is unusable, no water or cleaning", 2, (12.9900, 80.2050)),
    ("electricity", "Frequent power cuts in the evening, transformer seems to be failing", 3, (12.9600, 80.2180)),
    ("road", "Footpath is broken and overgrown with weeds", 2, (12.9850, 80.2320)),
    ("streetlight", "One streetlight flickering intermittently", 1, (12.9720, 80.2000)),
    ("drainage", "Minor waterlogging near the park entrance after rain", 2, (12.9950, 80.2280)),
    ("waste_management", "Construction debris dumped illegally on the roadside", 2, (12.9670, 80.2350)),
    ("other", "Stray dog menace near the school, several kids chased", 3, (12.9880, 80.2120)),
    ("water_supply", "Water pressure very low in the mornings", 2, (12.9620, 80.2260)),
    ("sanitation", "Open manhole cover near the temple, safety hazard", 4, (12.9930, 80.2190)),
]


def seed_complaints(db) -> int:
    count = 0
    for category, descriptions, severity_range, center, n, spread_days in SEED_GROUPS:
        for _ in range(n):
            lat, lng = _jitter(*center)
            severity = random.randint(*severity_range)
            description = random.choice(descriptions)
            complaint = Complaint(
                reference_code=generate_reference_code(),
                user_id=None,
                channel="text",
                language="en",
                raw_text=description,
                category=category,
                description=description,
                severity=severity,
                lat=lat,
                lng=lng,
                status="processed",
                created_at=_days_ago(spread_days),
            )
            db.add(complaint)
            count += 1

    for category, description, severity, center in NOISE_COMPLAINTS:
        lat, lng = _jitter(*center)
        complaint = Complaint(
            reference_code=generate_reference_code(),
            user_id=None,
            channel="text",
            language="en",
            raw_text=description,
            category=category,
            description=description,
            severity=severity,
            lat=lat,
            lng=lng,
            status="processed",
            created_at=_days_ago(40),
        )
        db.add(complaint)
        count += 1

    db.commit()
    return count


def run():
    db = SessionLocal()
    try:
        existing = db.query(Complaint).filter(Complaint.user_id.is_(None)).count()
        if existing > 0:
            print(f"Seed data already present ({existing} seed complaints found), skipping.")
            return

        n = seed_complaints(db)
        print(f"Seeded {n} synthetic complaints for ward '{DEMO_WARD_NAME}'.")

        clusters = recompute_all_clusters(db)
        print(f"Recomputed clusters: {len(clusters)} hotspot(s) formed.")

        for cluster in clusters:
            evidence = get_or_create_evidence(db, cluster)
            generate_or_update_project(db, cluster, evidence)
        db.commit()
        print(f"Attached evidence + generated candidate projects for {len(clusters)} cluster(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
