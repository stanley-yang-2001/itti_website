"""add enrollments table

Revision ID: d4e8f1a2b6c9
Revises: a1f9c3d7e5b2
Create Date: 2026-07-28 00:00:00.000000

NOTE: chained onto a1f9c3d7e5b2 (add_favorite_reports), not
6ff385893016 (add_category_to_reports) even though the latter's
filename sorts later - that file is empty (no revision/down_revision
at all, so Alembic can't treat it as part of the chain in its current
state). Re-chain this migration once that one is fixed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e8f1a2b6c9'
down_revision: Union[str, None] = 'a1f9c3d7e5b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('enrollments',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('confirmation_code', sa.String(length=32), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('cert_code', sa.String(length=20), nullable=False),
    sa.Column('cert_name', sa.String(length=255), nullable=False),
    sa.Column('tuition_cents', sa.Integer(), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False, server_default='usd'),
    sa.Column('status', sa.String(length=24), nullable=False, server_default='pending'),
    sa.Column('stripe_checkout_session_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
    sa.Column('payment_method_types', sa.String(length=255), nullable=True),
    sa.Column('refunded_cents', sa.Integer(), nullable=True),
    sa.Column('refunded_at', sa.DateTime(), nullable=True),
    sa.Column('stripe_refund_id', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('confirmation_code', name='uq_enrollments_confirmation_code'),
    )
    op.create_index(op.f('ix_enrollments_confirmation_code'), 'enrollments', ['confirmation_code'], unique=True)
    op.create_index(op.f('ix_enrollments_user_id'), 'enrollments', ['user_id'], unique=False)
    op.create_index(op.f('ix_enrollments_cert_code'), 'enrollments', ['cert_code'], unique=False)
    op.create_index(op.f('ix_enrollments_status'), 'enrollments', ['status'], unique=False)
    op.create_index(op.f('ix_enrollments_stripe_checkout_session_id'), 'enrollments', ['stripe_checkout_session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enrollments_stripe_checkout_session_id'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_status'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_cert_code'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_user_id'), table_name='enrollments')
    op.drop_index(op.f('ix_enrollments_confirmation_code'), table_name='enrollments')
    op.drop_table('enrollments')