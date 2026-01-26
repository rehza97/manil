"""Tests for customer data validators."""
import pytest

from app.core.exceptions import ValidationException
from app.modules.customers.validators import (
    validate_email_format,
    validate_phone_number,
    validate_tax_id,
    validate_company_data,
    validate_customer_data,
)


class TestValidateEmailFormat:
    """Tests for validate_email_format."""

    def test_valid_email_passes(self):
        """Valid email format passes."""
        validate_email_format("user@example.com")
        validate_email_format("test.user+tag@domain.co.uk")

    def test_empty_email_raises(self):
        """Empty email raises ValidationException."""
        with pytest.raises(ValidationException) as exc:
            validate_email_format("")
        assert "required" in str(exc.value).lower()

    def test_invalid_format_raises(self):
        """Invalid format raises ValidationException."""
        with pytest.raises(ValidationException) as exc:
            validate_email_format("not-an-email")
        assert "Invalid" in str(exc.value) or "format" in str(exc.value).lower()

    def test_double_at_raises(self):
        """Email with two @ raises."""
        with pytest.raises(ValidationException):
            validate_email_format("user@@domain.com")


class TestValidatePhoneNumber:
    """Tests for validate_phone_number."""

    def test_valid_phone_passes(self):
        """Valid phone passes."""
        validate_phone_number("+33123456789")
        validate_phone_number("1234567890")
        validate_phone_number("+44 20 7123 4567")

    def test_empty_phone_raises(self):
        """Empty phone raises ValidationException."""
        with pytest.raises(ValidationException) as exc:
            validate_phone_number("")
        assert "required" in str(exc.value).lower()

    def test_too_short_raises(self):
        """Phone with < 7 digits raises."""
        with pytest.raises(ValidationException) as exc:
            validate_phone_number("123456")
        assert "7" in str(exc.value) or "digit" in str(exc.value).lower()

    def test_non_digit_raises(self):
        """Phone with letters raises."""
        with pytest.raises(ValidationException):
            validate_phone_number("+33 12 34 56 78 ab")


class TestValidateTaxId:
    """Tests for validate_tax_id."""

    def test_valid_tax_id_passes(self):
        """Valid tax ID passes."""
        validate_tax_id("12-3456789")
        validate_tax_id("FR123456789")

    def test_empty_tax_id_raises(self):
        """Empty tax_id raises ValidationException."""
        with pytest.raises(ValidationException) as exc:
            validate_tax_id("")
        assert "required" in str(exc.value).lower()

    def test_invalid_chars_raises(self):
        """Tax ID with invalid chars raises."""
        with pytest.raises(ValidationException):
            validate_tax_id("12@3456789")


class TestValidateCompanyData:
    """Tests for validate_company_data."""

    def test_valid_company_passes(self):
        """Valid company name passes."""
        validate_company_data("Acme Corp")

    def test_empty_company_raises(self):
        """Empty company name raises ValidationException."""
        with pytest.raises(ValidationException) as exc:
            validate_company_data("")
        assert "Company" in str(exc.value) or "required" in str(exc.value).lower()

    def test_company_with_tax_id_validates_both(self):
        """Company with tax_id validates both."""
        validate_company_data("Acme", tax_id="12-3456789")


class TestValidateCustomerData:
    """Tests for validate_customer_data."""

    def test_valid_individual_passes(self):
        """Valid individual customer data passes."""
        validate_customer_data(
            email="user@example.com",
            phone="+33123456789",
            customer_type="individual",
        )

    def test_valid_corporate_with_company_passes(self):
        """Valid corporate with company_name passes."""
        validate_customer_data(
            email="user@example.com",
            phone="+33123456789",
            customer_type="corporate",
            company_name="Acme",
        )

    def test_corporate_without_company_raises(self):
        """Corporate without company_name raises."""
        with pytest.raises(ValidationException):
            validate_customer_data(
                email="user@example.com",
                phone="+33123456789",
                customer_type="corporate",
                company_name=None,
            )
