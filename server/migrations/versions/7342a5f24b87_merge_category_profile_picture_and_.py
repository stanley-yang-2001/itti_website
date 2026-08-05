"""merge category, profile picture, and enrollments/payment-intent-index heads

Revision ID: 7342a5f24b87
Revises: 6ff385893016, b7e3f9a1c2d4, f3a29d6c81e0
Create Date: 2026-08-05 19:32:39.911242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7342a5f24b87'
down_revision: Union[str, None] = ('6ff385893016', 'b7e3f9a1c2d4', 'f3a29d6c81e0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass