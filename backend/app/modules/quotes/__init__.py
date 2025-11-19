"""
Quotes module.

Handles quote management, versioning, approval workflow, and expiration.
"""
from app.modules.quotes.models import Quote, QuoteItem, QuoteTimeline, QuoteStatus
from app.modules.quotes.service import QuoteService

__all__ = ["Quote", "QuoteItem", "QuoteTimeline", "QuoteStatus", "QuoteService"]
