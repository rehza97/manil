"""Tests for customer profile service (unit tests with mocks)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.customers.profile_service import CustomerProfileService
from app.modules.customers.schemas import CustomerType
from app.core.exceptions import NotFoundException


@pytest.fixture
def mock_db():
    """Mock async database session."""
    return MagicMock()


@pytest.fixture
def mock_customer():
    """Mock customer with partial data."""
    c = MagicMock()
    c.id = "cust-123"
    c.name = "Test"
    c.email = "a@b.com"
    c.phone = "+33123456789"
    c.address = "123 Main"
    c.city = "Paris"
    c.state = None
    c.country = "FR"
    c.postal_code = None
    c.customer_type = CustomerType.INDIVIDUAL
    c.company_name = None
    c.tax_id = None
    return c


@pytest.mark.asyncio
async def test_get_profile_completeness_returns_structure(mock_db, mock_customer):
    """get_profile_completeness returns completeness with scores and missing_fields."""
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)
    mock_kyc = MagicMock()
    mock_status = MagicMock()
    mock_status.required_documents = []
    mock_status.documents = []
    mock_status.missing_documents = []
    mock_kyc.get_customer_kyc_status = AsyncMock(return_value=mock_status)

    with patch("app.modules.customers.profile_service.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.profile_service.KYCService", return_value=mock_kyc):
        svc = CustomerProfileService(mock_db)
        svc.repository = mock_repo
        svc.kyc_service = mock_kyc
        completeness = await svc.get_profile_completeness("cust-123")

    assert completeness.customer_id == "cust-123"
    assert 0 <= completeness.completeness_percentage <= 100
    assert isinstance(completeness.missing_fields, list)


@pytest.mark.asyncio
async def test_get_missing_fields_returns_list(mock_db, mock_customer):
    """get_missing_fields returns list of missing field names."""
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)
    mock_kyc = MagicMock()
    mock_status = MagicMock()
    mock_status.required_documents = []
    mock_status.documents = []
    mock_status.missing_documents = []
    mock_kyc.get_customer_kyc_status = AsyncMock(return_value=mock_status)

    with patch("app.modules.customers.profile_service.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.profile_service.KYCService", return_value=mock_kyc):
        svc = CustomerProfileService(mock_db)
        svc.repository = mock_repo
        svc.kyc_service = mock_kyc
        missing = await svc.get_missing_fields("cust-123")
    assert isinstance(missing, list)


@pytest.mark.asyncio
async def test_profile_completeness_not_found(mock_db):
    """Nonexistent customer raises NotFoundException."""
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with patch("app.modules.customers.profile_service.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.profile_service.KYCService"):
        svc = CustomerProfileService(mock_db)
        svc.repository = mock_repo
        with pytest.raises(NotFoundException):
            await svc.get_profile_completeness("nonexistent-id")
