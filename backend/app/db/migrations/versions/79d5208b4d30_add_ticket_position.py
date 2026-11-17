
"""add ticket position

Revision ID: 79d5208b4d30
Revises: 3c9e179b9d30
Create Date: 2026-11-17 16:07:41.838930

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "79d5208b4d30"
down_revision: Union[str, Sequence[str], None] = "3c9e179b9d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Initially allow NULL so existing tickets are preserved.
    op.add_column(
        "tickets",
        sa.Column("position", sa.Integer(), nullable=True),
    )

    # Assign an initial position to every existing ticket.
    op.execute(
        """
        WITH ranked_tickets AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY status
                    ORDER BY created_at ASC, id ASC
                ) - 1 AS new_position
            FROM tickets
        )
        UPDATE tickets
        SET position = ranked_tickets.new_position
        FROM ranked_tickets
        WHERE tickets.id = ranked_tickets.id
        """
    )

    # All existing tickets now have a position.
    op.alter_column(
        "tickets",
        "position",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.create_index(
        op.f("ix_tickets_position"),
        "tickets",
        ["position"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_tickets_position"),
        table_name="tickets",
    )

    op.drop_column("tickets", "position")