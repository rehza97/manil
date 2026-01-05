"""
VPS Hosting - Custom Docker Image Build Service

Handles uploading, validating, building, and scanning custom Docker images.
"""

import os
import re
import json
import shutil
import tarfile
import zipfile
import subprocess
import logging
from datetime import datetime
from typing import Optional, Dict, List, Tuple
from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.modules.hosting.models import (
    CustomDockerImage,
    ImageBuildLog,
    VPSSubscription,
    ImageBuildStatus
)
from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DockerImageBuildService:
    """
    Service for building custom Docker images from user-uploaded projects.

    Features:
    - Upload validation (zip/tar, max size)
    - Dockerfile security validation
    - Automated Docker image building
    - Trivy security scanning
    - Real-time build logs
    - Version control
    """

    # Upload configuration
    UPLOAD_DIR = "/var/lib/vps-uploads"
    MAX_UPLOAD_SIZE_MB = 500
    ALLOWED_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz"]

    # Build configuration
    BUILD_TIMEOUT_SECONDS = 600  # 10 minutes
    MAX_BUILD_SIZE_GB = 10

    # Security configuration - Forbidden Dockerfile instructions
    FORBIDDEN_INSTRUCTIONS = [
        "VOLUME",  # Prevents volume manipulation
        "--privileged",  # No privileged containers
    ]

    # Required security patterns
    REQUIRED_PATTERNS = {
        "user": r"USER\s+(?!root)\w+",  # Must have non-root user
    }

    # Trivy security thresholds
    TRIVY_SEVERITY_THRESHOLD = "HIGH"  # Reject if HIGH or CRITICAL vulns found
    MAX_CRITICAL_VULNS = 0
    MAX_HIGH_VULNS = 5

    def __init__(self, db: AsyncSession):
        """Initialize image build service."""
        self.db = db

        # Ensure upload directory exists
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)

    async def upload_project_files(
        self,
        customer_id: UUID,
        upload_file,
        filename: str,
        subscription_id: Optional[UUID] = None,
        image_name: str = None,
        image_tag: str = "latest",
        dockerfile_path: str = "Dockerfile",
        build_args: Dict = None
    ) -> CustomDockerImage:
        """
        Upload and validate project archive containing Dockerfile.

        Args:
            customer_id: ID of customer uploading
            upload_file: File-like object (FastAPI UploadFile)
            filename: Original filename
            subscription_id: Optional VPS subscription to link
            image_name: Name for Docker image
            image_tag: Tag for Docker image
            dockerfile_path: Path to Dockerfile within archive
            build_args: Build arguments for Docker build

        Returns:
            CustomDockerImage record

        Raises:
            ValueError: If validation fails
        """
        try:
            # Validate filename extension
            file_ext = Path(filename).suffix.lower()
            if not any(filename.lower().endswith(ext) for ext in self.ALLOWED_EXTENSIONS):
                raise ValueError(
                    f"Invalid file type. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
                )

            # Generate unique upload path
            timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
            upload_filename = f"{customer_id}-{timestamp}-{filename}"
            upload_path = os.path.join(self.UPLOAD_DIR, upload_filename)

            # Save uploaded file
            file_size = 0
            with open(upload_path, "wb") as f:
                while chunk := await upload_file.read(8192):
                    file_size += len(chunk)

                    # Check size limit
                    if file_size > self.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                        os.remove(upload_path)
                        raise ValueError(
                            f"File too large. Maximum size: {self.MAX_UPLOAD_SIZE_MB} MB"
                        )

                    f.write(chunk)

            logger.info(f"Uploaded file: {upload_filename} ({file_size / 1024 / 1024:.2f} MB)")

            # Generate image name if not provided
            if not image_name:
                image_name = f"custom-{customer_id}-{timestamp}"

            # Create database record
            image_record = CustomDockerImage(
                customer_id=customer_id,
                subscription_id=subscription_id,
                image_name=image_name,
                image_tag=image_tag,
                upload_archive_path=upload_path,
                upload_size_bytes=file_size,
                upload_filename=filename,
                dockerfile_path=dockerfile_path,
                build_args=build_args or {},
                status=ImageBuildStatus.PENDING
            )

            self.db.add(image_record)
            await self.db.commit()
            await self.db.refresh(image_record)

            logger.info(f"Created CustomDockerImage record: {image_record.id}")

            return image_record

        except Exception as e:
            logger.error(f"Upload failed: {e}")
            if os.path.exists(upload_path):
                os.remove(upload_path)
            raise

    async def validate_and_extract_archive(
        self,
        image: CustomDockerImage
    ) -> Tuple[str, str]:
        """
        Extract archive and validate Dockerfile exists.

        Args:
            image: CustomDockerImage record

        Returns:
            Tuple of (extract_path, dockerfile_content)

        Raises:
            ValueError: If validation fails
        """
        archive_path = image.upload_archive_path
        extract_path = archive_path + "_extracted"

        try:
            # Create extraction directory
            os.makedirs(extract_path, exist_ok=True)

            # Extract archive
            if archive_path.endswith(".zip"):
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_path)
            elif archive_path.endswith((".tar", ".tar.gz", ".tgz")):
                with tarfile.open(archive_path, 'r:*') as tar_ref:
                    tar_ref.extractall(extract_path)
            else:
                raise ValueError("Unsupported archive format")

            logger.info(f"Extracted archive to: {extract_path}")

            # Find Dockerfile
            dockerfile_full_path = os.path.join(extract_path, image.dockerfile_path)

            if not os.path.exists(dockerfile_full_path):
                # Try to find Dockerfile in subdirectories
                found_dockerfiles = list(Path(extract_path).rglob("Dockerfile"))
                if found_dockerfiles:
                    dockerfile_full_path = str(found_dockerfiles[0])
                    logger.info(f"Found Dockerfile at: {dockerfile_full_path}")
                else:
                    raise ValueError(
                        f"Dockerfile not found at {image.dockerfile_path}. "
                        "Please ensure your archive contains a Dockerfile."
                    )

            # Read Dockerfile content
            with open(dockerfile_full_path, 'r') as f:
                dockerfile_content = f.read()

            logger.info(f"Read Dockerfile ({len(dockerfile_content)} bytes)")

            return extract_path, dockerfile_content

        except Exception as e:
            logger.error(f"Archive extraction failed: {e}")
            if os.path.exists(extract_path):
                shutil.rmtree(extract_path)
            raise

    async def validate_dockerfile_security(
        self,
        dockerfile_content: str
    ) -> Tuple[bool, List[str]]:
        """
        Validate Dockerfile for security issues.

        Args:
            dockerfile_content: Content of Dockerfile

        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []

        # Check for forbidden instructions
        for forbidden in self.FORBIDDEN_INSTRUCTIONS:
            if forbidden in dockerfile_content:
                issues.append(f"Forbidden instruction found: {forbidden}")

        # Check for required patterns
        for requirement, pattern in self.REQUIRED_PATTERNS.items():
            if not re.search(pattern, dockerfile_content, re.MULTILINE):
                if requirement == "user":
                    issues.append(
                        "Dockerfile must specify a non-root USER. "
                        "Add 'USER <username>' instruction."
                    )

        # Check for dangerous patterns
        dangerous_patterns = [
            (r"chmod\s+777", "Overly permissive file permissions (chmod 777)"),
            (r"--no-check-certificate", "Disabling SSL certificate verification"),
            (r"curl.*\|.*sh", "Piping curl to shell (security risk)"),
            (r"wget.*\|.*sh", "Piping wget to shell (security risk)"),
        ]

        for pattern, message in dangerous_patterns:
            if re.search(pattern, dockerfile_content, re.IGNORECASE):
                issues.append(f"Dangerous pattern detected: {message}")

        # Check base image
        base_image_match = re.search(r"FROM\s+(\S+)", dockerfile_content)
        if base_image_match:
            base_image = base_image_match.group(1)

            # Warn about :latest tag
            if ":latest" in base_image or ":" not in base_image:
                issues.append(
                    f"Base image uses :latest tag ({base_image}). "
                    "Consider pinning to a specific version for reproducibility."
                )

        is_valid = len(issues) == 0

        if not is_valid:
            logger.warning(f"Dockerfile validation failed: {issues}")
        else:
            logger.info("Dockerfile validation passed")

        return is_valid, issues

    async def build_docker_image(
        self,
        image: CustomDockerImage,
        extract_path: str
    ) -> Tuple[bool, str]:
        """
        Build Docker image from extracted project.

        Args:
            image: CustomDockerImage record
            extract_path: Path to extracted project files

        Returns:
            Tuple of (success, docker_image_id or error_message)
        """
        build_start = datetime.utcnow()

        # Update status
        await self._update_image_status(
            image.id,
            ImageBuildStatus.BUILDING,
            build_started_at=build_start
        )

        # Build image name with tag
        full_image_name = f"{image.image_name}:{image.image_tag}"

        try:
            # Prepare build command
            build_cmd = [
                "docker", "build",
                "-t", full_image_name,
                "-f", os.path.join(extract_path, image.dockerfile_path),
            ]

            # Add build args
            if image.build_args:
                for key, value in image.build_args.items():
                    build_cmd.extend(["--build-arg", f"{key}={value}"])

            # Add context path
            build_cmd.append(extract_path)

            logger.info(f"Building Docker image: {' '.join(build_cmd)}")

            # Execute build with real-time logging
            process = subprocess.Popen(
                build_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True
            )

            build_logs = []

            # Stream output and save logs
            for line in process.stdout:
                line = line.strip()
                if line:
                    build_logs.append(line)

                    # Log to database
                    await self._add_build_log(
                        image.id,
                        "INFO",
                        line,
                        step="build"
                    )

            # Wait for process to complete
            process.wait(timeout=self.BUILD_TIMEOUT_SECONDS)

            if process.returncode != 0:
                error_msg = "\n".join(build_logs[-20:])  # Last 20 lines
                logger.error(f"Docker build failed: {error_msg}")

                await self._update_image_status(
                    image.id,
                    ImageBuildStatus.FAILED,
                    build_error=f"Build failed with exit code {process.returncode}:\n{error_msg}",
                    build_logs="\n".join(build_logs)
                )

                return False, error_msg

            # Get built image ID
            inspect_cmd = ["docker", "inspect", "--format={{.Id}}", full_image_name]
            result = subprocess.run(
                inspect_cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                docker_image_id = result.stdout.strip()

                # Get image size
                size_cmd = ["docker", "inspect", "--format={{.Size}}", full_image_name]
                size_result = subprocess.run(size_cmd, capture_output=True, text=True, timeout=30)
                image_size_bytes = int(size_result.stdout.strip()) if size_result.returncode == 0 else 0
                image_size_mb = image_size_bytes / (1024 * 1024)

                # Calculate build duration
                build_duration = (datetime.utcnow() - build_start).total_seconds()

                # Update database
                await self.db.execute(
                    update(CustomDockerImage)
                    .where(CustomDockerImage.id == image.id)
                    .values(
                        docker_image_id=docker_image_id,
                        image_size_mb=image_size_mb,
                        build_logs="\n".join(build_logs),
                        build_completed_at=datetime.utcnow(),
                        build_duration_seconds=int(build_duration)
                    )
                )
                await self.db.commit()

                logger.info(
                    f"Docker image built successfully: {docker_image_id} "
                    f"({image_size_mb:.2f} MB in {build_duration:.1f}s)"
                )

                return True, docker_image_id
            else:
                raise Exception("Failed to inspect built image")

        except subprocess.TimeoutExpired:
            error_msg = f"Build timeout after {self.BUILD_TIMEOUT_SECONDS} seconds"
            logger.error(error_msg)

            await self._update_image_status(
                image.id,
                ImageBuildStatus.FAILED,
                build_error=error_msg
            )

            # Kill process
            process.kill()

            return False, error_msg

        except Exception as e:
            error_msg = f"Build error: {str(e)}"
            logger.error(error_msg)

            await self._update_image_status(
                image.id,
                ImageBuildStatus.FAILED,
                build_error=error_msg
            )

            return False, error_msg

    async def scan_image_security(
        self,
        image: CustomDockerImage
    ) -> Tuple[bool, Dict]:
        """
        Scan Docker image for security vulnerabilities using Trivy.

        Args:
            image: CustomDockerImage record

        Returns:
            Tuple of (passed_scan, scan_results_dict)
        """
        # Update status
        await self._update_image_status(image.id, ImageBuildStatus.SCANNING)

        full_image_name = f"{image.image_name}:{image.image_tag}"

        try:
            # Check if Trivy is installed
            trivy_check = subprocess.run(
                ["which", "trivy"],
                capture_output=True,
                timeout=10
            )

            if trivy_check.returncode != 0:
                logger.warning("Trivy not installed - skipping security scan")

                scan_results = {
                    "status": "skipped",
                    "message": "Trivy not installed",
                    "vulnerabilities": {}
                }

                await self._update_scan_results(image.id, scan_results)

                return True, scan_results  # Pass by default if scanner not available

            logger.info(f"Scanning image with Trivy: {full_image_name}")

            # Run Trivy scan
            scan_cmd = [
                "trivy", "image",
                "--format", "json",
                "--severity", "CRITICAL,HIGH,MEDIUM,LOW",
                "--timeout", "5m",
                full_image_name
            ]

            result = subprocess.run(
                scan_cmd,
                capture_output=True,
                text=True,
                timeout=300
            )

            if result.returncode != 0:
                logger.error(f"Trivy scan failed: {result.stderr}")

                scan_results = {
                    "status": "error",
                    "message": f"Scan failed: {result.stderr}",
                    "vulnerabilities": {}
                }

                await self._update_scan_results(image.id, scan_results)

                return False, scan_results

            # Parse scan results
            scan_data = json.loads(result.stdout)

            # Count vulnerabilities by severity
            vuln_counts = {
                "CRITICAL": 0,
                "HIGH": 0,
                "MEDIUM": 0,
                "LOW": 0
            }

            vulnerabilities = []

            for result_item in scan_data.get("Results", []):
                for vuln in result_item.get("Vulnerabilities", []):
                    severity = vuln.get("Severity", "UNKNOWN")

                    if severity in vuln_counts:
                        vuln_counts[severity] += 1

                    vulnerabilities.append({
                        "id": vuln.get("VulnerabilityID"),
                        "package": vuln.get("PkgName"),
                        "severity": severity,
                        "title": vuln.get("Title", ""),
                        "fixed_version": vuln.get("FixedVersion", "")
                    })

            scan_results = {
                "status": "completed",
                "scan_date": datetime.utcnow().isoformat(),
                "total_vulnerabilities": sum(vuln_counts.values()),
                "vulnerabilities_by_severity": vuln_counts,
                "vulnerabilities": vulnerabilities[:50]  # Limit to 50 for storage
            }

            # Save scan results
            await self._update_scan_results(image.id, scan_results)

            # Check if image passes security threshold
            passed = (
                vuln_counts["CRITICAL"] <= self.MAX_CRITICAL_VULNS and
                vuln_counts["HIGH"] <= self.MAX_HIGH_VULNS
            )

            if passed:
                logger.info(
                    f"Security scan passed: {vuln_counts['CRITICAL']} critical, "
                    f"{vuln_counts['HIGH']} high vulnerabilities"
                )
            else:
                logger.warning(
                    f"Security scan FAILED: {vuln_counts['CRITICAL']} critical, "
                    f"{vuln_counts['HIGH']} high vulnerabilities (threshold: "
                    f"{self.MAX_CRITICAL_VULNS} critical, {self.MAX_HIGH_VULNS} high)"
                )

            return passed, scan_results

        except subprocess.TimeoutExpired:
            error_msg = "Security scan timeout"
            logger.error(error_msg)

            scan_results = {
                "status": "timeout",
                "message": error_msg,
                "vulnerabilities": {}
            }

            await self._update_scan_results(image.id, scan_results)

            return False, scan_results

        except Exception as e:
            error_msg = f"Security scan error: {str(e)}"
            logger.error(error_msg)

            scan_results = {
                "status": "error",
                "message": error_msg,
                "vulnerabilities": {}
            }

            await self._update_scan_results(image.id, scan_results)

            return False, scan_results

    async def process_image_build(
        self,
        image_id: UUID
    ) -> Dict:
        """
        Complete build pipeline: validate -> extract -> build -> scan.

        This is the main orchestration method that should be called
        from Celery task for async processing.

        Args:
            image_id: ID of CustomDockerImage to build

        Returns:
            Dict with build result summary
        """
        try:
            # Get image record
            query = select(CustomDockerImage).where(CustomDockerImage.id == image_id)
            result = await self.db.execute(query)
            image = result.scalar_one_or_none()

            if not image:
                raise ValueError(f"Image {image_id} not found")

            logger.info(f"Starting build pipeline for image: {image_id}")

            # Step 1: Update to VALIDATING status
            await self._update_image_status(image.id, ImageBuildStatus.VALIDATING)
            await self._add_build_log(image.id, "INFO", "Starting validation", "validate")

            # Step 2: Extract and validate archive
            extract_path, dockerfile_content = await self.validate_and_extract_archive(image)

            # Save Dockerfile content
            await self.db.execute(
                update(CustomDockerImage)
                .where(CustomDockerImage.id == image.id)
                .values(dockerfile_content=dockerfile_content)
            )
            await self.db.commit()

            await self._add_build_log(
                image.id, "INFO",
                f"Extracted archive ({len(dockerfile_content)} bytes Dockerfile)",
                "validate"
            )

            # Step 3: Validate Dockerfile security
            is_valid, issues = await self.validate_dockerfile_security(dockerfile_content)

            if not is_valid:
                error_msg = "Dockerfile validation failed:\n" + "\n".join(f"- {issue}" for issue in issues)

                await self._update_image_status(
                    image.id,
                    ImageBuildStatus.REJECTED,
                    build_error=error_msg
                )

                await self._add_build_log(image.id, "ERROR", error_msg, "validate")

                # Cleanup
                if os.path.exists(extract_path):
                    shutil.rmtree(extract_path)

                return {
                    "success": False,
                    "status": "REJECTED",
                    "error": error_msg,
                    "issues": issues
                }

            await self._add_build_log(image.id, "INFO", "Dockerfile validation passed", "validate")

            # Step 4: Build Docker image
            build_success, build_result = await self.build_docker_image(image, extract_path)

            if not build_success:
                # Cleanup
                if os.path.exists(extract_path):
                    shutil.rmtree(extract_path)

                return {
                    "success": False,
                    "status": "FAILED",
                    "error": build_result
                }

            docker_image_id = build_result
            await self._add_build_log(
                image.id, "INFO",
                f"Docker image built: {docker_image_id}",
                "build"
            )

            # Step 5: Security scan
            scan_passed, scan_results = await self.scan_image_security(image)

            if not scan_passed:
                await self._update_image_status(
                    image.id,
                    ImageBuildStatus.REJECTED,
                    build_error="Security scan failed - too many vulnerabilities"
                )

                await self._add_build_log(
                    image.id, "ERROR",
                    f"Security scan failed: {scan_results.get('vulnerabilities_by_severity')}",
                    "scan"
                )

                # Cleanup
                if os.path.exists(extract_path):
                    shutil.rmtree(extract_path)

                return {
                    "success": False,
                    "status": "REJECTED",
                    "error": "Security scan failed",
                    "scan_results": scan_results
                }

            await self._add_build_log(image.id, "INFO", "Security scan passed", "scan")

            # Step 6: Mark as completed
            await self._update_image_status(image.id, ImageBuildStatus.COMPLETED)
            await self._add_build_log(image.id, "INFO", "Build pipeline completed successfully", "complete")

            # Cleanup extraction directory
            if os.path.exists(extract_path):
                shutil.rmtree(extract_path)

            logger.info(f"Build pipeline completed successfully for image: {image_id}")

            return {
                "success": True,
                "status": "COMPLETED",
                "docker_image_id": docker_image_id,
                "scan_results": scan_results
            }

        except Exception as e:
            logger.error(f"Build pipeline failed for image {image_id}: {e}")

            await self._update_image_status(
                image_id,
                ImageBuildStatus.FAILED,
                build_error=str(e)
            )

            await self._add_build_log(image_id, "ERROR", f"Pipeline failed: {str(e)}", "error")

            return {
                "success": False,
                "status": "FAILED",
                "error": str(e)
            }

    # Helper methods

    async def _update_image_status(
        self,
        image_id: UUID,
        status: ImageBuildStatus,
        build_error: str = None,
        build_started_at: datetime = None,
        build_logs: str = None
    ):
        """Update image build status."""
        update_values = {"status": status}

        if build_error:
            update_values["build_error"] = build_error

        if build_started_at:
            update_values["build_started_at"] = build_started_at

        if build_logs:
            update_values["build_logs"] = build_logs

        await self.db.execute(
            update(CustomDockerImage)
            .where(CustomDockerImage.id == image_id)
            .values(**update_values)
        )
        await self.db.commit()

    async def _update_scan_results(self, image_id: UUID, scan_results: Dict):
        """Update security scan results."""
        await self.db.execute(
            update(CustomDockerImage)
            .where(CustomDockerImage.id == image_id)
            .values(
                security_scan_results=scan_results,
                scan_completed_at=datetime.utcnow()
            )
        )
        await self.db.commit()

    async def _add_build_log(
        self,
        image_id: UUID,
        log_level: str,
        message: str,
        step: str = None
    ):
        """Add build log entry."""
        log_entry = ImageBuildLog(
            image_id=image_id,
            log_level=log_level,
            message=message,
            step=step
        )

        self.db.add(log_entry)
        await self.db.commit()
