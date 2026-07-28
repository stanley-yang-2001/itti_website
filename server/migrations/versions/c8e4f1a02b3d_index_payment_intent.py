"""index donations.stripe_payment_intent_id

Revision ID: c8e4f1a02b3d
Revises: 9a7c1e2b6f4d
Create Date: 2026-07-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c8e4f1a02b3d'
down_revision: Union[str, None] = '9a7c1e2b6f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The donate flow moved from Stripe Checkout Sessions to an embedded
    # Payment Element, so PaymentIntent id is now the column donations are
    # actually looked up by (webhook events, the thank-you page's status
    # check) - it was previously informational-only and unindexed.
    op.create_index(op.f('ix_donations_stripe_payment_intent_id'), 'donations', ['stripe_payment_intent_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_donations_stripe_payment_intent_id'), table_name='donations')