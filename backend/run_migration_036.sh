#!/bin/bash
# Script to run migration 036 to add container_metrics columns

echo "Running migration 036: enhance_container_metrics"
echo "This will add advanced cgroup metrics columns to container_metrics table"
echo ""

cd "$(dirname "$0")"

# Check if alembic is available
if ! command -v alembic &> /dev/null; then
    echo "Error: alembic command not found"
    echo "Please install alembic: pip install alembic"
    exit 1
fi

# Run the migration
echo "Running: alembic upgrade head"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration 036 applied successfully!"
    echo "The container_metrics table now has the following new columns:"
    echo "  - cpu_throttle_periods"
    echo "  - cpu_throttled_time_ms"
    echo "  - cpu_steal_percent"
    echo "  - memory_pressure_some_avg10"
    echo "  - memory_pressure_full_avg10"
    echo "  - oom_kill_count"
    echo "  - network_rx_bytes_per_sec"
    echo "  - network_tx_bytes_per_sec"
    echo "  - block_read_bytes_per_sec"
    echo "  - block_write_bytes_per_sec"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi


