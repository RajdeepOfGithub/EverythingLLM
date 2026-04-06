"""add community_benchmarks table

Revision ID: a1b2c3d4e5f6
Revises: 0fa31774436b
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0fa31774436b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'community_benchmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('gpu_model', sa.String(), nullable=False),
        sa.Column('vram_gb', sa.Float(), nullable=False),
        sa.Column('os', sa.String(), nullable=False),
        sa.Column('framework', sa.String(), nullable=False),
        sa.Column('hf_model_id', sa.String(), nullable=False),
        sa.Column('quant', sa.String(), nullable=False),
        sa.Column('context_window', sa.Integer(), nullable=False),
        sa.Column('batch_size', sa.Integer(), nullable=False),
        sa.Column('eval_tps', sa.Float(), nullable=False),
        sa.Column('prompt_tps', sa.Float(), nullable=False),
        sa.Column('run_date', sa.String(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_community_benchmarks_id'), 'community_benchmarks', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_community_benchmarks_id'), table_name='community_benchmarks')
    op.drop_table('community_benchmarks')
