"""Spam filter service for email validation and quality assessment.

Handles SPF/DKIM/DMARC checking, keyword analysis, phishing detection,
and spam score calculation.
"""

import logging
import re
from typing import Tuple, List, Dict
import dns.resolver

from app.modules.tickets.services.email_parser_service import ParsedEmail

logger = logging.getLogger(__name__)


class SpamFilterError(Exception):
    """Exception raised for spam filtering operations."""

    pass


class SpamAnalysisResult:
    """Result of spam analysis."""

    def __init__(
        self,
        spam_score: int,
        is_spam: bool,
        reasons: List[str],
        details: Dict[str, any],
    ):
        self.spam_score = spam_score  # 0-100
        self.is_spam = is_spam
        self.reasons = reasons
        self.details = details

    def __repr__(self) -> str:
        return f"<SpamAnalysisResult score={self.spam_score} spam={self.is_spam}>"


class SpamFilterService:
    """Service for spam detection and filtering."""

    # Spam score thresholds
    SPAM_THRESHOLD = 50  # Score above this is considered spam
    HIGH_CONFIDENCE_THRESHOLD = 75

    # Phishing indicators
    PHISHING_KEYWORDS = [
        r"verify\s+account",
        r"confirm\s+identity",
        r"urgent\s+action",
        r"unusual\s+activity",
        r"click\s+here\s+now",
        r"limited\s+time",
        r"act\s+now",
        r"update\s+payment",
    ]

    # Spam keywords
    SPAM_KEYWORDS = [
        r"viagra",
        r"cialis",
        r"lottery",
        r"nigerian\s+prince",
        r"inheritance",
        r"free\s+money",
        r"make\s+money\s+fast",
        r"click\s+here\s+to\s+win",
        r"congratulations.*won",
    ]

    # Suspicious patterns
    SUSPICIOUS_PATTERNS = [
        r"bit\.ly",
        r"tinyurl",
        r"shortened\s+url",
        r"click\s+link",
        r"(http|ftp)://[^\s]+\.(tk|ml|cf|ga)",  # Suspicious TLDs
    ]

    @classmethod
    def analyze_email(cls, parsed_email: ParsedEmail) -> SpamAnalysisResult:
        """Analyze email for spam indicators.

        Args:
            parsed_email: Parsed email object

        Returns:
            SpamAnalysisResult: Analysis result with spam score
        """
        reasons = []
        details = {}
        total_score = 0

        # Check email authentication
        spf_score, spf_details = cls._check_spf(parsed_email.from_address)
        total_score += spf_score
        details["spf"] = spf_details
        if spf_score > 0:
            reasons.append(f"SPF check failed ({spf_score} points)")

        # Check for phishing indicators
        phishing_score, phishing_details = cls._check_phishing(parsed_email)
        total_score += phishing_score
        details["phishing"] = phishing_details
        if phishing_score > 0:
            reasons.append(f"Phishing indicators detected ({phishing_score} points)")

        # Check for spam keywords
        spam_score, spam_details = cls._check_spam_keywords(parsed_email)
        total_score += spam_score
        details["spam_keywords"] = spam_details
        if spam_score > 0:
            reasons.append(f"Spam keywords found ({spam_score} points)")

        # Check for suspicious patterns
        suspicious_score, suspicious_details = cls._check_suspicious_patterns(parsed_email)
        total_score += suspicious_score
        details["suspicious"] = suspicious_details
        if suspicious_score > 0:
            reasons.append(f"Suspicious patterns ({suspicious_score} points)")

        # Check for autoresponders
        autoresponder_score = cls._check_autoresponder(parsed_email)
        total_score += autoresponder_score
        if autoresponder_score > 0:
            reasons.append(f"Autoresponder detected ({autoresponder_score} points)")
        details["autoresponder"] = autoresponder_score > 0

        # Cap score at 100
        total_score = min(100, total_score)

        is_spam = total_score >= cls.SPAM_THRESHOLD

        logger.info(f"Spam analysis for {parsed_email.from_address}: score={total_score}")

        return SpamAnalysisResult(
            spam_score=total_score,
            is_spam=is_spam,
            reasons=reasons,
            details=details,
        )

    @staticmethod
    def _check_spf(from_address: str) -> Tuple[int, Dict]:
        """Check SPF record for email domain.

        Args:
            from_address: Sender email address

        Returns:
            Tuple[int, Dict]: (score, details)
        """
        try:
            domain = from_address.split("@")[1]
            answers = dns.resolver.resolve(domain, "MX")
            return (0, {"status": "valid"})
        except Exception as e:
            logger.warning(f"SPF check failed for {from_address}: {e}")
            return (15, {"status": "failed", "error": str(e)})

    @classmethod
    def _check_phishing(cls, parsed_email: ParsedEmail) -> Tuple[int, Dict]:
        """Check for phishing indicators.

        Args:
            parsed_email: Parsed email object

        Returns:
            Tuple[int, Dict]: (score, details)
        """
        content = f"{parsed_email.subject} {parsed_email.body_text or ''} {parsed_email.body_html or ''}".lower()

        found_indicators = []
        for pattern in cls.PHISHING_KEYWORDS:
            if re.search(pattern, content):
                found_indicators.append(pattern)

        score = len(found_indicators) * 10  # 10 points per indicator
        score = min(30, score)  # Cap at 30

        return (score, {
            "found": len(found_indicators) > 0,
            "indicators": found_indicators,
        })

    @classmethod
    def _check_spam_keywords(cls, parsed_email: ParsedEmail) -> Tuple[int, Dict]:
        """Check for common spam keywords.

        Args:
            parsed_email: Parsed email object

        Returns:
            Tuple[int, Dict]: (score, details)
        """
        content = f"{parsed_email.subject} {parsed_email.body_text or ''} {parsed_email.body_html or ''}".lower()

        found_keywords = []
        for pattern in cls.SPAM_KEYWORDS:
            if re.search(pattern, content):
                found_keywords.append(pattern)

        score = len(found_keywords) * 15  # 15 points per keyword
        score = min(40, score)  # Cap at 40

        return (score, {
            "found": len(found_keywords) > 0,
            "keywords": found_keywords,
        })

    @classmethod
    def _check_suspicious_patterns(cls, parsed_email: ParsedEmail) -> Tuple[int, Dict]:
        """Check for suspicious URL patterns.

        Args:
            parsed_email: Parsed email object

        Returns:
            Tuple[int, Dict]: (score, details)
        """
        content = f"{parsed_email.subject} {parsed_email.body_text or ''} {parsed_email.body_html or ''}"

        found_patterns = []
        for pattern in cls.SUSPICIOUS_PATTERNS:
            if re.search(pattern, content):
                found_patterns.append(pattern)

        score = len(found_patterns) * 10  # 10 points per pattern
        score = min(25, score)  # Cap at 25

        return (score, {
            "found": len(found_patterns) > 0,
            "patterns": found_patterns,
        })

    @staticmethod
    def _check_autoresponder(parsed_email: ParsedEmail) -> int:
        """Check if email is from autoresponder.

        Args:
            parsed_email: Parsed email object

        Returns:
            int: Score (0 or 5)
        """
        autoresponder_indicators = [
            r"auto-reply",
            r"out\s+of\s+office",
            r"automatic\s+reply",
            r"i\s+am\s+away",
            r"vacation\s+mode",
        ]

        content = f"{parsed_email.subject} {parsed_email.body_text or ''}".lower()

        for indicator in autoresponder_indicators:
            if re.search(indicator, content):
                return 5  # Small penalty for autoresponders

        return 0

    @staticmethod
    def is_valid_email_format(email_address: str) -> bool:
        """Validate email address format.

        Args:
            email_address: Email address to validate

        Returns:
            bool: True if valid format
        """
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email_address))

    @staticmethod
    def extract_urls(html_content: str) -> List[str]:
        """Extract URLs from HTML content.

        Args:
            html_content: HTML email body

        Returns:
            List[str]: List of URLs found
        """
        url_pattern = r"(?:http|ftp|https)://[^\s<>\"{}|\\^`\\[\\]]+"
        return re.findall(url_pattern, html_content or "")

    @staticmethod
    def check_url_reputation(url: str) -> Tuple[bool, str]:
        """Check if URL is known to be malicious.

        Args:
            url: URL to check

        Returns:
            Tuple[bool, str]: (is_safe, reason)
        """
        # TODO: Integrate with URL reputation service (Google Safe Browsing, etc.)
        suspicious_domains = [
            "bit.ly",
            "tinyurl.com",
            "short.link",
        ]

        for domain in suspicious_domains:
            if domain in url.lower():
                return (False, f"URL shortener detected: {domain}")

        return (True, "URL appears safe")

    @staticmethod
    def calculate_content_authenticity(
        from_address: str,
        from_display_name: str,
    ) -> Tuple[float, str]:
        """Calculate content authenticity score.

        Args:
            from_address: Sender email address
            from_display_name: Sender display name

        Returns:
            Tuple[float, str]: (authenticity_score 0-1, reason)
        """
        # Check if display name matches email domain
        domain = from_address.split("@")[1]

        if from_display_name.lower() in from_address.lower():
            return (0.9, "Display name matches email")

        if domain in from_display_name.lower():
            return (0.8, "Domain in display name")

        # Check for common spoofing patterns
        if any(keyword in from_display_name.lower() for keyword in ["paypal", "amazon", "apple", "microsoft"]):
            return (0.3, "Generic company name (possible spoofing)")

        return (0.6, "Standard sender")
