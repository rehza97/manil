"""
Webhook service for processing email provider webhooks.

Handles webhook signature verification and event processing for multiple providers.
"""
import hmac
import hashlib
import json
from typing import Dict, Any, Optional, List
from fastapi import Request, HTTPException

from app.core.logging import logger
from app.config.settings import get_settings

settings = get_settings()


class WebhookService:
    """Service for processing email provider webhooks."""

    @staticmethod
    def verify_sendgrid_signature(
        payload: str,
        signature: str,
        timestamp: str,
        secret: Optional[str] = None,
    ) -> bool:
        """
        Verify SendGrid webhook signature.

        Args:
            payload: Webhook payload (JSON string)
            signature: X-Twilio-Email-Event-Webhook-Signature header
            timestamp: X-Twilio-Email-Event-Webhook-Timestamp header
            secret: Webhook secret (from settings if not provided)

        Returns:
            True if signature is valid
        """
        if not secret:
            secret = getattr(settings, "SENDGRID_WEBHOOK_SECRET", None)
        
        if not secret:
            logger.warning("SendGrid webhook secret not configured, skipping verification")
            return True  # Allow if secret not configured
        
        # SendGrid uses HMAC-SHA256
        message = f"{timestamp}{payload}"
        expected_signature = hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)

    @staticmethod
    def verify_mailgun_signature(
        token: str,
        signature: str,
        timestamp: str,
        secret: Optional[str] = None,
    ) -> bool:
        """
        Verify Mailgun webhook signature.

        Args:
            token: Webhook token
            signature: Webhook signature
            timestamp: Webhook timestamp
            secret: Mailgun webhook signing key (from settings if not provided)

        Returns:
            True if signature is valid
        """
        if not secret:
            secret = getattr(settings, "MAILGUN_WEBHOOK_SECRET", None)
        
        if not secret:
            logger.warning("Mailgun webhook secret not configured, skipping verification")
            return True  # Allow if secret not configured
        
        # Mailgun uses HMAC-SHA256
        message = f"{timestamp}{token}"
        expected_signature = hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)

    @staticmethod
    def parse_sendgrid_webhook(payload: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Parse SendGrid webhook payload.

        Args:
            payload: SendGrid webhook payload (list of events)

        Returns:
            List of parsed events
        """
        events = []
        for event in payload:
            events.append({
                "event_type": event.get("event"),
                "email": event.get("email"),
                "timestamp": event.get("timestamp"),
                "message_id": event.get("sg_message_id"),
                "reason": event.get("reason"),
                "status": event.get("status"),
                "raw_event": event,
            })
        return events

    @staticmethod
    def parse_mailgun_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Mailgun webhook payload.

        Args:
            payload: Mailgun webhook payload (form data or JSON)

        Returns:
            Parsed event dictionary
        """
        return {
            "event_type": payload.get("event"),
            "email": payload.get("recipient"),
            "timestamp": payload.get("timestamp"),
            "message_id": payload.get("message-id"),
            "reason": payload.get("delivery-status", {}).get("description") if isinstance(payload.get("delivery-status"), dict) else payload.get("delivery-status"),
            "status": payload.get("delivery-status", {}).get("code") if isinstance(payload.get("delivery-status"), dict) else None,
            "raw_event": payload,
        }
