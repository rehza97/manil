"""add_http_port_to_container_instances

Revision ID: 041_add_http_port
Revises: 040_create_vps_service_domains
Create Date: 2026-01-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '041_add_http_port'
down_revision = '040_create_vps_service_domains'
branch_labels = None
depends_on = None


def upgrade():
    # Add http_port column to container_instances table
    op.add_column('container_instances', sa.Column('http_port', sa.Integer(), nullable=True))

    # Create index on http_port for faster lookups
    op.create_index('ix_container_instances_http_port', 'container_instances', ['http_port'])


def downgrade():
    # Remove index
    op.drop_index('ix_container_instances_http_port', table_name='container_instances')

    # Remove column
    op.drop_column('container_instances', 'http_port')
