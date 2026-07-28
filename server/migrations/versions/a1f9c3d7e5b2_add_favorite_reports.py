"""add favorite reports

Revision ID: a1f9c3d7e5b2
Revises: 9a7c1e2b6f4d
Create Date: 2026-07-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f9c3d7e5b2'
down_revision: Union[str, None] = '9a7c1e2b6f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('favorite_reports',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('report_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'report_id', name='uq_favorite_reports_user_report')
    )
    op.create_index(op.f('ix_favorite_reports_user_id'), 'favorite_reports', ['user_id'], unique=False)
    op.create_index(op.f('ix_favorite_reports_report_id'), 'favorite_reports', ['report_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_favorite_reports_report_id'), table_name='favorite_reports')
    op.drop_index(op.f('ix_favorite_reports_user_id'), table_name='favorite_reports')
    op.drop_table('favorite_reports')