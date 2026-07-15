import os
from docx import Document

def create_resume_docx(filepath: str, name: str, email: str, phone: str, education: list, experience: list):
    doc = Document()
    doc.add_heading(name, level=0)
    
    doc.add_heading("Personal Details", level=1)
    doc.add_paragraph(f"Email: {email}")
    doc.add_paragraph(f"Phone: {phone}")
    doc.add_paragraph("Address: Hyderabad, India")
    
    doc.add_heading("Education", level=1)
    for edu in education:
        doc.add_paragraph(edu)
        
    doc.add_heading("Work Experience", level=1)
    for exp in experience:
        doc.add_paragraph(exp)
        
    doc.save(filepath)
    print(f"Mock resume created: {filepath}")

def generate_all():
    target_dir = os.path.join(os.path.dirname(__file__), "mock_resumes")
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Eligible CSE candidate
    create_resume_docx(
        os.path.join(target_dir, "dr_rahul_kumar_eligible.docx"),
        "Dr. Rahul Kumar",
        "rahul.kumar@example.com",
        "+91 9900112233",
        [
            "Ph.D. in Computer Science — Completed in 2022 from IIT Bombay",
            "Master of Technology (M.Tech.) in Software Engineering — Completed in 2018 from BITS Pilani",
            "Bachelor of Technology (B.Tech.) in Computer Science — Completed in 2016 from NIT Trichy"
        ],
        [
            "Assistant Professor at Woxsen University (2022 - Present)",
            "Research Associate at IIT Bombay (2018 - 2022)"
        ]
    )
    
    # 2. Non-eligible candidate (PhD Pursuing instead of Completed)
    create_resume_docx(
        os.path.join(target_dir, "prof_priya_sharma_non_eligible.docx"),
        "Prof. Priya Sharma",
        "priya.sharma@example.com",
        "+91 9988776655",
        [
            "Ph.D. in Computer Science — Pursuing (Thesis submitted) at IIIT Hyderabad",
            "Master of Technology (M.Tech.) in Computer Science — Completed in 2019 from Osmania University",
            "Bachelor of Technology (B.Tech.) in Information Technology — Completed in 2017 from JNTU"
        ],
        [
            "Assistant Professor at Anurag Group of Institutions (2019 - Present)"
        ]
    )

    # 3. Manual Review candidate (Missing PG degree in qualifications)
    create_resume_docx(
        os.path.join(target_dir, "dr_amit_patel_manual_review.docx"),
        "Dr. Amit Patel",
        "amit.patel@example.com",
        "+91 9123456789",
        [
            "Ph.D. in Computer Engineering — Completed in 2020 from NIT Warangal",
            "Bachelor of Engineering (B.E.) in Electronics — Completed in 2015 from Mumbai University"
        ],
        [
            "Senior Researcher at TCS Innovation Labs (2020 - Present)"
        ]
    )

    # 4. Allied Specialization candidate (M.Tech in Information Technology)
    create_resume_docx(
        os.path.join(target_dir, "dr_sarah_jones_allied.docx"),
        "Dr. Sarah Jones",
        "sarah.jones@example.com",
        "+91 9876543210",
        [
            "Ph.D. in Information Technology — Completed in 2021 from JNTU Hyderabad",
            "Master of Technology (M.Tech.) in Information Technology — Completed in 2017 from JNTU",
            "Bachelor of Technology (B.Tech.) in Computer Science — Completed in 2015 from NIT Calicut"
        ],
        [
            "Assistant Professor at Mahindra University (2021 - Present)"
        ]
    )

    # 5. Low Experience candidate (0 years experience)
    create_resume_docx(
        os.path.join(target_dir, "dr_john_doe_low_experience.docx"),
        "Dr. John Doe",
        "john.doe@example.com",
        "+91 9000100020",
        [
            "Ph.D. in Computer Science — Completed in 2025 from IIT Delhi",
            "Master of Technology (M.Tech.) in Software Engineering — Completed in 2021 from DTU",
            "Bachelor of Technology (B.Tech.) in Computer Science — Completed in 2019 from NSUT"
        ],
        [
            "Fresh Graduate - No professional experience recorded."
        ]
    )

if __name__ == "__main__":
    generate_all()
