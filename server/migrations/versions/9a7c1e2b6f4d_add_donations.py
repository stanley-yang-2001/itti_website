"""add donations table

Revision ID: 9a7c1e2b6f4d
Revises: 3dd530f4f775
Create Date: 2026-07-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a7c1e2b6f4d'
down_revision: Union[str, None] = '3dd530f4f775'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('donations',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('confirmation_code', sa.String(length=32), nullable=False),
    sa.Column('first_name', sa.String(length=120), nullable=False),
    sa.Column('last_name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('amount_cents', sa.Integer(), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False, server_default='usd'),
    sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
    sa.Column('stripe_checkout_session_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
    sa.Column('payment_method_types', sa.String(length=255), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('confirmation_code', name='uq_donations_confirmation_code'),
    )
    op.create_index(op.f('ix_donations_confirmation_code'), 'donations', ['confirmation_code'], unique=True)
    op.create_index(op.f('ix_donations_email'), 'donations', ['email'], unique=False)
    op.create_index(op.f('ix_donations_status'), 'donations', ['status'], unique=False)
    op.create_index(op.f('ix_donations_stripe_checkout_session_id'), 'donations', ['stripe_checkout_session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_donations_stripe_checkout_session_id'), table_name='donations')
    op.drop_index(op.f('ix_donations_status'), table_name='donations')
    op.drop_index(op.f('ix_donations_email'), table_name='donations')
    op.drop_index(op.f('ix_donations_confirmation_code'), table_name='donations')
    op.drop_table('donations')