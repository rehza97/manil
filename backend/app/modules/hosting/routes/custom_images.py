"""
VPS Hosting - Custom Docker Images API Routes

Endpoints for uploading, building, and managing custom Docker images.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from typing import List, Optional
import json

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.hosting.models import CustomDockerImage, ImageBuildLog, ImageBuildStatus
from app.modules.hosting.schemas import (
    CustomImageUploadRequest,
    CustomImageResponse,
    CustomImageDetailResponse,
    ImageBuildLogResponse,
    RebuildImageRequest,
    ImageApprovalRequest,
    CustomImageListResponse
)
from app.modules.hosting.services.image_build_service import DockerImageBuildService

router = APIRouter(
    prefix="/custom-images",
    tags=["VPS Custom Images"]
)


@router.post(
    "/upload",
    response_model=CustomImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload custom Docker image project"
)
async def upload_custom_image(
    file: UploadFile = File(..., description="Project archive (zip, tar, tar.gz)"),
    image_name: Optional[str] = Form(None),
    image_tag: str = Form("latest"),
    dockerfile_path: str = Form("Dockerfile"),
    build_args: Optional[str] = Form(None),
    subscription_id: Optional[str] = Form(None),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a custom Docker image project for building.

    **Process:**
    1. Upload archive (zip/tar/tar.gz) containing Dockerfile and project files
    2. System validates archive and Dockerfile
    3. Docker image is built automatically (async)
    4. Security scan is performed with Trivy
    5. Image is ready for use once status = COMPLETED

    **Requirements:**
    - Archive must contain a Dockerfile
    - Dockerfile must specify non-root USER
    - Maximum upload size: 500 MB
    - Allowed formats: .zip, .tar, .tar.gz, .tgz

    **Build Arguments:**
    Pass as JSON string, e.g.: {"NODE_VERSION": "18", "ENV": "production"}
    """
    try:
        # Parse build_args from JSON string
        build_args_dict = json.loads(build_args) if build_args else None

        # Create build service
        build_service = DockerImageBuildService(db)

        # Upload and create record
        image = await build_service.upload_project_files(
            customer_id=current_user.id,
            upload_file=file,
            filename=file.filename,
            subscription_id=subscription_id,
            image_name=image_name,
            image_tag=image_tag,
            dockerfile_path=dockerfile_path,
            build_args=build_args_dict
        )

        # Trigger async build via Celery
        from app.modules.hosting.tasks import build_docker_image_task
        build_docker_image_task.delay(str(image.id))

        return image

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.get(
    "",
    response_model=CustomImageListResponse,
    summary="List custom Docker images"
)
async def list_custom_images(
    page: int = 1,
    page_size: int = 20,
    status: Optional[ImageBuildStatus] = None,
    subscription_id: Optional[str] = None,
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    """
    List custom Docker images for the current user.

    **Filters:**
    - status: Filter by build status (PENDING, BUILDING, COMPLETED, etc.)
    - subscription_id: Filter by linked VPS subscription
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    """
    try:
        # Build query filters
        filters = [
            CustomDockerImage.customer_id == current_user.id,
            CustomDockerImage.is_deleted == False
        ]

        if status:
            filters.append(CustomDockerImage.status == status)

        if subscription_id:
            filters.append(CustomDockerImage.subscription_id == subscription_id)

        # Get total count
        count_query = select(func.count(CustomDockerImage.id)).where(and_(*filters))
        count_result = await db.execute(count_query)
        total = count_result.scalar()

        # Get paginated results
        query = (
            select(CustomDockerImage)
            .where(and_(*filters))
            .order_by(CustomDockerImage.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await db.execute(query)
        images = result.scalars().all()

        total_pages = (total + page_size - 1) // page_size

        return CustomImageListResponse(
            items=[CustomImageResponse.model_validate(img) for img in images],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list images: {str(e)}"
        )


@router.get(
    "/{image_id}",
    response_model=CustomImageDetailResponse,
    summary="Get custom Docker image details"
)
async def get_custom_image(
    image_id: str,
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a custom Docker image.

    Includes:
    - Build status and logs
    - Dockerfile content
    - Security scan results
    - Image metadata (size, exposed ports, etc.)
    """
    query = select(CustomDockerImage).where(
        CustomDockerImage.id == image_id,
        CustomDockerImage.customer_id == current_user.id,
        CustomDockerImage.is_deleted == False
    )

    result = await db.execute(query)
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom image not found"
        )

    return CustomImageDetailResponse.model_validate(image)


@router.get(
    "/{image_id}/logs",
    response_model=List[ImageBuildLogResponse],
    summary="Get build logs for custom image"
)
async def get_image_build_logs(
    image_id: str,
    step: Optional[str] = None,
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get build logs for a custom Docker image.

    **Filters:**
    - step: Filter by build step (validate, build, scan, etc.)

    Returns logs in chronological order.
    """
    # Verify image belongs to user
    image_query = select(CustomDockerImage).where(
        CustomDockerImage.id == image_id,
        CustomDockerImage.customer_id == current_user.id,
        CustomDockerImage.is_deleted == False
    )

    image_result = await db.execute(image_query)
    image = image_result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom image not found"
        )

    # Get logs
    filters = [ImageBuildLog.image_id == image_id]

    if step:
        filters.append(ImageBuildLog.step == step)

    logs_query = (
        select(ImageBuildLog)
        .where(and_(*filters))
        .order_by(ImageBuildLog.timestamp.asc())
    )

    logs_result = await db.execute(logs_query)
    logs = logs_result.scalars().all()

    return [ImageBuildLogResponse.model_validate(log) for log in logs]


@router.post(
    "/{image_id}/rebuild",
    response_model=CustomImageResponse,
    summary="Rebuild custom Docker image"
)
async def rebuild_custom_image(
    image_id: str,
    rebuild_request: RebuildImageRequest,
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Rebuild a custom Docker image with optional updated build arguments.

    Creates a new version of the image while preserving the original archive.
    Useful for:
    - Updating base image dependencies
    - Changing build arguments
    - Re-scanning for security vulnerabilities
    """
    # Get original image
    query = select(CustomDockerImage).where(
        CustomDockerImage.id == image_id,
        CustomDockerImage.customer_id == current_user.id,
        CustomDockerImage.is_deleted == False
    )

    result = await db.execute(query)
    original_image = result.scalar_one_or_none()

    if not original_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom image not found"
        )

    # Create new version
    new_version = original_image.version + 1
    new_build_args = rebuild_request.build_args or original_image.build_args

    # Create new image record
    new_image = CustomDockerImage(
        customer_id=current_user.id,
        subscription_id=original_image.subscription_id,
        image_name=original_image.image_name,
        image_tag=f"v{new_version}",
        upload_archive_path=original_image.upload_archive_path,
        upload_size_bytes=original_image.upload_size_bytes,
        upload_filename=original_image.upload_filename,
        dockerfile_path=original_image.dockerfile_path,
        dockerfile_content=original_image.dockerfile_content,
        build_args=new_build_args,
        status=ImageBuildStatus.PENDING,
        version=new_version,
        previous_version_id=original_image.id
    )

    db.add(new_image)
    await db.commit()
    await db.refresh(new_image)

    # Trigger async rebuild via Celery
    from app.modules.hosting.tasks import build_docker_image_task
    build_docker_image_task.delay(str(new_image.id))

    return CustomImageResponse.model_validate(new_image)


@router.delete(
    "/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete custom Docker image"
)
async def delete_custom_image(
    image_id: str,
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft delete a custom Docker image.

    **Note:** Images linked to active VPS subscriptions cannot be deleted.
    """
    # Get image
    query = select(CustomDockerImage).where(
        CustomDockerImage.id == image_id,
        CustomDockerImage.customer_id == current_user.id,
        CustomDockerImage.is_deleted == False
    )

    result = await db.execute(query)
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom image not found"
        )

    # Check if image is in use
    if image.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete image that is linked to an active subscription"
        )

    # Soft delete
    from datetime import datetime
    await db.execute(
        update(CustomDockerImage)
        .where(CustomDockerImage.id == image_id)
        .values(is_deleted=True, deleted_at=datetime.utcnow())
    )
    await db.commit()

    return None


@router.post(
    "/{image_id}/approve",
    response_model=CustomImageResponse,
    summary="Approve or reject custom image (Admin only)"
)
async def approve_or_reject_image(
    image_id: str,
    approval_request: ImageApprovalRequest,
    current_user: User = Depends(require_permission(Permission.HOSTING_APPROVE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a custom Docker image (Admin only).

    **Approval:**
    - Allows image to be used for VPS provisioning

    **Rejection:**
    - Marks image as REJECTED
    - Requires reason for rejection
    """
    # Get image
    query = select(CustomDockerImage).where(
        CustomDockerImage.id == image_id,
        CustomDockerImage.is_deleted == False
    )

    result = await db.execute(query)
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom image not found"
        )

    # Validate rejection reason
    if not approval_request.approved and not approval_request.reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )

    # Update image
    from datetime import datetime
    update_values = {}

    if approval_request.approved:
        # Approve
        if image.status != ImageBuildStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only approve images with COMPLETED status"
            )

        update_values = {
            "approved_at": datetime.utcnow(),
            "approved_by_id": current_user.id
        }
    else:
        # Reject
        update_values = {
            "status": ImageBuildStatus.REJECTED,
            "build_error": f"Rejected by admin: {approval_request.reason}"
        }

    await db.execute(
        update(CustomDockerImage)
        .where(CustomDockerImage.id == image_id)
        .values(**update_values)
    )
    await db.commit()

    # Refresh
    await db.refresh(image)

    return CustomImageResponse.model_validate(image)
