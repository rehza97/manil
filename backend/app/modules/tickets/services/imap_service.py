"""IMAP service for fetching emails from email accounts.

Handles secure IMAP connections, email fetching with pagination,
and unseen flag management.
"""

import imaplib
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from cryptography.fernet import Fernet
import os

from app.modules.tickets.models import EmailAccount

logger = logging.getLogger(__name__)


class IMAPError(Exception):
    """Exception raised for IMAP operations."""

    pass


class IMAPEmail:
    """Represents an email fetched via IMAP."""

    def __init__(
        self,
        uid: str,
        message_id: str,
        raw_email: str,
        flags: List[str],
    ):
        self.uid = uid
        self.message_id = message_id
        self.raw_email = raw_email
        self.flags = flags
        self.is_seen = b"\\Seen" in [f.encode() if isinstance(f, str) else f for f in flags]

    def __repr__(self) -> str:
        return f"<IMAPEmail {self.message_id} (seen={self.is_seen})>"


class IMAPService:
    """Service for IMAP email operations."""

    # Encryption cipher suite for storing passwords
    _cipher = None

    @classmethod
    def _get_cipher(cls) -> Fernet:
        """Get or create encryption cipher.

        Returns:
            Fernet: Cipher instance for password encryption/decryption
        """
        if cls._cipher is None:
            encryption_key = os.getenv("ENCRYPTION_KEY")
            if not encryption_key:
                raise IMAPError("ENCRYPTION_KEY environment variable not set")
            cls._cipher = Fernet(encryption_key.encode())
        return cls._cipher

    @classmethod
    def decrypt_password(cls, encrypted_password: str) -> str:
        """Decrypt stored password.

        Args:
            encrypted_password: Encrypted password string

        Returns:
            str: Decrypted password

        Raises:
            IMAPError: If decryption fails
        """
        try:
            cipher = cls._get_cipher()
            decrypted = cipher.decrypt(encrypted_password.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt password: {e}")
            raise IMAPError(f"Failed to decrypt password: {str(e)}") from e

    @classmethod
    def encrypt_password(cls, password: str) -> str:
        """Encrypt password for storage.

        Args:
            password: Plain text password

        Returns:
            str: Encrypted password
        """
        try:
            cipher = cls._get_cipher()
            encrypted = cipher.encrypt(password.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt password: {e}")
            raise IMAPError(f"Failed to encrypt password: {str(e)}") from e

    @classmethod
    def connect(cls, email_account: EmailAccount) -> imaplib.IMAP4_SSL:
        """Create secure IMAP connection.

        Args:
            email_account: EmailAccount object with connection details

        Returns:
            imaplib.IMAP4_SSL: Connected IMAP client

        Raises:
            IMAPError: If connection fails
        """
        try:
            # Decrypt password
            password = cls.decrypt_password(email_account.imap_password_encrypted)

            # Create connection
            if email_account.use_tls:
                imap = imaplib.IMAP4_SSL(email_account.imap_server, email_account.imap_port)
            else:
                imap = imaplib.IMAP4(email_account.imap_server, email_account.imap_port)

            # Authenticate
            imap.login(email_account.imap_username, password)
            logger.info(f"Connected to IMAP: {email_account.email_address}")

            return imap

        except imaplib.IMAP4.error as e:
            logger.error(f"IMAP authentication failed: {e}")
            raise IMAPError(f"IMAP authentication failed: {str(e)}") from e
        except Exception as e:
            logger.error(f"Failed to connect to IMAP: {e}")
            raise IMAPError(f"Failed to connect to IMAP: {str(e)}") from e

    @classmethod
    def disconnect(cls, imap: imaplib.IMAP4_SSL) -> None:
        """Close IMAP connection.

        Args:
            imap: Connected IMAP client
        """
        try:
            imap.close()
            imap.logout()
            logger.info("Disconnected from IMAP")
        except Exception as e:
            logger.warning(f"Error closing IMAP connection: {e}")

    @classmethod
    def test_connection(cls, email_account: EmailAccount) -> Tuple[bool, str]:
        """Test IMAP connection without side effects.

        Args:
            email_account: EmailAccount to test

        Returns:
            Tuple[bool, str]: (success, message)
        """
        imap = None
        try:
            imap = cls.connect(email_account)
            capability = imap.capability()
            return (True, "Connection successful")
        except Exception as e:
            return (False, str(e))
        finally:
            if imap:
                cls.disconnect(imap)

    @classmethod
    def fetch_unseen_emails(
        cls,
        email_account: EmailAccount,
        limit: Optional[int] = None,
    ) -> List[IMAPEmail]:
        """Fetch unseen emails from account.

        Args:
            email_account: EmailAccount to fetch from
            limit: Maximum number of emails to fetch (None = all)

        Returns:
            List[IMAPEmail]: List of unseen emails

        Raises:
            IMAPError: If fetch operation fails
        """
        imap = None
        try:
            imap = cls.connect(email_account)

            # Select inbox
            status, _ = imap.select("INBOX")
            if status != "OK":
                raise IMAPError("Failed to select INBOX")

            # Search for unseen emails
            status, email_ids = imap.search(None, "UNSEEN")
            if status != "OK":
                raise IMAPError("Failed to search for unseen emails")

            email_ids = email_ids[0].split()
            if limit:
                email_ids = email_ids[-limit:]  # Get last N emails

            # Fetch emails
            emails = []
            for email_id in email_ids:
                try:
                    status, msg_data = imap.fetch(email_id, "(RFC822 FLAGS)")
                    if status != "OK":
                        logger.warning(f"Failed to fetch email {email_id}")
                        continue

                    raw_email = msg_data[0][1].decode("utf-8", errors="replace")
                    flags = msg_data[1].decode("utf-8", errors="replace")

                    # Parse flags
                    import re
                    flag_match = re.search(r"\((.+?)\)", flags)
                    flag_list = flag_match.group(1).split() if flag_match else []

                    # Extract message ID
                    import email
                    message = email.message_from_string(raw_email)
                    message_id = message.get("Message-ID", f"<unknown_{email_id}>")

                    imap_email = IMAPEmail(
                        uid=email_id.decode("utf-8"),
                        message_id=message_id,
                        raw_email=raw_email,
                        flags=flag_list,
                    )
                    emails.append(imap_email)

                except Exception as e:
                    logger.warning(f"Failed to process email {email_id}: {e}")
                    continue

            logger.info(f"Fetched {len(emails)} unseen emails from {email_account.email_address}")
            return emails

        except IMAPError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch unseen emails: {e}")
            raise IMAPError(f"Failed to fetch unseen emails: {str(e)}") from e
        finally:
            if imap:
                cls.disconnect(imap)

    @classmethod
    def mark_as_seen(
        cls,
        email_account: EmailAccount,
        email_uid: str,
    ) -> bool:
        """Mark email as seen.

        Args:
            email_account: EmailAccount containing email
            email_uid: UID of email to mark

        Returns:
            bool: True if successful

        Raises:
            IMAPError: If operation fails
        """
        imap = None
        try:
            imap = cls.connect(email_account)

            # Select inbox
            status, _ = imap.select("INBOX")
            if status != "OK":
                raise IMAPError("Failed to select INBOX")

            # Mark as seen
            status, _ = imap.store(email_uid, "+FLAGS", "\\Seen")
            if status != "OK":
                raise IMAPError(f"Failed to mark email {email_uid} as seen")

            logger.info(f"Marked email {email_uid} as seen")
            return True

        except IMAPError:
            raise
        except Exception as e:
            logger.error(f"Failed to mark email as seen: {e}")
            raise IMAPError(f"Failed to mark email as seen: {str(e)}") from e
        finally:
            if imap:
                cls.disconnect(imap)

    @classmethod
    def fetch_all_emails(
        cls,
        email_account: EmailAccount,
        limit: Optional[int] = None,
    ) -> List[IMAPEmail]:
        """Fetch all emails from account (not just unseen).

        Args:
            email_account: EmailAccount to fetch from
            limit: Maximum number of emails to fetch (None = all)

        Returns:
            List[IMAPEmail]: List of all emails

        Raises:
            IMAPError: If fetch operation fails
        """
        imap = None
        try:
            imap = cls.connect(email_account)

            # Select inbox
            status, _ = imap.select("INBOX")
            if status != "OK":
                raise IMAPError("Failed to select INBOX")

            # Search for all emails
            status, email_ids = imap.search(None, "ALL")
            if status != "OK":
                raise IMAPError("Failed to search for emails")

            email_ids = email_ids[0].split()
            if limit:
                email_ids = email_ids[-limit:]

            # Fetch emails
            emails = []
            for email_id in email_ids:
                try:
                    status, msg_data = imap.fetch(email_id, "(RFC822 FLAGS)")
                    if status != "OK":
                        logger.warning(f"Failed to fetch email {email_id}")
                        continue

                    raw_email = msg_data[0][1].decode("utf-8", errors="replace")
                    flags = msg_data[1].decode("utf-8", errors="replace")

                    # Parse flags
                    import re
                    flag_match = re.search(r"\((.+?)\)", flags)
                    flag_list = flag_match.group(1).split() if flag_match else []

                    # Extract message ID
                    import email
                    message = email.message_from_string(raw_email)
                    message_id = message.get("Message-ID", f"<unknown_{email_id}>")

                    imap_email = IMAPEmail(
                        uid=email_id.decode("utf-8"),
                        message_id=message_id,
                        raw_email=raw_email,
                        flags=flag_list,
                    )
                    emails.append(imap_email)

                except Exception as e:
                    logger.warning(f"Failed to process email {email_id}: {e}")
                    continue

            logger.info(f"Fetched {len(emails)} emails from {email_account.email_address}")
            return emails

        except IMAPError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch emails: {e}")
            raise IMAPError(f"Failed to fetch emails: {str(e)}") from e
        finally:
            if imap:
                cls.disconnect(imap)

    @classmethod
    def get_mailbox_status(cls, email_account: EmailAccount) -> dict:
        """Get mailbox status information.

        Args:
            email_account: EmailAccount to check

        Returns:
            dict: Status information including unseen count, total count

        Raises:
            IMAPError: If operation fails
        """
        imap = None
        try:
            imap = cls.connect(email_account)

            # Get INBOX status
            status, mailbox_data = imap.status("INBOX", "(MESSAGES UNSEEN)")
            if status != "OK":
                raise IMAPError("Failed to get mailbox status")

            # Parse status response
            import re
            status_str = mailbox_data[0].decode("utf-8", errors="replace")
            match = re.search(r"\(MESSAGES (\d+) UNSEEN (\d+)\)", status_str)

            if match:
                return {
                    "total_messages": int(match.group(1)),
                    "unseen_messages": int(match.group(2)),
                }

            return {"total_messages": 0, "unseen_messages": 0}

        except IMAPError:
            raise
        except Exception as e:
            logger.error(f"Failed to get mailbox status: {e}")
            raise IMAPError(f"Failed to get mailbox status: {str(e)}") from e
        finally:
            if imap:
                cls.disconnect(imap)
