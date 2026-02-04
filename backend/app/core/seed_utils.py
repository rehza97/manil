"""
Shared utilities for production-like seed data.

Date generators, financial calculators, and random helpers.
No external faker; uses random + fixed lists for reproducibility.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Tuple


# ============================================================================
# ALGERIAN DATA
# ============================================================================

ALGERIAN_FIRST_NAMES_MALE = [
    "Mohammed", "Ahmed", "Youcef", "Karim", "Amine", "Sofiane", "Mehdi",
    "Rachid", "Said", "Farid", "Tarek", "Bilal", "Hamza", "Omar", "Walid"
]

ALGERIAN_FIRST_NAMES_FEMALE = [
    "Fatima", "Amina", "Samira", "Naima", "Leila", "Salima", "Karima",
    "Malika", "Zohra", "Aicha", "Souad", "Fadila", "Yamina", "Djamila", "Nadia"
]

ALGERIAN_LAST_NAMES = [
    "Benali", "Boumediene", "Cherif", "Djelloul", "Fadel", "Ghali", "Haddad",
    "Ibrahim", "Kaci", "Larbi", "Mansouri", "Nacer", "Ouali", "Rachedi", "Saidi",
    "Tabet", "Yahiaoui", "Ziani", "Benhadj", "Meziane"
]

ALGERIAN_CITIES = [
    ("Algiers", "Algiers", "Algeria"),
    ("Oran", "Oran", "Algeria"),
    ("Constantine", "Constantine", "Algeria"),
    ("Annaba", "Annaba", "Algeria"),
    ("Blida", "Blida", "Algeria"),
    ("Batna", "Batna", "Algeria"),
    ("Djelfa", "Djelfa", "Algeria"),
    ("Sétif", "Sétif", "Algeria"),
    ("Tizi Ouzou", "Tizi Ouzou", "Algeria"),
    ("Béjaïa", "Béjaïa", "Algeria"),
]

CORPORATE_NAMES = [
    "Sonatrach Services", "Algérie Télécom Solutions", "Cevital Tech",
    "Condor Electronics", "Naftal Digital", "Sonelgaz IT", "BNA Systems",
    "Air Algérie Technologies", "ENIEM Software", "Saidal Pharma IT"
]

STREET_TYPES = ["Rue", "Avenue", "Boulevard", "Cité"]
STREET_NAMES = [
    "1er Novembre", "Didouche Mourad", "Larbi Ben M'hidi", "Hassiba Ben Bouali",
    "Mohamed Khemisti", "Ahmed Zabana", "Abane Ramdane", "Bachir Ibrahimi",
    "Colonel Amirouche", "Krim Belkacem"
]


def random_date_in_range(start: datetime, end: datetime) -> datetime:
    """Return a random datetime between start and end (timezone-aware UTC)."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    delta = end - start
    sec = random.randint(0, max(0, int(delta.total_seconds())))
    return start + timedelta(seconds=sec)


def date_months_ago(months: int) -> datetime:
    """Return a datetime N months ago from now (UTC)."""
    now = datetime.now(timezone.utc)
    # Approximate: 30 days per month
    return now - timedelta(days=months * 30)


def calculate_tax(subtotal: Decimal, rate: Decimal = Decimal("0.19")) -> Decimal:
    """Calculate tax amount from subtotal and rate (default 19%)."""
    return (subtotal * rate).quantize(Decimal("0.01"))


def calculate_total(
    subtotal: Decimal, tax: Decimal, discount: Decimal = Decimal("0")
) -> Decimal:
    """Total = subtotal + tax - discount."""
    return (subtotal + tax - discount).quantize(Decimal("0.01"))


def random_algerian_phone() -> str:
    """Return a plausible Algerian mobile number (e.g. 05XX XX XX XX)."""
    prefix = random.choice(["5", "6", "7"])
    rest = "".join(str(random.randint(0, 9)) for _ in range(8))
    return f"0{prefix}{rest[:2]} {rest[2:4]} {rest[4:6]} {rest[6:8]}"


def random_dz_email(name: str, domain: str = "production.seed") -> str:
    """Slug from name + @domain (e.g. ahmed.benali@production.seed)."""
    slug = name.lower().replace(" ", ".").replace("'", "")
    return f"{slug}@{domain}"


def random_amount(min_val: int, max_val: int) -> Decimal:
    """Random amount in range [min_val, max_val], 2 decimal places."""
    val = random.randint(min_val, max_val) + random.random()
    return Decimal(str(round(val, 2)))


def weighted_choice(choices: List[Any], weights: List[float]) -> Any:
    """Return one element from choices with probability proportional to weights."""
    total = sum(weights)
    r = random.uniform(0, total)
    acc = 0.0
    for c, w in zip(choices, weights):
        acc += w
        if r <= acc:
            return c
    return choices[-1]


def date_days_ago(days: int, from_date: datetime = None) -> datetime:
    """Get a datetime N days ago from the given date (UTC)."""
    if from_date is None:
        from_date = datetime.now(timezone.utc)
    return from_date - timedelta(days=days)


def add_days(base_date: datetime, days: int) -> datetime:
    """Add N days to a date."""
    return base_date + timedelta(days=days)


def random_algerian_name(gender: str = None) -> Tuple[str, str]:
    """
    Generate a random Algerian name.

    Args:
        gender: 'male', 'female', or None for random

    Returns:
        Tuple of (first_name, last_name)
    """
    if gender is None:
        gender = random.choice(['male', 'female'])

    if gender == 'male':
        first_name = random.choice(ALGERIAN_FIRST_NAMES_MALE)
    else:
        first_name = random.choice(ALGERIAN_FIRST_NAMES_FEMALE)

    last_name = random.choice(ALGERIAN_LAST_NAMES)

    return first_name, last_name


def random_city() -> Tuple[str, str, str]:
    """Get a random Algerian city. Returns (city, state, country)."""
    return random.choice(ALGERIAN_CITIES)


def random_postal_code() -> str:
    """Generate a random Algerian postal code (5 digits)."""
    return f"{random.randint(10000, 99999)}"


def random_address(city: str) -> str:
    """Generate a random Algerian address."""
    number = random.randint(1, 200)
    street_type = random.choice(STREET_TYPES)
    street_name = random.choice(STREET_NAMES)
    return f"{number} {street_type} {street_name}, {city}"


def random_tax_id() -> str:
    """Generate a random Algerian tax ID (NIF format - 15 digits)."""
    return ''.join([str(random.randint(0, 9)) for _ in range(15)])


def random_corporate_name() -> str:
    """Get a random corporate name."""
    return random.choice(CORPORATE_NAMES)


def random_corporate_email(company_name: str) -> str:
    """
    Generate a random corporate email.

    Args:
        company_name: Company name

    Returns:
        Corporate email address (e.g., contact@sonatrach.dz)
    """
    domain_part = company_name.lower().split()[0].replace('é', 'e')
    domain = f"{domain_part}.dz"
    prefixes = ['info', 'contact', 'admin', 'support', 'sales', 'commercial']
    prefix = random.choice(prefixes)
    return f"{prefix}@{domain}"


def random_discount_percentage() -> Decimal:
    """Generate a random discount percentage (0%, 5%, 10%, 15%, 20%, 25%)."""
    choices = [0, 5, 10, 15, 20, 25]
    return Decimal(str(random.choice(choices)))


def random_string(length: int = 8) -> str:
    """Generate a random alphanumeric string."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def random_percentage(min_val: int = 0, max_val: int = 100) -> Decimal:
    """Generate a random percentage (0-100)."""
    value = random.randint(min_val, max_val)
    return Decimal(str(value))


def random_user_agent() -> str:
    """Generate a random user agent string."""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "PostmanRuntime/7.35.0",
        "python-requests/2.31.0",
    ]
    return random.choice(user_agents)


def random_ip_address() -> str:
    """Generate a random IP address (IPv4), preferring Algerian ranges."""
    ip_prefixes = [
        "41.96",    # Algerian IPs
        "41.97",    # Algerian IPs
        "105.235",  # Algerian IPs
        "196.12",   # Algerian IPs
        "192.168",  # Local network
        "10.0",     # Local network
    ]
    prefix = random.choice(ip_prefixes)
    suffix = f"{random.randint(0, 255)}.{random.randint(1, 254)}"
    return f"{prefix}.{suffix}"
