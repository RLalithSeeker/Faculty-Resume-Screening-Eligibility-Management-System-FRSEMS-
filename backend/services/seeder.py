import os
import shutil
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import async_session_factory
from models.candidate import Candidate, EligibilityStatus, Qualification, Experience
from models.rule import EligibilityRule, RuleCondition, LogicalOperator, ConditionOperator
from models.resume import Resume, ResumeStatus
from models.specialization import Specialization, SpecializationAlias
from services.rule_engine import evaluate_candidate

async def seed_database_if_empty():
    """Seed initial specializations, rules, and candidates if empty."""
    async with async_session_factory() as db:
        # Check if database is already seeded
        rules_check = await db.execute(select(EligibilityRule))
        if rules_check.scalars().first():
            print("Database already contains rules, skipping seeder.")
            return

        print("Seeding database with mock data...")

        # 1. Seed Specializations
        cse_spec = Specialization(
            id=str(uuid.uuid4()),
            name="Computer Science",
            department="CSE",
            is_allied=False
        )
        db.add(cse_spec)
        
        ece_spec = Specialization(
            id=str(uuid.uuid4()),
            name="Electronics and Communication",
            department="ECE",
            is_allied=True
        )
        db.add(ece_spec)
        
        await db.flush()

        # Seed Aliases
        aliases = [
            SpecializationAlias(id=str(uuid.uuid4()), specialization_id=cse_spec.id, alias="CS"),
            SpecializationAlias(id=str(uuid.uuid4()), specialization_id=cse_spec.id, alias="CSE"),
            SpecializationAlias(id=str(uuid.uuid4()), specialization_id=cse_spec.id, alias="Computer Science"),
            SpecializationAlias(id=str(uuid.uuid4()), specialization_id=ece_spec.id, alias="ECE"),
            SpecializationAlias(id=str(uuid.uuid4()), specialization_id=ece_spec.id, alias="Electronics"),
        ]
        for alias in aliases:
            db.add(alias)
            
        # 2. Seed Eligibility Rules
        rule1 = EligibilityRule(
            id=str(uuid.uuid4()),
            name="Criteria 1 (CSE Core)",
            description="Must have B.Tech, M.Tech, and completed PhD in CSE",
            department="CSE",
            position="Assistant Professor",
            priority=1,
            is_active=True,
            logic_operator=LogicalOperator.AND
        )
        db.add(rule1)
        await db.flush()

        conditions1 = [
            RuleCondition(
                id=str(uuid.uuid4()),
                rule_id=rule1.id,
                field="ug_degree",
                operator=ConditionOperator.EQUALS,
                value="B.Tech.",
                order=0
            ),
            RuleCondition(
                id=str(uuid.uuid4()),
                rule_id=rule1.id,
                field="pg_degree",
                operator=ConditionOperator.EQUALS,
                value="M.Tech.",
                order=1
            ),
            RuleCondition(
                id=str(uuid.uuid4()),
                rule_id=rule1.id,
                field="phd_status",
                operator=ConditionOperator.EQUALS,
                value="completed",
                order=2
            )
        ]
        for cond in conditions1:
            db.add(cond)

        # 3. Seed Candidates and copy mock resumes
        mock_resumes_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tests", "mock_resumes")
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)

        candidates_data = [
            {
                "name": "Dr. Rahul Kumar",
                "email": "rahul.kumar@example.com",
                "phone": "+91 9900112233",
                "current_designation": "Assistant Professor",
                "current_institution": "Woxsen University",
                "total_experience_years": 4.0,
                "phd_status": "COMPLETED",
                "resume_file": "dr_rahul_kumar_eligible.docx",
                "qualifications": [
                    {"level": "UG", "degree_original": "Bachelor of Technology", "degree_normalized": "B.Tech.", "field_original": "Computer Science", "field_normalized": "Computer Science", "institution": "NIT Trichy", "year_of_completion": 2016, "is_allied": False},
                    {"level": "PG", "degree_original": "Master of Technology", "degree_normalized": "M.Tech.", "field_original": "Software Engineering", "field_normalized": "Computer Science", "institution": "BITS Pilani", "year_of_completion": 2018, "is_allied": False},
                    {"level": "PHD", "degree_original": "Ph.D", "degree_normalized": "Ph.D.", "field_original": "Computer Science", "field_normalized": "Computer Science", "institution": "IIT Bombay", "year_of_completion": 2022, "is_allied": False}
                ],
                "experiences": [
                    {"designation": "Assistant Professor", "institution": "Woxsen University", "start_year": 2022, "end_year": 2026, "is_teaching": True}
                ]
            },
            {
                "name": "Prof. Priya Sharma",
                "email": "priya.sharma@example.com",
                "phone": "+91 9988776655",
                "current_designation": "Assistant Professor",
                "current_institution": "Anurag Group of Institutions",
                "total_experience_years": 3.0,
                "phd_status": "PURSUING",
                "resume_file": "prof_priya_sharma_non_eligible.docx",
                "qualifications": [
                    {"level": "UG", "degree_original": "Bachelor of Technology", "degree_normalized": "B.Tech.", "field_original": "Information Technology", "field_normalized": "Computer Science", "institution": "JNTU Hyderabad", "year_of_completion": 2017, "is_allied": False},
                    {"level": "PG", "degree_original": "Master of Technology", "degree_normalized": "M.Tech.", "field_original": "Computer Science", "field_normalized": "Computer Science", "institution": "Osmania University", "year_of_completion": 2019, "is_allied": False},
                    {"level": "PHD", "degree_original": "Ph.D", "degree_normalized": "Ph.D.", "field_original": "Computer Science", "field_normalized": "Computer Science", "institution": "IIIT Hyderabad", "year_of_completion": 2024, "is_allied": False}
                ],
                "experiences": [
                    {"designation": "Assistant Professor", "institution": "Anurag Group of Institutions", "start_year": 2019, "end_year": 2026, "is_teaching": True}
                ]
            },
            {
                "name": "Dr. Sarah Jones",
                "email": "sarah.jones@example.com",
                "phone": "+91 9876543210",
                "current_designation": "Assistant Professor",
                "current_institution": "Mahindra University",
                "total_experience_years": 5.0,
                "phd_status": "COMPLETED",
                "resume_file": "dr_sarah_jones_allied.docx",
                "qualifications": [
                    {"level": "UG", "degree_original": "Bachelor of Technology", "degree_normalized": "B.Tech.", "field_original": "Computer Science", "field_normalized": "Computer Science", "institution": "NIT Calicut", "year_of_completion": 2015, "is_allied": False},
                    {"level": "PG", "degree_original": "Master of Technology", "degree_normalized": "M.Tech.", "field_original": "Information Technology", "field_normalized": "Electronics and Communication", "institution": "JNTU", "year_of_completion": 2017, "is_allied": True},
                    {"level": "PHD", "degree_original": "Ph.D", "degree_normalized": "Ph.D.", "field_original": "Information Technology", "field_normalized": "Electronics and Communication", "institution": "JNTU Hyderabad", "year_of_completion": 2021, "is_allied": True}
                ],
                "experiences": [
                    {"designation": "Assistant Professor", "institution": "Mahindra University", "start_year": 2021, "end_year": 2026, "is_teaching": True}
                ]
            }
        ]

        for cand_info in candidates_data:
            # 3.1 Create candidate
            candidate = Candidate(
                id=str(uuid.uuid4()),
                name=cand_info["name"],
                email=cand_info["email"],
                phone=cand_info["phone"],
                current_designation=cand_info["current_designation"],
                current_institution=cand_info["current_institution"],
                total_experience_years=cand_info["total_experience_years"],
                phd_status=cand_info["phd_status"],
                eligibility_status=EligibilityStatus.PENDING
            )
            db.add(candidate)
            await db.flush()

            # 3.2 Add Qualifications
            for qual in cand_info["qualifications"]:
                q = Qualification(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate.id,
                    level=qual["level"],
                    degree_original=qual["degree_original"],
                    degree_normalized=qual["degree_normalized"],
                    field_original=qual["field_original"],
                    field_normalized=qual["field_normalized"],
                    institution=qual["institution"],
                    year_of_completion=qual["year_of_completion"],
                    is_allied=qual["is_allied"]
                )
                db.add(q)

            # 3.3 Add Experiences
            for exp in cand_info["experiences"]:
                e = Experience(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate.id,
                    designation=exp["designation"],
                    institution=exp["institution"],
                    start_year=exp["start_year"],
                    end_year=exp["end_year"],
                    is_teaching=exp["is_teaching"]
                )
                db.add(e)

            # 3.4 Copy file to uploads and create Resume record
            src_file = os.path.join(mock_resumes_dir, cand_info["resume_file"])
            stored_name = f"{uuid.uuid4()}.docx"
            dest_file = os.path.join(uploads_dir, stored_name)

            if os.path.exists(src_file):
                shutil.copy(src_file, dest_file)
                
                resume = Resume(
                    id=str(uuid.uuid4()),
                    original_filename=cand_info["resume_file"],
                    stored_filename=stored_name,
                    file_hash=str(hash(cand_info["resume_file"])), # Simple placeholder hash for seed
                    file_size=os.path.getsize(dest_file),
                    mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    status=ResumeStatus.COMPLETED,
                    candidate_id=candidate.id,
                    batch_name="Seed Run - Demo Batch"
                )
                db.add(resume)
            
            await db.flush()
            
            # Evaluate eligibility
            await evaluate_candidate(candidate.id, db)

        await db.commit()
        print("Database seeding completed successfully!")
