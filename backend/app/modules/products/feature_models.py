"""
Product features and specifications models.
Handles product specifications, technical details, documentation, and videos.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum

from app.config.database import Base


class FeatureType(str, Enum):
    """Type of product feature/specification."""
    SPECIFICATION = "specification"  # Technical specifications
    TECHNICAL_DETAIL = "technical_detail"  # Detailed technical information
    FEATURE = "feature"  # Product features/benefits


class ProductSpecification(Base):
    """
    Product specifications and features.
    Extensible key-value pairs for product attributes.
    """

    __tablename__ = "product_specifications"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        doc="Unique specification identifier",
    )

    # Product Reference
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to product",
    )

    # Specification Data
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Specification name/label (e.g., 'Processor', 'Memory', 'Color')",
    )
    value: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Specification value (e.g., 'Intel Core i7', '16GB RAM', 'Black')",
    )
    unit: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Unit of measurement if applicable (e.g., 'GB', 'Hz', 'inches')",
    )

    # Organization
    feature_type: Mapped[FeatureType] = mapped_column(
        SQLEnum(FeatureType, name="feature_type_enum"),
        default=FeatureType.SPECIFICATION,
        nullable=False,
        index=True,
        doc="Type of feature",
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Category for grouping specs (e.g., 'Service', 'Technical', 'Pricing', 'Limits')",
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        doc="Order for display",
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ProductSpecification {self.product_id} - {self.name}: {self.value}>"


class ProductDocumentation(Base):
    """
    Product documentation and reference links.
    Stores links to datasheets, manuals, guides, etc.
    """

    __tablename__ = "product_documentation"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        doc="Unique documentation identifier",
    )

    # Product Reference
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to product",
    )

    # Documentation Data
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Document title (e.g., 'User Manual', 'Technical Datasheet')",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Description of the documentation",
    )
    url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="URL to the documentation (PDF, web page, etc.)",
    )
    document_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Type of document (e.g., 'manual', 'datasheet', 'guide', 'specification')",
    )

    # File information
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="File size in bytes if available",
    )
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        doc="Language of documentation (ISO 639-1 code, e.g., 'en', 'es')",
    )

    # Organization
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        doc="Order for display",
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        doc="Whether this is the primary/main documentation",
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ProductDocumentation {self.product_id} - {self.title}>"


class ProductVideo(Base):
    """
    Product videos and multimedia content.
    Stores video links, demonstrations, tutorials, etc.
    """

    __tablename__ = "product_videos"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        doc="Unique video identifier",
    )

    # Product Reference
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to product",
    )

    # Video Data
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Video title",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Video description",
    )
    url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Video URL (YouTube, Vimeo, or direct URL)",
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Thumbnail image URL",
    )

    # Video information
    video_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="demonstration",
        index=True,
        doc="Type of video (e.g., 'demonstration', 'tutorial', 'review', 'unboxing')",
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Video duration in seconds",
    )
    source_platform: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="youtube",
        doc="Platform where video is hosted (e.g., 'youtube', 'vimeo', 'self-hosted')",
    )

    # Organization
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        doc="Order for display",
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        doc="Whether this is a featured/primary video",
    )

    # Engagement
    view_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        doc="Number of times video has been viewed",
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ProductVideo {self.product_id} - {self.title}>"
