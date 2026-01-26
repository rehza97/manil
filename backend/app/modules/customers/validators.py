"""Advanced data validators for customer information."""

import re
from typing import Optional
from pydantic import ValidationError

from app.core.exceptions import ValidationException


# Email validation regex (more strict than default)
EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

# Phone number patterns by country (simplified)
PHONE_PATTERNS = {
    "US": r'^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$',
    "FR": r'^\+?33[1-9]\d{8}$',
    "UK": r'^\+?44\d{10,11}$',
    "DE": r'^\+?49\d{10,11}$',
    "DZ": r'^\+?213[5-9]\d{8}$',
    "MA": r'^\+?212[5-9]\d{8}$',
    "TN": r'^\+?216[2-9]\d{7}$',
}

# Tax ID patterns by country
TAX_ID_PATTERNS = {
    "US": r'^\d{2}-\d{7}$',  # EIN format
    "FR": r'^FR\d{2}\d{9}$',  # SIREN format
    "UK": r'^\d{10}$',  # VAT number
    "DZ": r'^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$',  # NIF format
    "MA": r'^\d{8}$',  # ICE format
    "TN": r'^\d{7}[A-Z]{1}\d{3}$',  # NIF format
}


def validate_email_format(email: str) -> None:
    """
    Validate email format strictly.
    
    Args:
        email: Email address to validate
        
    Raises:
        ValidationException: If email format is invalid
    """
    if not email or not email.strip():
        raise ValidationException("Email is required")
    
    if not EMAIL_REGEX.match(email):
        raise ValidationException("Invalid email format")
    
    # Check for common issues
    if email.count('@') != 1:
        raise ValidationException("Email must contain exactly one @ symbol")
    
    local, domain = email.split('@')
    if not local or not domain:
        raise ValidationException("Email must have both local and domain parts")
    
    if len(local) > 64:
        raise ValidationException("Email local part cannot exceed 64 characters")
    
    if len(domain) > 255:
        raise ValidationException("Email domain cannot exceed 255 characters")


def validate_phone_number(phone: str, country: Optional[str] = None) -> None:
    """
    Validate phone number format.
    
    Args:
        phone: Phone number to validate
        country: Optional country code for country-specific validation
        
    Raises:
        ValidationException: If phone format is invalid
    """
    if not phone or not phone.strip():
        raise ValidationException("Phone number is required")
    
    # Remove common formatting characters
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Basic validation: should contain only digits and optional +
    if not re.match(r'^\+?\d+$', cleaned):
        raise ValidationException("Phone number can only contain digits and optional + prefix")
    
    # Length validation (international format: 7-15 digits)
    digits_only = cleaned.lstrip('+')
    if len(digits_only) < 7 or len(digits_only) > 15:
        raise ValidationException("Phone number must be between 7 and 15 digits")
    
    # Country-specific validation if provided
    if country and country.upper() in PHONE_PATTERNS:
        pattern = PHONE_PATTERNS[country.upper()]
        if not re.match(pattern, cleaned):
            raise ValidationException(
                f"Phone number does not match {country} format"
            )


def validate_tax_id(tax_id: str, country: Optional[str] = None) -> None:
    """
    Validate tax identification number format.
    
    Args:
        tax_id: Tax ID to validate
        country: Country code for country-specific validation
        
    Raises:
        ValidationException: If tax ID format is invalid
    """
    if not tax_id or not tax_id.strip():
        raise ValidationException("Tax ID is required")
    
    # Basic validation: alphanumeric, spaces, hyphens allowed
    if not re.match(r'^[A-Z0-9\s\-]+$', tax_id.upper()):
        raise ValidationException("Tax ID can only contain letters, numbers, spaces, and hyphens")
    
    # Length validation
    cleaned = re.sub(r'[\s\-]', '', tax_id.upper())
    if len(cleaned) < 5 or len(cleaned) > 20:
        raise ValidationException("Tax ID must be between 5 and 20 characters")
    
    # Country-specific validation if provided
    if country and country.upper() in TAX_ID_PATTERNS:
        pattern = TAX_ID_PATTERNS[country.upper()]
        if not re.match(pattern, tax_id.upper()):
            raise ValidationException(
                f"Tax ID does not match {country} format"
            )


def validate_company_data(company_name: str, tax_id: Optional[str] = None, country: Optional[str] = None) -> None:
    """
    Validate company data for corporate customers.
    
    Args:
        company_name: Company name
        tax_id: Optional tax ID
        country: Optional country code
        
    Raises:
        ValidationException: If company data is invalid
    """
    if not company_name or not company_name.strip():
        raise ValidationException("Company name is required for corporate customers")
    
    if len(company_name.strip()) < 2:
        raise ValidationException("Company name must be at least 2 characters")
    
    if len(company_name) > 255:
        raise ValidationException("Company name cannot exceed 255 characters")
    
    # Validate tax ID if provided
    if tax_id:
        validate_tax_id(tax_id, country)


def validate_customer_data(
    email: str,
    phone: str,
    customer_type: str,
    company_name: Optional[str] = None,
    tax_id: Optional[str] = None,
    country: Optional[str] = None,
) -> None:
    """
    Validate all customer data.
    
    Args:
        email: Email address
        phone: Phone number
        customer_type: Customer type (individual/corporate)
        company_name: Company name (required for corporate)
        tax_id: Tax ID (optional)
        country: Country code for validation
        
    Raises:
        ValidationException: If any data is invalid
    """
    # Validate email
    validate_email_format(email)
    
    # Validate phone
    validate_phone_number(phone, country)
    
    # Validate corporate data if applicable
    if customer_type == "corporate":
        validate_company_data(company_name or "", tax_id, country)
        if tax_id:
            validate_tax_id(tax_id, country)
