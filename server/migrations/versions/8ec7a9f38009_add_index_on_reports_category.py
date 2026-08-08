"""add index on reports category

Revision ID: 8ec7a9f38009
Revises: fcca6582f99d
Create Date: 2026-08-07 19:04:38.307427

The `category` column on reports was added with index=True on the
model (server/models/report.py), but 6ff385893016_add_category_to_reports.py
only added the column itself, never the index - so a database that's
only ever run through `alembic upgrade head` (rather than
Base.metadata.create_all()) is missing it. Filtering/browsing the
Reports page by section runs a query against this column, so it's
worth having.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ec7a9f38009'
down_revision: Union[str, None] = 'fcca6582f99d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_reports_category'), 'reports', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_category'), table_name='reports')