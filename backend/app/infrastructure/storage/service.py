"""File storage service for managing documents and uploads."""

import os
import uuid
from pathlib import Path
from typing import Optional
import shutil

from app.config.settings import get_settings


class StorageService:
    """Service for handling file storage operations."""

    def __init__(self):
        """Initialize storage service with base path from settings."""
        self.settings = get_settings()
        self.base_path = Path(self.settings.STORAGE_PATH)

        # Ensure base directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_kyc_directory(self, customer_id: str) -> Path:
        """Get or create KYC documents directory for a customer."""
        kyc_dir = self.base_path / "kyc_documents" / customer_id
        kyc_dir.mkdir(parents=True, exist_ok=True)
        return kyc_dir

    def save_kyc_document(
        self,
        customer_id: str,
        file_content: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """
        Save KYC document to storage.

        Args:
            customer_id: Customer identifier
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type of the file

        Returns:
            Relative path to saved file
        """
        # Create customer-specific directory
        kyc_dir = self._get_kyc_directory(customer_id)

        # Generate unique filename to avoid collisions
        file_id = str(uuid.uuid4())
        # Keep original extension
        _, ext = os.path.splitext(filename)
        unique_filename = f"{file_id}{ext}"

        # Full path to save file
        file_path = kyc_dir / unique_filename

        # Write file
        file_path.write_bytes(file_content)

        # Return relative path from base storage path
        return str(file_path.relative_to(self.base_path))

    def delete_file(self, relative_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            relative_path: Relative path to file (as returned by save methods)

        Returns:
            True if file was deleted, False if file didn't exist
        """
        try:
            file_path = self.base_path / relative_path
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            # Log error but don't fail
            print(f"Error deleting file {relative_path}: {e}")
            return False

    def get_file_path(self, relative_path: str) -> Path:
        """
        Get absolute file path from relative path.

        Args:
            relative_path: Relative path to file (as returned by save methods)

        Returns:
            Absolute Path object
        """
        return self.base_path / relative_path

    def file_exists(self, relative_path: str) -> bool:
        """
        Check if file exists in storage.

        Args:
            relative_path: Relative path to file

        Returns:
            True if file exists, False otherwise
        """
        file_path = self.get_file_path(relative_path)
        return file_path.exists()

    def get_file_content(self, relative_path: str) -> bytes:
        """
        Read and return file content.

        Args:
            relative_path: Relative path to file

        Returns:
            File content as bytes
        """
        file_path = self.get_file_path(relative_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {relative_path}")
        return file_path.read_bytes()

    def cleanup_customer_directory(self, customer_id: str) -> bool:
        """
        Clean up all files for a customer (soft delete).

        Args:
            customer_id: Customer identifier

        Returns:
            True if successful
        """
        try:
            kyc_dir = self.base_path / "kyc_documents" / customer_id
            if kyc_dir.exists():
                shutil.rmtree(kyc_dir)
            return True
        except Exception as e:
            print(f"Error cleaning up directory for customer {customer_id}: {e}")
            return False

    def get_customer_storage_size(self, customer_id: str) -> int:
        """
        Calculate total storage size used by a customer.

        Args:
            customer_id: Customer identifier

        Returns:
            Total size in bytes
        """
        kyc_dir = self._get_kyc_directory(customer_id)
        total_size = 0

        for file_path in kyc_dir.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size

        return total_size
