"""add password reset codes

Revision ID: 9dd9f4e91099
Revises: 635cd82587f6
Create Date: 2026-08-12 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9dd9f4e91099'
down_revision: Union[str, None] = '635cd82587f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('password_reset_codes',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('code_hash', sa.String(), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('used_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_reset_codes_code_hash'), 'password_reset_codes', ['code_hash'], unique=False)
    op.create_index(op.f('ix_password_reset_codes_user_id'), 'password_reset_codes', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_password_reset_codes_user_id'), table_name='password_reset_codes')
    op.drop_index(op.f('ix_password_reset_codes_code_hash'), table_name='password_reset_codes')
    op.drop_table('password_reset_codes')