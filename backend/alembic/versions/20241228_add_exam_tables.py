"""Add exam tables

Revision ID: 20241228_add_exam_tables
Revises:
Create Date: 2024-12-28 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_exam'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create exam_sessions table
    op.create_table(
        'exam_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), server_default='in_progress', nullable=False),
        sa.Column('total_time_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('questions_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('correct_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('current_question_index', sa.Integer(), server_default='0', nullable=False),
        sa.Column('time_expired', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.Index('ix_exam_sessions_user_id', 'user_id'),
        sa.Index('ix_exam_sessions_status', 'status'),
    )

    # Create exam_answers table
    op.create_table(
        'exam_answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('exam_session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('question_index', sa.Integer(), nullable=False),
        sa.Column('selected_answer', sa.String(1), nullable=False),
        sa.Column('is_correct', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('time_spent_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_flagged', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['exam_session_id'], ['exam_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.Index('ix_exam_answers_exam_session_id', 'exam_session_id'),
    )

    # Create exam_reports table
    op.create_table(
        'exam_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('exam_session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score_percentage', sa.Float(), nullable=False),
        sa.Column('domain_breakdown', postgresql.JSONB(), nullable=False),
        sa.Column('task_breakdown', postgresql.JSONB(), nullable=True),
        sa.Column('recommendations', postgresql.JSONB(), nullable=False),
        sa.Column('strengths', postgresql.JSONB(), nullable=False),
        sa.Column('weaknesses', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['exam_session_id'], ['exam_sessions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('exam_session_id', name='uq_exam_reports_exam_session_id'),
        sa.Index('ix_exam_reports_exam_session_id', 'exam_session_id'),
    )


def downgrade() -> None:
    op.drop_index('ix_exam_reports_exam_session_id', table_name='exam_reports')
    op.drop_table('exam_reports')

    op.drop_index('ix_exam_answers_exam_session_id', table_name='exam_answers')
    op.drop_table('exam_answers')

    op.drop_index('ix_exam_sessions_status', table_name='exam_sessions')
    op.drop_index('ix_exam_sessions_user_id', table_name='exam_sessions')
    op.drop_table('exam_sessions')
