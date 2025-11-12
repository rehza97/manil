"""
Product features and specifications service.
Handles business logic for product specs, documentation, and videos.
"""
import logging
import uuid
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.exceptions import NotFoundException, BadRequestException
from app.modules.products.feature_models import (
    ProductSpecification,
    ProductDocumentation,
    ProductVideo,
    FeatureType,
)
from app.modules.products.feature_schemas import (
    ProductSpecificationCreate,
    ProductSpecificationUpdate,
    ProductDocumentationCreate,
    ProductDocumentationUpdate,
    ProductVideoCreate,
    ProductVideoUpdate,
)

logger = logging.getLogger(__name__)


class ProductSpecificationService:
    """Service for managing product specifications."""

    @staticmethod
    def create_specification(
        db: Session,
        product_id: str,
        data: ProductSpecificationCreate,
    ) -> ProductSpecification:
        """Create a new product specification."""
        try:
            specification = ProductSpecification(
                id=str(uuid.uuid4()),
                product_id=product_id,
                name=data.name,
                value=data.value,
                unit=data.unit,
                feature_type=data.feature_type,
                category=data.category,
                display_order=data.display_order,
            )

            db.add(specification)
            db.commit()

            logger.info(f"Created specification for product {product_id}: {data.name}")

            return specification

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating specification: {str(e)}")
            raise

    @staticmethod
    def get_specification(db: Session, spec_id: str) -> ProductSpecification:
        """Get a specification by ID."""
        specification = db.query(ProductSpecification).filter(
            ProductSpecification.id == spec_id
        ).first()

        if not specification:
            raise NotFoundException(f"Specification not found: {spec_id}")

        return specification

    @staticmethod
    def list_specifications(
        db: Session,
        product_id: str,
        skip: int = 0,
        limit: int = 20,
        category: Optional[str] = None,
        feature_type: Optional[FeatureType] = None,
    ) -> Tuple[list[ProductSpecification], int]:
        """List specifications for a product."""
        query = db.query(ProductSpecification).filter(
            ProductSpecification.product_id == product_id
        )

        if category:
            query = query.filter(ProductSpecification.category == category)

        if feature_type:
            query = query.filter(ProductSpecification.feature_type == feature_type)

        total = query.count()
        specifications = query.order_by(
            ProductSpecification.display_order,
            ProductSpecification.created_at,
        ).offset(skip).limit(limit).all()

        return specifications, total

    @staticmethod
    def update_specification(
        db: Session,
        spec_id: str,
        data: ProductSpecificationUpdate,
    ) -> ProductSpecification:
        """Update a specification."""
        specification = ProductSpecificationService.get_specification(db, spec_id)

        try:
            if data.name is not None:
                specification.name = data.name
            if data.value is not None:
                specification.value = data.value
            if data.unit is not None:
                specification.unit = data.unit
            if data.feature_type is not None:
                specification.feature_type = data.feature_type
            if data.category is not None:
                specification.category = data.category
            if data.display_order is not None:
                specification.display_order = data.display_order

            db.commit()

            logger.info(f"Updated specification: {spec_id}")

            return specification

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating specification: {str(e)}")
            raise

    @staticmethod
    def delete_specification(db: Session, spec_id: str) -> None:
        """Delete a specification."""
        specification = ProductSpecificationService.get_specification(db, spec_id)

        try:
            db.delete(specification)
            db.commit()

            logger.info(f"Deleted specification: {spec_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting specification: {str(e)}")
            raise


class ProductDocumentationService:
    """Service for managing product documentation."""

    @staticmethod
    def create_documentation(
        db: Session,
        product_id: str,
        data: ProductDocumentationCreate,
    ) -> ProductDocumentation:
        """Create product documentation."""
        try:
            documentation = ProductDocumentation(
                id=str(uuid.uuid4()),
                product_id=product_id,
                title=data.title,
                description=data.description,
                url=data.url,
                document_type=data.document_type,
                language=data.language,
                display_order=data.display_order,
                is_primary=data.is_primary,
            )

            db.add(documentation)
            db.commit()

            logger.info(f"Created documentation for product {product_id}: {data.title}")

            return documentation

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating documentation: {str(e)}")
            raise

    @staticmethod
    def get_documentation(db: Session, doc_id: str) -> ProductDocumentation:
        """Get documentation by ID."""
        documentation = db.query(ProductDocumentation).filter(
            ProductDocumentation.id == doc_id
        ).first()

        if not documentation:
            raise NotFoundException(f"Documentation not found: {doc_id}")

        return documentation

    @staticmethod
    def list_documentation(
        db: Session,
        product_id: str,
        skip: int = 0,
        limit: int = 20,
        document_type: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Tuple[list[ProductDocumentation], int]:
        """List documentation for a product."""
        query = db.query(ProductDocumentation).filter(
            ProductDocumentation.product_id == product_id
        )

        if document_type:
            query = query.filter(ProductDocumentation.document_type == document_type)

        if language:
            query = query.filter(ProductDocumentation.language == language)

        total = query.count()
        documentation = query.order_by(
            ProductDocumentation.is_primary.desc(),
            ProductDocumentation.display_order,
            ProductDocumentation.created_at.desc(),
        ).offset(skip).limit(limit).all()

        return documentation, total

    @staticmethod
    def update_documentation(
        db: Session,
        doc_id: str,
        data: ProductDocumentationUpdate,
    ) -> ProductDocumentation:
        """Update documentation."""
        documentation = ProductDocumentationService.get_documentation(db, doc_id)

        try:
            if data.title is not None:
                documentation.title = data.title
            if data.description is not None:
                documentation.description = data.description
            if data.url is not None:
                documentation.url = data.url
            if data.document_type is not None:
                documentation.document_type = data.document_type
            if data.language is not None:
                documentation.language = data.language
            if data.display_order is not None:
                documentation.display_order = data.display_order
            if data.is_primary is not None:
                documentation.is_primary = data.is_primary

            db.commit()

            logger.info(f"Updated documentation: {doc_id}")

            return documentation

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating documentation: {str(e)}")
            raise

    @staticmethod
    def delete_documentation(db: Session, doc_id: str) -> None:
        """Delete documentation."""
        documentation = ProductDocumentationService.get_documentation(db, doc_id)

        try:
            db.delete(documentation)
            db.commit()

            logger.info(f"Deleted documentation: {doc_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting documentation: {str(e)}")
            raise


class ProductVideoService:
    """Service for managing product videos."""

    @staticmethod
    def create_video(
        db: Session,
        product_id: str,
        data: ProductVideoCreate,
    ) -> ProductVideo:
        """Create product video."""
        try:
            video = ProductVideo(
                id=str(uuid.uuid4()),
                product_id=product_id,
                title=data.title,
                description=data.description,
                url=data.url,
                thumbnail_url=data.thumbnail_url,
                video_type=data.video_type,
                duration_seconds=data.duration_seconds,
                source_platform=data.source_platform,
                display_order=data.display_order,
                is_featured=data.is_featured,
            )

            db.add(video)
            db.commit()

            logger.info(f"Created video for product {product_id}: {data.title}")

            return video

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating video: {str(e)}")
            raise

    @staticmethod
    def get_video(db: Session, video_id: str) -> ProductVideo:
        """Get video by ID."""
        video = db.query(ProductVideo).filter(
            ProductVideo.id == video_id
        ).first()

        if not video:
            raise NotFoundException(f"Video not found: {video_id}")

        return video

    @staticmethod
    def list_videos(
        db: Session,
        product_id: str,
        skip: int = 0,
        limit: int = 20,
        video_type: Optional[str] = None,
        is_featured: Optional[bool] = None,
    ) -> Tuple[list[ProductVideo], int]:
        """List videos for a product."""
        query = db.query(ProductVideo).filter(
            ProductVideo.product_id == product_id
        )

        if video_type:
            query = query.filter(ProductVideo.video_type == video_type)

        if is_featured is not None:
            query = query.filter(ProductVideo.is_featured == is_featured)

        total = query.count()
        videos = query.order_by(
            ProductVideo.is_featured.desc(),
            ProductVideo.display_order,
            ProductVideo.created_at.desc(),
        ).offset(skip).limit(limit).all()

        return videos, total

    @staticmethod
    def update_video(
        db: Session,
        video_id: str,
        data: ProductVideoUpdate,
    ) -> ProductVideo:
        """Update video."""
        video = ProductVideoService.get_video(db, video_id)

        try:
            if data.title is not None:
                video.title = data.title
            if data.description is not None:
                video.description = data.description
            if data.url is not None:
                video.url = data.url
            if data.thumbnail_url is not None:
                video.thumbnail_url = data.thumbnail_url
            if data.video_type is not None:
                video.video_type = data.video_type
            if data.duration_seconds is not None:
                video.duration_seconds = data.duration_seconds
            if data.source_platform is not None:
                video.source_platform = data.source_platform
            if data.display_order is not None:
                video.display_order = data.display_order
            if data.is_featured is not None:
                video.is_featured = data.is_featured

            db.commit()

            logger.info(f"Updated video: {video_id}")

            return video

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating video: {str(e)}")
            raise

    @staticmethod
    def delete_video(db: Session, video_id: str) -> None:
        """Delete video."""
        video = ProductVideoService.get_video(db, video_id)

        try:
            db.delete(video)
            db.commit()

            logger.info(f"Deleted video: {video_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting video: {str(e)}")
            raise

    @staticmethod
    def increment_view_count(db: Session, video_id: str) -> ProductVideo:
        """Increment video view count."""
        video = ProductVideoService.get_video(db, video_id)

        try:
            video.view_count += 1
            db.commit()

            return video

        except Exception as e:
            db.rollback()
            logger.error(f"Error incrementing view count: {str(e)}")
            raise
