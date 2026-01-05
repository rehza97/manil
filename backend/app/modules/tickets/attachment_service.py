"""Ticket attachment service for file management."""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import TicketAttachment
from app.modules.tickets.attachments import AttachmentConfig
from app.infrastructure.storage.service import StorageService
from app.core.exceptions import ForbiddenException, ValidationException
from app.core.logging import logger


class TicketAttachmentService:
    """
    Service for managing ticket file attachments.

    Handles file upload, download, validation, and storage.
    """

    def __init__(self, db: AsyncSession):
        """Initialize attachment service."""
        self.db = db
        self.storage_service = StorageService()
        self.config = AttachmentConfig()

    async def validate_file(
        self,
        filename: str,
        file_size: int,
        mime_type: str,
    ) -> dict:
        """
        Validate file before upload.

        Args:
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type of file

        Returns:
            Dictionary with validation result

        Raises:
            ValidationException: If validation fails
        """
        errors = []

        # Check file size
        if file_size > self.config.MAX_FILE_SIZE:
            errors.append(
                f"File size ({file_size / 1024 / 1024:.1f}MB) exceeds "
                f"maximum allowed ({self.config.MAX_FILE_SIZE / 1024 / 1024:.0f}MB)"
            )

        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in self.config.ALLOWED_EXTENSIONS:
            errors.append(f"File extension {file_ext} is not allowed")

        # Check blocked extensions
        if file_ext in self.config.BLOCKED_EXTENSIONS:
            errors.append(f"File extension {file_ext} is blocked for security")

        # Check MIME type
        if mime_type in self.config.BLOCKED_MIME_TYPES:
            errors.append(f"MIME type {mime_type} is not allowed")

        if not self._is_safe_mime_type(mime_type):
            errors.append(f"MIME type {mime_type} is not allowed")

        # Check filename for suspicious patterns
        if self._is_suspicious_filename(filename):
            errors.append("Filename contains suspicious patterns")

        if errors:
            raise ValidationException("; ".join(errors))

        # Determine file type
        file_type = self.config.ALLOWED_EXTENSIONS.get(file_ext, "document")
        if mime_type in self.config.MIME_TYPES:
            file_type = self.config.MIME_TYPES[mime_type]

        logger.info(f"File validation passed: {filename} ({file_size} bytes, {file_type})")

        return {
            "is_valid": True,
            "file_type": file_type,
            "file_ext": file_ext,
        }

    def _is_safe_mime_type(self, mime_type: str) -> bool:
        """Check if MIME type is in safe list."""
        return mime_type in self.config.MIME_TYPES or mime_type.startswith("text/plain")

    def _is_suspicious_filename(self, filename: str) -> bool:
        """Check filename for suspicious patterns."""
        suspicious_patterns = [
            "..",  # Directory traversal
            "~/",  # Home directory
            "/$",  # Root directory
            "\\",  # Backslash
        ]
        return any(pattern in filename for pattern in suspicious_patterns)

    async def upload_attachment(
        self,
        ticket_id: str,
        reply_id: Optional[str],
        file_content: bytes,
        filename: str,
        mime_type: str,
        uploaded_by: str,
    ) -> TicketAttachment:
        """
        Upload file attachment to ticket.

        Args:
            ticket_id: Ticket ID
            reply_id: Reply ID (optional)
            file_content: File content bytes
            filename: Original filename
            mime_type: MIME type
            uploaded_by: User ID who uploaded

        Returns:
            Created TicketAttachment object

        Raises:
            ValidationException: If file validation fails
            Exception: If upload fails
        """
        try:
            # Validate file
            validation = await self.validate_file(filename, len(file_content), mime_type)

            # Check ticket attachment limits
            await self._check_attachment_limits(ticket_id, len(file_content))

            # Generate unique filename
            unique_filename = f"{uuid.uuid4()}_{Path(filename).name}"
            storage_path = f"tickets/{ticket_id}/{unique_filename}"

            # Store file
            file_url = await self.storage_service.upload_file(
                file_content=file_content,
                file_path=storage_path,
                content_type=mime_type,
            )

            # Create attachment record
            attachment = TicketAttachment(
                id=str(uuid.uuid4()),
                ticket_id=ticket_id,
                reply_id=reply_id,
                filename=unique_filename,
                original_filename=filename,
                file_type=validation["file_type"],
                mime_type=mime_type,
                file_size=len(file_content),
                file_path=file_url,
                uploaded_by=uploaded_by,
            )

            self.db.add(attachment)
            await self.db.commit()
            await self.db.refresh(attachment)

            logger.info(
                f"Attachment uploaded: {attachment.id} ({filename}) "
                f"to ticket {ticket_id}"
            )

            return attachment

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to upload attachment: {str(e)}")
            raise

    async def _check_attachment_limits(self, ticket_id: str, new_file_size: int) -> None:
        """
        Check ticket attachment limits.

        Args:
            ticket_id: Ticket ID
            new_file_size: Size of file to upload

        Raises:
            ValidationException: If limits exceeded
        """
        # Count existing attachments
        count_query = select(func.count()).select_from(TicketAttachment).where(
            and_(
                TicketAttachment.ticket_id == ticket_id,
                TicketAttachment.deleted_at.is_(None),
            )
        )
        count_result = await self.db.execute(count_query)
        attachment_count = count_result.scalar() or 0

        if attachment_count >= self.config.MAX_ATTACHMENTS_PER_REPLY:
            raise ValidationException(
                f"Maximum {self.config.MAX_ATTACHMENTS_PER_REPLY} attachments per ticket reached"
            )

        # Calculate total size
        size_query = select(func.sum(TicketAttachment.file_size)).where(
            and_(
                TicketAttachment.ticket_id == ticket_id,
                TicketAttachment.deleted_at.is_(None),
            )
        )
        size_result = await self.db.execute(size_query)
        total_size = (size_result.scalar() or 0) + new_file_size

        if total_size > self.config.MAX_TOTAL_SIZE_PER_TICKET:
            raise ValidationException(
                f"Total attachment size ({total_size / 1024 / 1024:.1f}MB) would exceed "
                f"maximum allowed ({self.config.MAX_TOTAL_SIZE_PER_TICKET / 1024 / 1024:.0f}MB)"
            )

    async def get_attachment(self, attachment_id: str) -> Optional[TicketAttachment]:
        """Get attachment by ID."""
        query = select(TicketAttachment).where(
            and_(
                TicketAttachment.id == attachment_id,
                TicketAttachment.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_ticket_attachments(self, ticket_id: str) -> List[TicketAttachment]:
        """List all attachments for a ticket."""
        query = select(TicketAttachment).where(
            and_(
                TicketAttachment.ticket_id == ticket_id,
                TicketAttachment.deleted_at.is_(None),
            )
        ).order_by(TicketAttachment.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def list_reply_attachments(self, reply_id: str) -> List[TicketAttachment]:
        """List all attachments for a reply."""
        query = select(TicketAttachment).where(
            and_(
                TicketAttachment.reply_id == reply_id,
                TicketAttachment.deleted_at.is_(None),
            )
        ).order_by(TicketAttachment.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def download_attachment(
        self, attachment_id: str, downloaded_by: str
    ) -> tuple[bytes, str]:
        """
        Download attachment file.

        Args:
            attachment_id: Attachment ID
            downloaded_by: User ID downloading file

        Returns:
            Tuple of (file_content, mime_type)
        """
        attachment = await self.get_attachment(attachment_id)
        if not attachment:
            raise ValueError(f"Attachment {attachment_id} not found")

        # Increment download count
        attachment.download_count += 1
        await self.db.commit()

        # Download from storage
        file_content = await self.storage_service.download_file(attachment.file_path)

        logger.info(f"Attachment downloaded: {attachment_id} by {downloaded_by}")

        return file_content, attachment.mime_type

    async def delete_attachment(self, attachment_id: str, deleted_by: str) -> bool:
        """
        Soft delete attachment.

        Args:
            attachment_id: Attachment ID
            deleted_by: User ID deleting attachment

        Returns:
            True if deleted successfully
        """
        attachment = await self.get_attachment(attachment_id)
        if not attachment:
            raise ValueError(f"Attachment {attachment_id} not found")

        attachment.deleted_at = datetime.now(timezone.utc)
        attachment.deleted_by = deleted_by

        await self.db.commit()

        logger.info(f"Attachment deleted: {attachment_id} by {deleted_by}")

        return True

    async def get_attachment_statistics(self, ticket_id: str) -> dict:
        """Get attachment statistics for ticket."""
        attachments = await self.list_ticket_attachments(ticket_id)

        total_size = sum(att.file_size for att in attachments)
        file_types = {}
        total_downloads = 0

        for att in attachments:
            file_types[att.file_type] = file_types.get(att.file_type, 0) + 1
            total_downloads += att.download_count

        return {
            "total_attachments": len(attachments),
            "total_size": total_size,
            "total_size_mb": total_size / 1024 / 1024,
            "file_types": file_types,
            "total_downloads": total_downloads,
            "most_downloaded": max(attachments, key=lambda x: x.download_count).original_filename
            if attachments
            else None,
        }
