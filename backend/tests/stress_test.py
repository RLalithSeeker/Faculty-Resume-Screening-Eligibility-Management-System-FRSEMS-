"""
Stress testing script for FRSEMS eligibility rule engine.
Mocks candidate data, qualifications, experiences, specializations, rules, and
runs concurrent evaluation loops to measure latency and database integrity.
"""

import asyncio
import random
import time
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend root to path
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session, init_db, engine
from models.candidate import Candidate, Qualification, Experience, PhDStatus, QualificationLevel, EligibilityStatus
from models.rule import EligibilityRule, RuleCondition, LogicOperator, ConditionOperator
from models.specialization import Specialization
from services.rule_engine import evaluate_candidate


async def setup_mock_rules_and_specializations(db: AsyncSession):
    """Seed base rules and specializations for stress testing."""
    # Seed specializations
    spec_names = ["Computer Science", "Information Security", "Software Engineering", "Data Science"]
    for name in spec_names:
        existing = await db.scalar(select(Specialization).where(Specialization.name == name))
        if not existing:
            db.add(Specialization(name=name, is_allied=False, department="CSE"))
    await db.flush()

    # Create mock rules
    rule = EligibilityRule(
        name="Stress Rule 1 (CSE Core)",
        description="Must have B.Tech, M.Tech, and completed PhD in CSE",
        department="CSE",
        priority=1,
        is_active=True,
        logic_operator=LogicOperator.AND,
        version="1.0"
    )
    db.add(rule)
    await db.flush()

    # Conditions for Rule
    db.add(RuleCondition(rule_id=rule.id, field="ug_degree", operator=ConditionOperator.IN, value=["B.Tech.", "B.E."], order=0))
    db.add(RuleCondition(rule_id=rule.id, field="pg_degree", operator=ConditionOperator.IN, value=["M.Tech.", "M.E."], order=1))
    db.add(RuleCondition(rule_id=rule.id, field="phd_status", operator=ConditionOperator.EQUALS, value="completed", order=2))
    await db.flush()


async def generate_mock_candidates(db: AsyncSession, count: int) -> list[str]:
    """Generate mock candidate records."""
    candidate_ids = []
    
    first_names = ["Ananya", "Rahul", "Priya", "Arun", "Neha", "Amit", "Suresh", "Kavita", "Manish", "Sonal"]
    last_names = ["Rao", "Kumar", "Sharma", "Singh", "Verma", "Gupta", "Patel", "Nair", "Das", "Joshi"]
    institutions = ["Woxsen University", "BITS Pilani", "IIT Bombay", "NIT Trichy", "IIIT Hyderabad"]
    degrees_ug = ["B.Tech.", "B.E.", "B.Sc.", "B.Com."]
    degrees_pg = ["M.Tech.", "M.E.", "M.Sc.", "MBA"]
    fields = ["Computer Science", "Information Technology", "Mechanical Engineering", "Electrical Engineering"]

    for i in range(count):
        name = f"{random.choice(first_names)} {random.choice(last_names)} {i}"
        candidate = Candidate(
            name=name,
            email=f"candidate_{i}_{uuid.uuid4().hex[:6]}@example.com",
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            current_designation=random.choice(["Assistant Professor", "Associate Professor", "Lecturer"]),
            current_institution=random.choice(institutions),
            total_experience_years=float(random.randint(1, 15)),
            phd_status=random.choice([PhDStatus.COMPLETED, PhDStatus.PURSUING, PhDStatus.NOT_FOUND]),
            eligibility_status=EligibilityStatus.PENDING
        )
        db.add(candidate)
        await db.flush()
        candidate_ids.append(candidate.id)

        # Qualifications
        # UG
        db.add(Qualification(
            candidate_id=candidate.id,
            level=QualificationLevel.UG,
            degree_original=random.choice(degrees_ug),
            degree_normalized=random.choice(degrees_ug),
            field_original=random.choice(fields),
            field_normalized=random.choice(fields),
            is_allied=False
        ))
        # PG
        db.add(Qualification(
            candidate_id=candidate.id,
            level=QualificationLevel.PG,
            degree_original=random.choice(degrees_pg),
            degree_normalized=random.choice(degrees_pg),
            field_original=random.choice(fields),
            field_normalized=random.choice(fields),
            is_allied=False
        ))
        
        # Experience
        db.add(Experience(
            candidate_id=candidate.id,
            designation="Assistant Professor",
            institution=candidate.current_institution,
            start_year=2020,
            end_year=2025,
            is_teaching=True
        ))

    await db.flush()
    return candidate_ids


write_lock = asyncio.Lock()


async def worker(candidate_id: str) -> float:
    """Async worker to evaluate a single candidate and record latency."""
    async with write_lock:
        async with async_session() as session:
            start = time.perf_counter()
            await evaluate_candidate(candidate_id, session)
            await session.commit()
            end = time.perf_counter()
            return end - start


async def run_stress_test(num_candidates: int = 500, concurrency: int = 20):
    """Set up DB, seed mock data, and run concurrent rule evaluations."""
    print("Initializing Database...")
    await init_db()

    print("Seeding base rules and specializations...")
    async with async_session() as session:
        await setup_mock_rules_and_specializations(session)
        await session.commit()

    print(f"Generating {num_candidates} mock candidates...")
    async with async_session() as session:
        candidate_ids = await generate_mock_candidates(session, num_candidates)
        await session.commit()

    print(f"Starting stress test: Evaluating {num_candidates} candidates with concurrency level {concurrency}...")
    start_total = time.perf_counter()
    
    # Process candidates in batches to respect concurrency limits
    sem = asyncio.Semaphore(concurrency)
    latencies = []

    async def sem_worker(cid):
        async with sem:
            latency = await worker(cid)
            latencies.append(latency)

    tasks = [asyncio.create_task(sem_worker(cid)) for cid in candidate_ids]
    await asyncio.gather(*tasks)

    end_total = time.perf_counter()
    total_time = end_total - start_total

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    throughput = num_candidates / total_time

    print("\n" + "="*40)
    print("STRESS TEST RESULTS")
    print("="*40)
    print(f"Total Candidates Evaluated : {num_candidates}")
    print(f"Concurrency Level          : {concurrency}")
    print(f"Total Test Execution Time   : {total_time:.2f} seconds")
    print(f"Average Evaluation Latency  : {avg_latency*1000:.2f} ms")
    print(f"System Throughput          : {throughput:.2f} candidates/sec")
    print("="*40)


if __name__ == "__main__":
    asyncio.run(run_stress_test())
