"""add category to reports

Revision ID: 6ff385893016
Revises: 9a7c1e2b6f4d
Create Date: 2026-07-25 12:00:00.000000

Adds the required `category` column to reports - every report must
belong to one of the 10 fixed Reports page sections (see
models.report.REPORT_CATEGORIES).

Chained after 9a7c1e2b6f4d (add_donations) rather than directly after
3dd530f4f775 (add_peer_review_workflow): both this migration and
9a7c1e2b6f4d initially branched from 3dd530f4f775, but 9a7c1e2b6f4d was
already pushed first, so this one re-parents onto it to keep history
linear instead of requiring an Alembic merge migration.

Existing rows (uploaded before this column existed) are backfilled to
"Research Publication" via server_default, since it's the most
general/catch-all of the 10 categories. This is a placeholder, not a
real categorization - if you have existing published reports, review
and manually correct their category via an admin action or a follow-up
data migration once you know which section each one actually belongs
in.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ff385893016'
down_revision: Union[str, None] = '9a7c1e2b6f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'reports',
        sa.Column('category', sa.String(), nullable=False, server_default='Research Publication'),
    )


def downgrade() -> None:
    op.drop_column('reports', 'category')