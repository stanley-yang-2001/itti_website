"""add fellows table

Revision ID: fcca6582f99d
Revises: 7342a5f24b87
Create Date: 2026-08-06 19:12:32.585580

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fcca6582f99d'
down_revision: Union[str, None] = '7342a5f24b87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('fellows',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('level', sa.String(length=10), nullable=False),
    sa.Column('bio', sa.Text(), nullable=False),
    sa.Column('photo_path', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('fellows')