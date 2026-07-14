"""Models package — import all models so Base.metadata sees them."""

from models.resume import Resume  # noqa: F401
from models.candidate import Candidate, Qualification, Experience  # noqa: F401
from models.rule import EligibilityRule, RuleCondition  # noqa: F401
from models.specialization import Specialization, SpecializationAlias  # noqa: F401
from models.evaluation import EvaluationResult  # noqa: F401
from models.audit import AuditLog  # noqa: F401
