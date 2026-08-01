"""add user profile picture columns

Revision ID: b7e3f9a1c2d4
Revises: d4e8f1a2b6c9
Create Date: 2026-08-01 00:00:00.000000

NOTE ON MIGRATION HISTORY: at the time this migration was written, the
chain already had two heads (c8e4f1a02b3d and d4e8f1a2b6c9, both
branching from 9a7c1e2b6f4d) and a broken, empty migration file
(6ff385893016_add_category_to_reports.py, which has no revision/
down_revision at all and makes `alembic upgrade head` fail outright
with "Could not determine revision id from filename"). Neither issue
was introduced by this migration or is fixed by it - both predate it
and are unrelated to the profile-picture feature this migration
supports. They'll need a merge migration (for the two heads) and a
reconstructed or removed 6ff385893016 file before `alembic upgrade
head` will run cleanly again.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e3f9a1c2d4'
down_revision: Union[str, None] = 'd4e8f1a2b6c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # picture_url (existing column) stays the public-facing value the
    # frontend reads directly (an external Google avatar URL, or - once
    # someone uploads their own - /api/users/<id>/picture). picture_path
    # is the internal storage path/key for an uploaded picture (mirrors
    # Report.image_path), kept separate so an external Google URL is
    # never mistaken for a local file to serve or delete.
    op.add_column('users', sa.Column('picture_path', sa.String(), nullable=True))
    op.add_column('users', sa.Column('picture_mime_type', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'picture_mime_type')
    op.drop_column('users', 'picture_path')