"""
Service Domain Service - Manages VPS service domain lifecycle.

Orchestrates domain creation, DNS integration, and nginx proxy configuration
for VPS services.
"""
import os
import re
import hashlib
import logging
import base64
from typing import List, Dict, Optional, Tuple, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.models import (
    VPSServiceDomain,
    DomainType,
    VPSSubscription,
    DNSZone,
    DNSRecord,
    ContainerInstance
)
from app.modules.hosting.repository import VPSServiceDomainRepository
from app.modules.hosting.services.nginx_proxy_service import NginxProxyService
from app.modules.hosting.services.dns_management_service import DNSManagementService
from app.modules.hosting.dns_repository import DNSZoneRepository, DNSRecordRepository
from app.modules.hosting.dns_schemas import DNSZoneCreate

logger = logging.getLogger(__name__)


class ServiceDomainService:
    """Service for managing VPS service domains."""

    def __init__(self, db: AsyncSession):
        """Initialize service domain service."""
        self.db = db
        self.domain_repo = VPSServiceDomainRepository(db)
        self.nginx_service = NginxProxyService()
        self.dns_service = DNSManagementService(db)
        self.dns_zone_repo = DNSZoneRepository(db)
        self.dns_record_repo = DNSRecordRepository(db)

    def _sanitize_service_name(self, service_name: str) -> str:
        """
        Sanitize service name for use in subdomain.

        Args:
            service_name: Raw service name

        Returns:
            Sanitized service name (lowercase, alphanumeric + hyphens only)
        """
        # Convert to lowercase
        sanitized = service_name.lower()

        # Replace non-alphanumeric characters with hyphens
        sanitized = re.sub(r'[^a-z0-9-]', '-', sanitized)

        # Remove consecutive hyphens
        sanitized = re.sub(r'-+', '-', sanitized)

        # Remove leading/trailing hyphens
        sanitized = sanitized.strip('-')

        # Truncate to 63 characters (DNS label limit)
        sanitized = sanitized[:63]

        return sanitized or "service"

    def _generate_subdomain(
        self,
        service_name: str,
        subscription_id: str,
        base_domain: str
    ) -> str:
        """
        Generate auto subdomain for a service.

        Pattern: {service}.{subscription_hash}.vps.{base_domain}
        Example: web.a1b2c3d4.vps.example.com

        Args:
            service_name: Name of the service
            subscription_id: VPS subscription ID (used for uniqueness)
            base_domain: Base domain for subdomains

        Returns:
            Generated subdomain
        """
        # Sanitize service name
        safe_service = self._sanitize_service_name(service_name)

        # Generate subscription hash (8 chars) - unique per subscription
        subscription_hash = hashlib.md5(subscription_id.encode()).hexdigest()[:8]

        # Build subdomain
        subdomain = f"{safe_service}.{subscription_hash}.vps.{base_domain}"

        return subdomain

    async def _get_vps_ip(self, subscription_id: str) -> Optional[str]:
        """
        Get VPS container IP address.

        Args:
            subscription_id: VPS subscription ID

        Returns:
            VPS IP address or None
        """
        from app.modules.hosting.repository import ContainerInstanceRepository

        container_repo = ContainerInstanceRepository(self.db)
        container = await container_repo.get_by_subscription_id(subscription_id)

        if not container:
            logger.error(f"Container not found for subscription: {subscription_id}")
            return None

        return container.ip_address

    async def _create_dns_records(
        self,
        domain: str,
        target_ip: str,
        subscription_id: str,
        customer_id: str
    ) -> Tuple[Optional[DNSZone], Optional[DNSRecord]]:
        """
        Create DNS zone and A record for domain.

        Args:
            domain: Domain name
            target_ip: Target IP address (host public IP)
            subscription_id: VPS subscription ID
            customer_id: Customer ID for zone ownership

        Returns:
            Tuple of (DNSZone, DNSRecord) or (None, None) if failed
        """
        try:
            # Check if zone already exists
            zone = await self.dns_zone_repo.get_by_name(domain)

            if not zone:
                # Create new zone using DNSZoneCreate schema
                zone_data = DNSZoneCreate(
                    zone_name=domain,
                    subscription_id=subscription_id,
                    ttl_default=300,
                    notes="Auto-created for VPS service domain"
                )
                zone = await self.dns_service.create_zone(
                    zone_data=zone_data,
                    customer_id=customer_id
                )
                logger.info(f"Created DNS zone: {domain}")

            # Create A record
            record = await self.dns_service.create_record(
                zone_id=zone.id,
                record_type="A",
                record_name="@",
                record_value=target_ip,
                ttl=300
            )
            logger.info(f"Created DNS A record: {domain} -> {target_ip}")

            return zone, record

        except Exception as e:
            logger.error(f"Failed to create DNS records for {domain}: {e}", exc_info=True)
            return None, None

    async def _write_external_nginx_configs(
        self,
        created_domains: List[VPSServiceDomain],
        container: ContainerInstance
    ) -> bool:
        """
        Write external nginx proxy configuration files for service domains.
        
        This is independent of internal VPS nginx configuration. External nginx
        routes traffic from the internet to the VPS HTTP port.
        
        Args:
            created_domains: List of created service domains
            container: Container instance with http_port
            
        Returns:
            True if all configs were written successfully, False otherwise
        """
        if not created_domains:
            logger.info("No domains to configure, skipping external nginx config")
            return True
            
        if not container.http_port:
            logger.warning(f"Container {container.container_name} has no HTTP port, skipping external nginx config")
            return False
        
        logger.info(f"Starting external nginx configuration for {len(created_domains)} domains in container {container.container_name}")
        logger.info(f"Container HTTP port: {container.http_port}, IP: {container.ip_address}")
        
        try:
            # Import NginxAutoConfigService for external config generation
            from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService
            nginx_service = NginxAutoConfigService()
            
            # Get nginx config directory from environment variable
            # Default to relative path from project root (works in dev)
            # In Docker, this should be set via environment variable
            nginx_config_dir = os.getenv("NGINX_CONFIG_DIR")
            if not nginx_config_dir:
                # Check if running in Docker with volume mount
                if os.path.exists("/app/nginx/sites-enabled"):
                    # Running in Docker with volume mount
                    nginx_config_dir = "/app/nginx/sites-enabled"
                else:
                    # Running outside Docker (dev mode)
                    # Calculate path relative to project root
                    # File structure: backend/app/modules/hosting/services/service_domain_service.py
                    # Go up 5 levels: services -> hosting -> modules -> app -> backend -> project root
                    from pathlib import Path
                    file_path = Path(__file__).resolve()
                    project_root = file_path.parents[5]  # Go up to project root (manil/)
                    nginx_config_dir = str(project_root / "nginx" / "sites-enabled")
            
            logger.info(f"Using nginx config directory: {nginx_config_dir}")
            
            # Validate directory exists and is writable
            try:
                os.makedirs(nginx_config_dir, exist_ok=True)
                # Test write permission
                test_file = os.path.join(nginx_config_dir, ".write_test")
                try:
                    with open(test_file, 'w') as f:
                        f.write("test")
                    os.remove(test_file)
                    logger.info(f"Verified nginx config directory is writable: {nginx_config_dir}")
                except Exception as e:
                    logger.error(f"Nginx config directory is not writable: {nginx_config_dir}, error: {e}")
                    return False
            except Exception as e:
                logger.error(f"Failed to create or validate nginx config directory {nginx_config_dir}: {e}", exc_info=True)
                return False
            
            configs_written = 0
            written_config_files = []
            
            # Write external nginx config for each domain
            for domain in created_domains:
                logger.info(f"Generating external nginx config for domain: {domain.domain_name} (port: {container.http_port})")
                external_config = nginx_service.update_external_nginx_config(
                    domain_name=domain.domain_name,
                    vps_http_port=container.http_port
                )
                
                # Write external nginx config file
                config_file_path = os.path.join(nginx_config_dir, f"{domain.domain_name}.conf")
                try:
                    with open(config_file_path, 'w') as f:
                        f.write(external_config)
                    
                    # Verify file was written and is readable
                    if not os.path.exists(config_file_path):
                        logger.error(f"Config file was not created: {config_file_path}")
                        continue
                    
                    # Verify file is readable
                    with open(config_file_path, 'r') as f:
                        content = f.read()
                        if not content or len(content) < 50:  # Basic sanity check
                            logger.error(f"Config file appears to be empty or too small: {config_file_path}")
                            continue
                    
                    logger.info(f"Successfully created external nginx config: {config_file_path} ({len(content)} bytes)")
                    configs_written += 1
                    written_config_files.append(config_file_path)
                except Exception as e:
                    logger.error(f"Failed to write nginx config to {config_file_path}: {e}", exc_info=True)
            
            if configs_written == 0:
                logger.error("No external nginx configs were written successfully")
                return False
            
            logger.info(f"Successfully wrote {configs_written} external nginx config files")
            
            # Reload external nginx proxy container with retry logic
            import docker
            import time
            nginx_reloaded = False
            max_retries = 3
            retry_delay = 1
            
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"Attempting to reload external nginx proxy (attempt {attempt}/{max_retries})")
                    docker_client = docker.from_env()
                    nginx_proxy = docker_client.containers.get("cloudmanager-nginx-proxy")
                    
                    # Test nginx config before reload
                    test_result = nginx_proxy.exec_run("nginx -t")
                    if test_result.exit_code != 0:
                        error_output = test_result.output.decode() if test_result.output else "Unknown error"
                        logger.error(f"Nginx config test failed: {error_output}")
                        if attempt < max_retries:
                            logger.info(f"Retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                            continue
                        return False
                    
                    # Reload nginx
                    reload_result = nginx_proxy.exec_run("nginx -s reload")
                    if reload_result.exit_code == 0:
                        logger.info("Successfully reloaded external nginx proxy")
                        nginx_reloaded = True
                        break
                    else:
                        error_output = reload_result.output.decode() if reload_result.output else "Unknown error"
                        logger.warning(f"Failed to reload external nginx (attempt {attempt}): {error_output}")
                        if attempt < max_retries:
                            logger.info(f"Retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            retry_delay *= 2
                except docker.errors.NotFound:
                    logger.error("nginx-proxy container not found")
                    return False
                except Exception as e:
                    logger.warning(f"Failed to reload external nginx (attempt {attempt}): {e}")
                    if attempt < max_retries:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                    else:
                        logger.error(f"All retry attempts failed for nginx reload: {e}")
            
            if not nginx_reloaded:
                logger.error("Failed to reload external nginx after all retry attempts")
                return False
            
            # Final validation: verify all config files still exist
            for config_file_path in written_config_files:
                if not os.path.exists(config_file_path):
                    logger.error(f"Config file disappeared after reload: {config_file_path}")
                    return False
            
            # Only mark domains as proxy_configured if all validations passed
            for domain in created_domains:
                domain.proxy_configured = True
            await self.db.commit()
            
            logger.info(f"Successfully configured external nginx for {configs_written} domains")
            return True
            
        except Exception as e:
            logger.error(f"Error writing external nginx configs: {e}", exc_info=True)
            return False

    async def auto_create_domains_for_deployment(
        self,
        subscription_id: str,
        service_routes: List[Dict],
        base_domain: str
    ) -> List[VPSServiceDomain]:
        """
        Auto-create domains for services discovered during deployment.

        Args:
            subscription_id: VPS subscription ID
            service_routes: List of service route dicts with keys:
                           - service: service name
                           - port: service port
                           - url: current URL (will be replaced)
            base_domain: Base domain for subdomain generation

        Returns:
            List of created VPSServiceDomain objects
        """
        created_domains = []

        # Get container instance to find container name and HTTP port
        from app.modules.hosting.repository import ContainerInstanceRepository
        from app.modules.hosting.models import ContainerInstance

        container_repo = ContainerInstanceRepository(self.db)
        container = await container_repo.get_by_subscription_id(subscription_id)

        if not container:
            logger.warning(f"No container found for subscription {subscription_id}")
            return []

        if not container.http_port:
            logger.warning(f"Container {container.container_name} has no HTTP port configured")
            return []

        vps_ip = container.ip_address  # Keep for backward compatibility if needed

        # Get host public IP from environment
        host_public_ip = os.getenv("HOST_PUBLIC_IP", "127.0.0.1")

        # Get customer ID from subscription
        from app.modules.hosting.repository import VPSSubscriptionRepository
        subscription_repo = VPSSubscriptionRepository(self.db)
        subscription = await subscription_repo.get_by_id(subscription_id)

        if not subscription:
            logger.error(f"Subscription not found: {subscription_id}")
            return []

        customer_id = subscription.customer_id

        # Import NginxAutoConfigService
        from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService

        # Initialize nginx auto-config service
        nginx_service = NginxAutoConfigService()

        for route in service_routes:
            service_name = route.get("service", "")
            service_port = route.get("port", 0)

            if not service_name or not service_port:
                logger.warning(f"Invalid service route: {route}")
                continue

            try:
                # Check if domain already exists for this service
                existing_domain = await self.domain_repo.get_by_subscription_and_service(
                    subscription_id, service_name
                )

                if existing_domain:
                    logger.info(f"Domain already exists for {service_name}, skipping")
                    created_domains.append(existing_domain)
                    continue

                # Generate subdomain
                domain_name = self._generate_subdomain(service_name, subscription_id, base_domain)

                # Check if domain name is taken
                if await self.domain_repo.domain_exists(domain_name):
                    logger.warning(f"Domain already exists: {domain_name}, skipping")
                    continue

                # Create DNS records
                dns_zone, dns_record = await self._create_dns_records(
                    domain_name, host_public_ip, subscription_id, customer_id
                )

                # Note: Nginx configuration is now handled after all domains are created
                # (see Phase 5.3-5.5) to configure nginx inside VPS and external proxy
                nginx_success = True  # Will be updated after nginx configuration

                # Create database record
                service_domain = VPSServiceDomain(
                    subscription_id=subscription_id,
                    service_name=service_name,
                    service_port=service_port,
                    domain_type=DomainType.AUTO,
                    domain_name=domain_name,
                    is_active=True,
                    dns_zone_id=dns_zone.id if dns_zone else None,
                    dns_record_id=dns_record.id if dns_record else None,
                    proxy_configured=False  # Will be updated to True after nginx configuration completes
                )

                created_domain = await self.domain_repo.create(service_domain)
                await self.db.commit()

                logger.info(f"Created service domain: {domain_name} for {service_name}")
                created_domains.append(created_domain)

            except Exception as e:
                logger.error(f"Failed to create domain for {service_name}: {e}", exc_info=True)
                await self.db.rollback()
                continue

        # Always write external nginx configs (independent of internal nginx configuration)
        # External nginx routes traffic from internet → VPS HTTP port
        logger.info(f"Configuring external nginx for {len(created_domains)} domains")
        external_nginx_success = await self._write_external_nginx_configs(created_domains, container)
        
        if not external_nginx_success:
            logger.error("Failed to configure external nginx - domains will not be accessible")
            # Don't mark as configured if external nginx failed
            return created_domains

        # Configure internal nginx inside VPS (required for full functionality)
        # Internal nginx routes traffic within VPS container between services
        logger.info(f"Configuring internal nginx for {len(created_domains)} domains in VPS {container.container_name}")
        internal_nginx_success = False
        
        try:
            # Import NginxAutoConfigService for internal nginx configuration
            from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService
            nginx_auto_service = NginxAutoConfigService()

            # Build domain-port mappings from created domains (use actual domain names from database)
            domain_port_mappings = [
                {
                    'domain_name': domain.domain_name,
                    'port': domain.service_port
                }
                for domain in created_domains
            ]

            logger.info(f"Domain-port mappings for internal nginx: {domain_port_mappings}")

            # Configure nginx inside VPS using actual domain names
            internal_nginx_success = await nginx_auto_service.configure_nginx_in_vps(
                container_name=container.container_name,
                domain_port_mappings=domain_port_mappings
            )

            if not internal_nginx_success:
                logger.error(f"Failed to configure internal nginx inside VPS {container.container_name}")
                logger.error("Domains may be partially accessible (external nginx works, but internal routing may fail)")
            else:
                logger.info(f"Successfully configured internal nginx for {len(created_domains)} domains")

        except Exception as e:
            logger.error(f"Error configuring nginx inside VPS: {e}", exc_info=True)
            internal_nginx_success = False

        # Only mark domains as fully configured if both external and internal nginx are working
        # Note: External nginx is already marked as configured in _write_external_nginx_configs
        # We don't unmark it here, but we log the status
        if not internal_nginx_success:
            logger.warning("Internal nginx configuration failed - domains may have limited functionality")
            # External nginx is configured, so domains are partially accessible
            # Internal nginx failure means service routing within VPS may not work
        else:
            logger.info("Both external and internal nginx are configured successfully")

        return created_domains

    async def detect_and_create_domains(
        self,
        subscription_id: str
    ) -> List[VPSServiceDomain]:
        """
        Detect services from docker ps inside the VPS container and create domains for them.
        
        Args:
            subscription_id: VPS subscription ID
            
        Returns:
            List of created VPSServiceDomain objects
        """
        # Get container instance
        from app.modules.hosting.repository import ContainerInstanceRepository
        container_repo = ContainerInstanceRepository(self.db)
        container_instance = await container_repo.get_by_subscription_id(subscription_id)
        
        if not container_instance:
            logger.warning(f"No container found for subscription {subscription_id}")
            return []
            
        if not container_instance.http_port:
            logger.warning(f"Container {container_instance.container_name} has no HTTP port configured")
            return []
        
        # Get Docker client and VPS container
        import docker
        try:
            docker_client = docker.from_env()
            vps_container = docker_client.containers.get(container_instance.container_name)
        except docker.errors.NotFound:
            logger.error(f"VPS container not found: {container_instance.container_name}")
            return []
        except Exception as e:
            logger.error(f"Failed to get Docker client: {e}")
            return []
        
        # Detect services from docker ps
        service_routes = []
        
        try:
            # Run docker ps inside the VPS container
            ps_result = vps_container.exec_run(
                "sh -c 'docker ps --format \"{{.Names}}\\t{{.Ports}}\" 2>/dev/null'",
                user="root"
            )
            
            if ps_result.exit_code == 0 and ps_result.output:
                ports_output = ps_result.output.decode('utf-8', errors='replace').strip()
                vps_ip = container_instance.ip_address
                
                # Parse docker ps output
                for line in ports_output.split('\n'):
                    if '\t' not in line:
                        continue
                        
                    container_name, ports_str = line.split('\t', 1)
                    if not ports_str or ports_str.strip() == '':
                        continue
                    
                    # Parse port mappings like "0.0.0.0:8000->8000/tcp, 0.0.0.0:5173->5173/tcp"
                    port_matches = re.findall(r'0\.0\.0\.0:(\d+)->\d+/tcp', ports_str)
                    for host_port in port_matches:
                        service_routes.append({
                            "service": container_name,
                            "port": int(host_port),
                            "url": f"http://{vps_ip}:{host_port}",
                            "internal_port": None
                        })
        except Exception as e:
            logger.error(f"Failed to detect services from docker ps: {e}", exc_info=True)
            return []
        
        if not service_routes:
            logger.info(f"No services detected for subscription {subscription_id}")
            return []
        
        # Get base domain from environment
        base_domain = os.getenv("VPS_BASE_DOMAIN", "vps.localhost")
        
        # Create domains for detected services
        return await self.auto_create_domains_for_deployment(
            subscription_id=subscription_id,
            service_routes=service_routes,
            base_domain=base_domain
        )

    async def create_custom_domain(
        self,
        subscription_id: str,
        service_name: str,
        custom_domain: str,
        service_port: int
    ) -> VPSServiceDomain:
        """
        Create a custom domain for a service.

        Args:
            subscription_id: VPS subscription ID
            service_name: Service name
            custom_domain: Custom domain name
            service_port: Service port

        Returns:
            Created VPSServiceDomain

        Raises:
            ValueError: If domain already exists or validation fails
        """
        # Validate domain name
        if not re.match(r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$', custom_domain):
            raise ValueError(f"Invalid domain name: {custom_domain}")

        # Check if domain already exists
        if await self.domain_repo.domain_exists(custom_domain):
            raise ValueError(f"Domain already exists: {custom_domain}")

        # Get VPS IP
        vps_ip = await self._get_vps_ip(subscription_id)
        if not vps_ip:
            raise ValueError(f"VPS IP not found for subscription: {subscription_id}")

        # Create nginx configuration
        nginx_success = await self.nginx_service.add_service_route(
            custom_domain, vps_ip, service_port
        )

        # Note: For custom domains, DNS is managed externally by the user
        # We don't create DNS records automatically

        # Create database record
        service_domain = VPSServiceDomain(
            subscription_id=subscription_id,
            service_name=service_name,
            service_port=service_port,
            domain_type=DomainType.CUSTOM,
            domain_name=custom_domain,
            is_active=True,
            dns_zone_id=None,  # User manages DNS externally
            dns_record_id=None,
            proxy_configured=nginx_success
        )

        created_domain = await self.domain_repo.create(service_domain)
        await self.db.commit()

        logger.info(f"Created custom domain: {custom_domain} for {service_name}")
        return created_domain

    async def delete_service_domain(self, domain_id: str) -> bool:
        """
        Delete a service domain.

        Args:
            domain_id: Service domain ID

        Returns:
            True if successful, False otherwise
        """
        try:
            domain = await self.domain_repo.get_by_id(domain_id)
            if not domain:
                logger.warning(f"Domain not found: {domain_id}")
                return False

            # Remove nginx configuration
            nginx_success = await self.nginx_service.remove_service_route(domain.domain_name)
            if not nginx_success:
                logger.warning(f"Failed to remove nginx config for {domain.domain_name}")

            # Remove DNS records (only for auto-generated domains)
            if domain.domain_type == DomainType.AUTO and domain.dns_zone_id:
                try:
                    await self.dns_service.delete_zone(domain.dns_zone_id)
                    logger.info(f"Deleted DNS zone for {domain.domain_name}")
                except Exception as e:
                    logger.warning(f"Failed to delete DNS zone: {e}")

            # Delete database record
            await self.domain_repo.delete(domain)
            await self.db.commit()

            logger.info(f"Deleted service domain: {domain.domain_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete service domain {domain_id}: {e}", exc_info=True)
            await self.db.rollback()
            return False

    async def get_domains_by_subscription(
        self,
        subscription_id: str
    ) -> List[VPSServiceDomain]:
        """
        Get all domains for a subscription.

        Args:
            subscription_id: VPS subscription ID

        Returns:
            List of VPSServiceDomain objects
        """
        return await self.domain_repo.get_by_subscription(subscription_id)

    async def update_domain_status(
        self,
        domain_id: str,
        is_active: bool
    ) -> Optional[VPSServiceDomain]:
        """
        Update domain active status.

        Args:
            domain_id: Service domain ID
            is_active: Active status

        Returns:
            Updated VPSServiceDomain or None
        """
        try:
            domain = await self.domain_repo.get_by_id(domain_id)
            if not domain:
                return None

            domain.is_active = is_active

            if not is_active:
                # Remove nginx configuration when deactivating
                await self.nginx_service.remove_service_route(domain.domain_name)
                domain.proxy_configured = False
            else:
                # Re-add nginx configuration when activating
                vps_ip = await self._get_vps_ip(domain.subscription_id)
                if vps_ip:
                    nginx_success = await self.nginx_service.add_service_route(
                        domain.domain_name, vps_ip, domain.service_port
                    )
                    domain.proxy_configured = nginx_success

            updated_domain = await self.domain_repo.update(domain)
            await self.db.commit()

            return updated_domain

        except Exception as e:
            logger.error(f"Failed to update domain status: {e}", exc_info=True)
            await self.db.rollback()
            return None

    async def fix_nginx_configuration(
        self,
        subscription_id: str
    ) -> Dict[str, Any]:
        """
        Fix/repair nginx configuration for an existing VPS subscription.
        
        This method re-runs both external and internal nginx configuration
        for all active domains in a subscription. Useful for fixing broken
        or missing nginx configurations.
        
        Args:
            subscription_id: VPS subscription ID
            
        Returns:
            Dictionary with:
            - success: bool
            - external_nginx_fixed: bool
            - internal_nginx_fixed: bool
            - domains_fixed: int
            - errors: List[str]
        """
        errors = []
        domains_fixed = 0
        external_nginx_fixed = False
        internal_nginx_fixed = False
        
        logger.info(f"Starting nginx configuration fix for subscription: {subscription_id}")
        
        try:
            # Get container instance
            from app.modules.hosting.repository import ContainerInstanceRepository
            container_repo = ContainerInstanceRepository(self.db)
            container = await container_repo.get_by_subscription_id(subscription_id)
            
            if not container:
                error_msg = f"Container not found for subscription: {subscription_id}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "external_nginx_fixed": False,
                    "internal_nginx_fixed": False,
                    "domains_fixed": 0,
                    "errors": [error_msg]
                }
            
            if not container.http_port:
                error_msg = f"Container {container.container_name} has no HTTP port configured"
                logger.error(error_msg)
                return {
                    "success": False,
                    "external_nginx_fixed": False,
                    "internal_nginx_fixed": False,
                    "domains_fixed": 0,
                    "errors": [error_msg]
                }
            
            # Get all active domains for this subscription
            domains = await self.domain_repo.get_by_subscription(
                subscription_id=subscription_id,
                is_active=True
            )
            
            if not domains:
                error_msg = f"No active domains found for subscription: {subscription_id}"
                logger.warning(error_msg)
                return {
                    "success": False,
                    "external_nginx_fixed": False,
                    "internal_nginx_fixed": False,
                    "domains_fixed": 0,
                    "errors": [error_msg]
                }
            
            logger.info(f"Found {len(domains)} active domains to fix")
            
            # Reset proxy_configured flag before fixing
            for domain in domains:
                domain.proxy_configured = False
            await self.db.commit()
            
            # Fix external nginx configuration
            logger.info("Fixing external nginx configuration...")
            external_nginx_fixed = await self._write_external_nginx_configs(domains, container)
            
            if not external_nginx_fixed:
                error_msg = "Failed to fix external nginx configuration"
                logger.error(error_msg)
                errors.append(error_msg)
            else:
                logger.info("External nginx configuration fixed successfully")
                domains_fixed = len(domains)
            
            # Fix internal nginx configuration
            logger.info("Fixing internal nginx configuration...")
            try:
                from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService
                nginx_auto_service = NginxAutoConfigService()
                
                # Build domain-port mappings
                domain_port_mappings = [
                    {
                        'domain_name': domain.domain_name,
                        'port': domain.service_port
                    }
                    for domain in domains
                ]
                
                internal_nginx_fixed = await nginx_auto_service.configure_nginx_in_vps(
                    container_name=container.container_name,
                    domain_port_mappings=domain_port_mappings
                )
                
                if not internal_nginx_fixed:
                    error_msg = "Failed to fix internal nginx configuration"
                    logger.error(error_msg)
                    errors.append(error_msg)
                else:
                    logger.info("Internal nginx configuration fixed successfully")
            except Exception as e:
                error_msg = f"Error fixing internal nginx: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
            
            success = external_nginx_fixed and internal_nginx_fixed
            
            if success:
                logger.info(f"Successfully fixed nginx configuration for {len(domains)} domains")
            else:
                logger.warning(f"Partially fixed nginx configuration. External: {external_nginx_fixed}, Internal: {internal_nginx_fixed}")
            
            return {
                "success": success,
                "external_nginx_fixed": external_nginx_fixed,
                "internal_nginx_fixed": internal_nginx_fixed,
                "domains_fixed": domains_fixed,
                "errors": errors
            }
            
        except Exception as e:
            error_msg = f"Unexpected error fixing nginx configuration: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "external_nginx_fixed": False,
                "internal_nginx_fixed": False,
                "domains_fixed": domains_fixed,
                "errors": errors + [error_msg]
            }

    async def update_urls_in_container_configs(
        self,
        subscription_id: str
    ) -> Dict[str, Any]:
        """
        Update URLs in configuration files inside VPS container.
        
        Scans common config files (docker-compose.yml, .env files, etc.) and
        replaces localhost/default URLs with generated domain names.
        
        Args:
            subscription_id: VPS subscription ID
            
        Returns:
            Dictionary with:
            - success: bool
            - files_updated: int
            - replacements: List[Dict] (file path, old URL, new URL)
            - errors: List[str]
        """
        errors = []
        files_updated = 0
        replacements = []
        
        logger.info(f"Starting URL update for subscription: {subscription_id}")
        
        try:
            # Get container instance
            from app.modules.hosting.repository import ContainerInstanceRepository
            container_repo = ContainerInstanceRepository(self.db)
            container = await container_repo.get_by_subscription_id(subscription_id)
            
            if not container:
                error_msg = f"Container not found for subscription: {subscription_id}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            
            # Get all active domains for this subscription
            domains = await self.domain_repo.get_by_subscription(
                subscription_id=subscription_id,
                is_active=True
            )
            
            if not domains:
                error_msg = f"No active domains found for subscription: {subscription_id}"
                logger.warning(error_msg)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            
            # Build service name to domain mapping and port to domain mapping
            service_to_domain = {}
            port_to_domain = {}
            for domain in domains:
                if domain.is_active:
                    service_to_domain[domain.service_name] = domain.domain_name
                    port_to_domain[domain.service_port] = domain.domain_name
            
            if not service_to_domain:
                error_msg = "No active domains to use for URL replacement"
                logger.warning(error_msg)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            
            logger.info(f"Service to domain mapping: {service_to_domain}")
            logger.info(f"Port to domain mapping: {port_to_domain}")
            
            # Get Docker client and container
            import docker
            try:
                docker_client = docker.from_env()
                vps_container = docker_client.containers.get(container.container_name)
            except docker.errors.NotFound:
                error_msg = f"VPS container not found: {container.container_name}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            except Exception as e:
                error_msg = f"Failed to get Docker client: {str(e)}"
                logger.error(error_msg, exc_info=True)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            
            # Use Python script to find and update files
            python_script = "import os\n"
            python_script += "import re\n"
            python_script += "from pathlib import Path\n\n"
            
            # Build port to domain mapping (use port to match URLs)
            python_script += "port_to_domain = {\n"
            for port, domain_name in port_to_domain.items():
                python_script += f"    {port}: '{domain_name}',\n"
            python_script += "}\n\n"
            
            python_script += """
print("Starting URL update script...")
print(f"Port to domain mapping: {port_to_domain}")

# Common directories to search
search_dirs = ['/root', '/home', '/app', '/var/www', '/data']
if os.path.exists('/workspace'):
    search_dirs.append('/workspace')

files_to_update = []
replacements_made = []

# Find config files
print("Searching for config files...")
for search_dir in search_dirs:
    if os.path.exists(search_dir):
        print(f"Searching in: {search_dir}")
        for root, dirs, files in os.walk(search_dir):
            # Skip hidden directories and common exclusions
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', '.git']]
            for file in files:
                if file in ['docker-compose.yml', 'docker-compose.yaml', '.env', '.env.local', '.env.production']:
                    filepath = os.path.join(root, file)
                    files_to_update.append(filepath)
                    print(f"Found config file: {filepath}")
    else:
        print(f"Directory does not exist: {search_dir}")

print(f"Total config files found: {len(files_to_update)}")

# Update each file
for filepath in files_to_update:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        file_replacements = []
        
        # Replace localhost URLs with domain names based on port
        for port, domain_name in port_to_domain.items():
            # Pattern: http://localhost:PORT -> http://domain_name
            patterns = [
                (f'http://localhost:{port}', f'http://{domain_name}'),
                (f'http://127.0.0.1:{port}', f'http://{domain_name}'),
                (f'localhost:{port}', domain_name),
                (f'127.0.0.1:{port}', domain_name),
            ]
            
            for old_url, new_url in patterns:
                if old_url in content:
                    content = content.replace(old_url, new_url)
                    file_replacements.append(f"Replaced '{old_url}' with '{new_url}'")
                    print(f"  Found pattern '{old_url}' in {filepath}")
        
        # Write back if changed
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            replacements_made.append({
                'file': filepath,
                'replacements': file_replacements
            })
            print(f"UPDATED: {filepath}")
        else:
            print(f"  No changes needed in {filepath}")
    
    except Exception as e:
        print(f"ERROR updating {filepath}: {e}")

print(f"FILES_UPDATED: {len(replacements_made)}")
for rep in replacements_made:
    print(f"FILE: {rep['file']}")
    for r in rep['replacements']:
        print(f"  - {r}")
"""
            
            # Execute Python script in container
            script_b64 = base64.b64encode(python_script.encode('utf-8')).decode('utf-8')
            exec_result = vps_container.exec_run(
                f"bash -c 'echo {script_b64} | base64 -d | python3'",
                user="root"
            )
            
            script_output = exec_result.output.decode() if exec_result.output else ""
            logger.info(f"Python script output: {script_output}")
            
            if exec_result.exit_code != 0:
                error_msg = f"Failed to update URLs: {script_output}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "files_updated": 0,
                    "replacements": [],
                    "errors": [error_msg]
                }
            
            # Parse output
            current_file = None
            for line in script_output.split('\n'):
                if line.startswith('UPDATED:'):
                    files_updated += 1
                    file_path = line.split('UPDATED:', 1)[1].strip()
                    replacements.append({"file": file_path, "replacements": []})
                    current_file = file_path
                elif line.startswith('FILE:'):
                    current_file = line.split('FILE:', 1)[1].strip()
                elif line.startswith('  - ') and current_file:
                    replacement_info = line.split('  - ', 1)[1].strip()
                    # Find the replacement entry for current_file
                    for rep in replacements:
                        if rep.get("file") == current_file:
                            rep["replacements"].append(replacement_info)
                            break
            
            success = files_updated > 0
            
            if success:
                logger.info(f"Successfully updated URLs in {files_updated} file(s)")
            else:
                logger.warning("No files were updated (may be no matching patterns found)")
            
            return {
                "success": success,
                "files_updated": files_updated,
                "replacements": replacements,
                "errors": errors
            }
            
        except Exception as e:
            error_msg = f"Unexpected error updating URLs: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "files_updated": files_updated,
                "replacements": replacements,
                "errors": errors + [error_msg]
            }
