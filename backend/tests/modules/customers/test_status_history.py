"""Tests for customer status history service (unit tests with mocks)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.customers.status_history import CustomerStatusHistoryService


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = MagicMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    return db


@pytest.mark.asyncio
async def test_get_status_history_returns_list(mock_db):
    """get_status_history returns a list."""
    with patch("app.modules.customers.status_history.AuditRepository"):
        svc = CustomerStatusHistoryService(mock_db)
        history = await svc.get_status_history("cust-123")
    assert isinstance(history, list)
    assert len(history) == 0


@pytest.mark.asyncio
async def test_get_status_history_respects_skip_limit(mock_db):
    """get_status_history accepts skip and limit."""
    with patch("app.modules.customers.status_history.AuditRepository"):
        svc = CustomerStatusHistoryService(mock_db)
        await svc.get_status_history("cust-123", skip=5, limit=20)
    mock_db.execute.assert_called_once()
