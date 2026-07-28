"""add peer review workflow to reports

Revision ID: 3dd530f4f775
Revises: 1b00e3b253a1
Create Date: 2026-07-23 12:00:00.000000

Adds the peer-review workflow on top of the existing reports table:
  - reports.resubmission_note, review_status, version, updated_at
  - the new report_reviews table

Chained after 1b00e3b253a1 (add_saved_charts) rather than directly
after c37ebaee3d80 (add_reports_table): both this migration and
1b00e3b253a1 initially branched from c37ebaee3d80, but 1b00e3b253a1 was
already pushed first, so this one re-parents onto it to keep history
linear instead of requiring an Alembic merge migration.

Existing rows get review_status='published' via server_default at
column-creation time, so reports that were already live before this
migration don't disappear from the public Reports page or get stuck
waiting for peer review after the fact.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3dd530f4f775'
down_revision: Union[str, None] = '1b00e3b253a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reports', sa.Column('resubmission_note', sa.Text(), nullable=True))
    op.add_column(
        'reports',
        sa.Column('review_status', sa.String(), nullable=False, server_default='published'),
    )
    op.add_column('reports', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    op.add_column(
        'reports',
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_reports_review_status'), 'reports', ['review_status'], unique=False)

    op.create_table('report_reviews',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('report_id', sa.Integer(), nullable=False),
    sa.Column('reviewer_id', sa.Integer(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('decision', sa.String(), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ),
    sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('report_id', 'reviewer_id', 'version', name='uq_report_reviewer_version')
    )
    op.create_index(op.f('ix_report_reviews_report_id'), 'report_reviews', ['report_id'], unique=False)
    op.create_index(op.f('ix_report_reviews_reviewer_id'), 'report_reviews', ['reviewer_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_report_reviews_reviewer_id'), table_name='report_reviews')
    op.drop_index(op.f('ix_report_reviews_report_id'), table_name='report_reviews')
    op.drop_table('report_reviews')

    op.drop_index(op.f('ix_reports_review_status'), table_name='reports')
    op.drop_column('reports', 'updated_at')
    op.drop_column('reports', 'version')
    op.drop_column('reports', 'review_status')
    op.drop_column('reports', 'resubmission_note')