"""Add tier system infrastructure

Revision ID: 004_tier_system
Revises: 003_response_time
Create Date: 2024-12-28 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004_tier_system'
down_revision: Union[str, None] = '003_response_time'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add tier column to users table
    op.add_column(
        'users',
        sa.Column('tier', sa.String(20), nullable=False, server_default='public', index=True)
    )

    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='cascade'), nullable=False, index=True),
        sa.Column('paypal_subscription_id', sa.String(255), unique=True, index=True, nullable=True),
        sa.Column('paypal_plan_id', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('period', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create usage_tracking table
    op.create_table(
        'usage_tracking',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='cascade'), nullable=False, index=True),
        sa.Column('tracking_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('flashcards_viewed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('questions_answered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('mini_exams_taken', sa.Integer(), server_default='0', nullable=False),
        sa.Column('full_exams_taken', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    # Drop usage_tracking table
    op.drop_table('usage_tracking')

    # Drop subscriptions table
    op.drop_table('subscriptions')

    # Remove tier column from users table
    op.drop_column('users', 'tier')
