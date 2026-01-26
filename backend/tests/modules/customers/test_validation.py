"""Tests for customer status transition validation."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.exceptions import ValidationException
from app.modules.customers.validation import (
    validate_status_transition,
    check_kyc_requirements,
    can_transition_to,
    STATUS_TRANSITIONS,
)
from app.modules.customers.schemas import CustomerStatus


class TestValidateStatusTransition:
    """Tests for validate_status_transition."""

    def test_valid_transition_pending_to_active_with_reason(self):
        """Valid transition PENDING -> ACTIVE with reason."""
        validate_status_transition(
            CustomerStatus.PENDING,
            CustomerStatus.ACTIVE,
            reason="KYC approved",
        )

    def test_valid_transition_pending_to_inactive_with_reason(self):
        """Valid transition PENDING -> INACTIVE with reason."""
        validate_status_transition(
            CustomerStatus.PENDING,
            CustomerStatus.INACTIVE,
            reason="Customer requested deactivation",
        )

    def test_valid_transition_active_to_suspended_with_reason(self):
        """Valid transition ACTIVE -> SUSPENDED with reason."""
        validate_status_transition(
            CustomerStatus.ACTIVE,
            CustomerStatus.SUSPENDED,
            reason="Payment overdue",
        )

    def test_valid_transition_suspended_to_active_with_reason(self):
        """Valid transition SUSPENDED -> ACTIVE with reason."""
        validate_status_transition(
            CustomerStatus.SUSPENDED,
            CustomerStatus.ACTIVE,
            reason="Issue resolved",
        )

    def test_valid_transition_inactive_to_pending_with_reason(self):
        """Valid transition INACTIVE -> PENDING (réactivation)."""
        validate_status_transition(
            CustomerStatus.INACTIVE,
            CustomerStatus.PENDING,
            reason="Reactivation requested",
        )

    def test_invalid_transition_pending_to_suspended(self):
        """Invalid transition PENDING -> SUSPENDED not in STATUS_TRANSITIONS."""
        with pytest.raises(ValidationException) as exc_info:
            validate_status_transition(
                CustomerStatus.PENDING,
                CustomerStatus.SUSPENDED,
                reason="Some reason",
            )
        assert "Cannot transition" in str(exc_info.value)
        assert "pending" in str(exc_info.value).lower()
        assert "suspended" in str(exc_info.value).lower()

    def test_missing_reason_raises(self):
        """Transition without reason raises ValidationException."""
        with pytest.raises(ValidationException) as exc_info:
            validate_status_transition(
                CustomerStatus.PENDING,
                CustomerStatus.ACTIVE,
                reason=None,
            )
        assert "Reason is required" in str(exc_info.value)

    def test_empty_reason_raises(self):
        """Transition with empty reason raises ValidationException."""
        with pytest.raises(ValidationException):
            validate_status_transition(
                CustomerStatus.PENDING,
                CustomerStatus.ACTIVE,
                reason="   ",
            )

    def test_whitespace_only_reason_raises(self):
        """Transition with whitespace-only reason raises."""
        with pytest.raises(ValidationException):
            validate_status_transition(
                CustomerStatus.ACTIVE,
                CustomerStatus.SUSPENDED,
                reason="\t\n",
            )


@pytest.mark.asyncio
class TestCheckKycRequirements:
    """Tests for check_kyc_requirements (async, uses mocks)."""

    async def test_kyc_incomplete_blocks_activation(self):
        """check_kyc_requirements raises when KYC not approved."""
        mock_db = AsyncMock()
        mock_kyc = MagicMock()
        mock_status = MagicMock()
        mock_status.kyc_status = "pending"
        mock_status.missing_documents = []
        mock_status.summary = MagicMock()
        mock_status.summary.can_activate = False
        mock_status.summary.approved_documents = 0
        mock_status.summary.pending_documents = 1
        mock_status.summary.rejected_documents = 0
        mock_kyc.get_customer_kyc_status = AsyncMock(return_value=mock_status)

        with patch(
            "app.modules.customers.validation.KYCService",
            return_value=mock_kyc,
        ):
            with pytest.raises(ValidationException) as exc_info:
                await check_kyc_requirements(
                    mock_db,
                    "customer-123",
                    CustomerStatus.ACTIVE,
                )
            assert "Cannot activate" in str(exc_info.value)
            assert "KYC" in str(exc_info.value)

    async def test_kyc_approved_allows_activation(self):
        """check_kyc_requirements passes when KYC approved."""
        mock_db = AsyncMock()
        mock_kyc = MagicMock()
        mock_status = MagicMock()
        mock_status.kyc_status = "approved"
        mock_status.missing_documents = []
        mock_status.summary = MagicMock()
        mock_status.summary.can_activate = True
        mock_kyc.get_customer_kyc_status = AsyncMock(return_value=mock_status)

        with patch(
            "app.modules.customers.validation.KYCService",
            return_value=mock_kyc,
        ):
            await check_kyc_requirements(
                mock_db,
                "customer-123",
                CustomerStatus.ACTIVE,
            )
        mock_kyc.get_customer_kyc_status.assert_called_once_with("customer-123")

    async def test_non_active_target_skips_kyc_check(self):
        """check_kyc_requirements does not call KYC for non-ACTIVE target."""
        mock_db = AsyncMock()
        mock_kyc = MagicMock()
        mock_kyc.get_customer_kyc_status = AsyncMock()

        with patch(
            "app.modules.customers.validation.KYCService",
            return_value=mock_kyc,
        ):
            await check_kyc_requirements(
                mock_db,
                "customer-123",
                CustomerStatus.INACTIVE,
            )
        mock_kyc.get_customer_kyc_status.assert_not_called()


@pytest.mark.asyncio
class TestCanTransitionTo:
    """Tests for can_transition_to."""

    async def test_can_transition_returns_true_when_valid(self):
        """can_transition_to returns (True, None) when validation passes."""
        mock_db = AsyncMock()
        customer = MagicMock()
        customer.id = "cust-1"
        customer.status = CustomerStatus.PENDING

        with patch(
            "app.modules.customers.validation.check_kyc_requirements",
            new_callable=AsyncMock,
        ) as mock_kyc:
            mock_kyc.return_value = None
            ok, err = await can_transition_to(
                mock_db,
                customer,
                CustomerStatus.ACTIVE,
                reason="OK",
            )
            assert ok is True
            assert err is None
            mock_kyc.assert_called_once()

    async def test_can_transition_returns_false_on_validation_error(self):
        """can_transition_to returns (False, msg) on ValidationException."""
        mock_db = AsyncMock()
        customer = MagicMock()
        customer.id = "cust-1"
        customer.status = CustomerStatus.PENDING

        with patch(
            "app.modules.customers.validation.check_kyc_requirements",
            new_callable=AsyncMock,
            side_effect=ValidationException("KYC incomplete"),
        ):
            ok, err = await can_transition_to(
                mock_db,
                customer,
                CustomerStatus.ACTIVE,
                reason="OK",
            )
            assert ok is False
            assert "KYC incomplete" in (err or "")

    async def test_can_transition_invalid_transition_returns_false(self):
        """can_transition_to returns False for invalid transition."""
        mock_db = AsyncMock()
        customer = MagicMock()
        customer.status = CustomerStatus.PENDING

        ok, err = await can_transition_to(
            mock_db,
            customer,
            CustomerStatus.SUSPENDED,
            reason="Why",
        )
        assert ok is False
        assert err is not None
