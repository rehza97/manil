"""Tests for customer approval workflow (unit tests with mocks)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.customers.workflow import CustomerWorkflowService
from app.modules.customers.schemas import ApprovalStatus, CustomerStatus, CustomerType
from app.core.exceptions import NotFoundException, ValidationException


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def mock_customer():
    """Mock customer instance."""
    c = MagicMock()
    c.id = "cust-123"
    c.status = CustomerStatus.PENDING
    c.approval_status = ApprovalStatus.NOT_REQUIRED
    c.customer_type = CustomerType.INDIVIDUAL
    return c


@pytest.mark.asyncio
async def test_submit_for_approval_sets_pending(mock_db, mock_customer):
    """Submit for approval sets approval_status to pending."""
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)
    mock_note = MagicMock()
    mock_note.create_note = AsyncMock()

    with patch("app.modules.customers.workflow.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.workflow.CustomerNoteService", return_value=mock_note), \
         patch("app.modules.customers.workflow.KYCService"):
        svc = CustomerWorkflowService(mock_db)
        svc.repository = mock_repo
        svc.note_service = mock_note
        result = await svc.submit_for_approval("cust-123", "user-1", notes="Ready")

    assert result.approval_status == ApprovalStatus.PENDING
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()


@pytest.mark.asyncio
async def test_submit_for_approval_not_found(mock_db):
    """Submit for nonexistent customer raises NotFoundException."""
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with patch("app.modules.customers.workflow.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.workflow.CustomerNoteService"), \
         patch("app.modules.customers.workflow.KYCService"):
        svc = CustomerWorkflowService(mock_db)
        svc.repository = mock_repo
        with pytest.raises(NotFoundException):
            await svc.submit_for_approval("nonexistent", "user-1")


@pytest.mark.asyncio
async def test_approve_customer_sets_approved(mock_db, mock_customer):
    """Approve sets approval_status to approved."""
    mock_customer.approval_status = ApprovalStatus.PENDING
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)
    mock_kyc = MagicMock()
    mock_status = MagicMock()
    mock_status.kyc_status = "approved"
    mock_status.summary = MagicMock()
    mock_status.summary.can_activate = True
    mock_kyc.get_customer_kyc_status = AsyncMock(return_value=mock_status)
    mock_note = MagicMock()
    mock_note.create_note = AsyncMock()

    with patch("app.modules.customers.workflow.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.workflow.CustomerNoteService", return_value=mock_note), \
         patch("app.modules.customers.workflow.KYCService", return_value=mock_kyc):
        svc = CustomerWorkflowService(mock_db)
        svc.repository = mock_repo
        svc.note_service = mock_note
        svc.kyc_service = mock_kyc
        result = await svc.approve_customer("cust-123", "user-1", notes="OK")

    assert result.approval_status == ApprovalStatus.APPROVED
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reject_customer_sets_rejected_and_inactive(mock_db, mock_customer):
    """Reject sets approval_status rejected and status INACTIVE."""
    mock_customer.approval_status = ApprovalStatus.PENDING
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)
    mock_note = MagicMock()
    mock_note.create_note = AsyncMock()

    with patch("app.modules.customers.workflow.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.workflow.CustomerNoteService", return_value=mock_note), \
         patch("app.modules.customers.workflow.KYCService"):
        svc = CustomerWorkflowService(mock_db)
        svc.repository = mock_repo
        svc.note_service = mock_note
        result = await svc.reject_customer("cust-123", "user-1", reason="Invalid docs")

    assert result.approval_status == ApprovalStatus.REJECTED
    assert result.status == CustomerStatus.INACTIVE
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reject_requires_reason(mock_db, mock_customer):
    """Reject with empty reason raises ValidationException."""
    mock_customer.approval_status = ApprovalStatus.PENDING
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=mock_customer)

    with patch("app.modules.customers.workflow.CustomerRepository", return_value=mock_repo), \
         patch("app.modules.customers.workflow.CustomerNoteService"), \
         patch("app.modules.customers.workflow.KYCService"):
        svc = CustomerWorkflowService(mock_db)
        svc.repository = mock_repo
        with pytest.raises(ValidationException) as exc:
            await svc.reject_customer("cust-123", "user-1", reason="   ")
        assert "reason" in str(exc.value).lower()
