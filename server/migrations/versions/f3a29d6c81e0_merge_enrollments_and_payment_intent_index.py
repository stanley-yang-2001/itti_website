"""merge enrollments and payment-intent-index branches

Revision ID: f3a29d6c81e0
Revises: d4e8f1a2b6c9, c8e4f1a02b3d
Create Date: 2026-08-01 00:00:00.000000

Two migrations were independently created with the same parent
(9a7c1e2b6f4d, add_donations) instead of one chaining through the
other:
  - a1f9c3d7e5b2 (add_favorite_reports) -> d4e8f1a2b6c9 (add_enrollments)
  - c8e4f1a02b3d (index donations.stripe_payment_intent_id)

That left two divergent heads, which makes `alembic upgrade head` fail
with "Multiple head revisions are present". This is a standard Alembic
merge migration to reconcile them into one linear head - it doesn't
change the schema itself (both branches' changes are unrelated tables/
columns and don't conflict), just the migration graph.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'f3a29d6c81e0'
down_revision: Union[str, Sequence[str], None] = ('d4e8f1a2b6c9', 'c8e4f1a02b3d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass