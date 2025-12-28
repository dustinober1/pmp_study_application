"""Add response time to question progress

Revision ID: 003_response_time
Revises: 002_collaboration
Create Date: 2024-12-28 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_response_time'
down_revision: Union[str, None] = '002_collaboration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add last_response_time_seconds column to question_progress table
    op.add_column(
        'question_progress',
        sa.Column('last_response_time_seconds', sa.Float(), nullable=True)
    )


def downgrade() -> None:
    # Remove last_response_time_seconds column from question_progress table
    op.drop_column('question_progress', 'last_response_time_seconds')
