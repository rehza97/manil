"""
Service Domain Service - Manages VPS service domain lifecycle.

Orchestrates domain creation, DNS integration, and nginx proxy configuration
for VPS services.
"""
import os
import re
import hashlib
import logging
from typing import List, Dict, Optional, Tuple

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
        customer_id: str,
        base_domain: str
    ) -> str:
        """
        Generate auto subdomain for a service.

        Pattern: {service}.{customer_hash}.vps.{base_domain}
        Example: web.a1b2c3d4.vps.example.com

        Args:
            service_name: Name of the service
            customer_id: Customer ID
            base_domain: Base domain for subdomains

        Returns:
            Generated subdomain
        """
        # Sanitize service name
        safe_service = self._sanitize_service_name(service_name)

        # Generate customer hash (8 chars)
        customer_hash = hashlib.md5(customer_id.encode()).hexdigest()[:8]

        # Build subdomain
        subdomain = f"{safe_service}.{customer_hash}.vps.{base_domain}"

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
            return True
            
        if not container.http_port:
            logger.warning(f"Container {container.container_name} has no HTTP port, skipping external nginx config")
            return False
        
        try:
            # Import NginxAutoConfigService for external config generation
            from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService
            nginx_service = NginxAutoConfigService()
            
            nginx_config_dir = os.getenv("NGINX_CONFIG_DIR", "/Users/fathallah/projects/manil/nginx/sites-enabled")
            configs_written = 0
            
            # Write external nginx config for each domain
            for domain in created_domains:
                external_config = nginx_service.update_external_nginx_config(
                    domain_name=domain.domain_name,
                    vps_http_port=container.http_port
                )
                
                # Write external nginx config file
                config_file_path = os.path.join(nginx_config_dir, f"{domain.domain_name}.conf")
                try:
                    with open(config_file_path, 'w') as f:
                        f.write(external_config)
                    logger.info(f"Created external nginx config: {config_file_path}")
                    configs_written += 1
                except Exception as e:
                    logger.error(f"Failed to write nginx config to {config_file_path}: {e}")
            
            if configs_written == 0:
                logger.warning("No external nginx configs were written")
                return False
            
            # Reload external nginx proxy container
            import docker
            try:
                docker_client = docker.from_env()
                nginx_proxy = docker_client.containers.get("cloudmanager-nginx-proxy")
                reload_result = nginx_proxy.exec_run("nginx -s reload")
                if reload_result.exit_code == 0:
                    logger.info("Reloaded external nginx proxy")
                else:
                    logger.warning(f"Failed to reload external nginx: {reload_result.output.decode()}")
            except docker.errors.NotFound:
                logger.warning("nginx-proxy container not found, skipping reload")
            except Exception as e:
                logger.warning(f"Failed to reload external nginx: {e}")
            
            # Mark domains as proxy_configured
            for domain in created_domains:
                domain.proxy_configured = True
            await self.db.commit()
            
            logger.info(f"Successfully wrote external nginx configs for {configs_written} domains")
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
                domain_name = self._generate_subdomain(service_name, customer_id, base_domain)

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
        await self._write_external_nginx_configs(created_domains, container)

        # Optionally configure internal nginx inside VPS (can fail without blocking external configs)
        # Internal nginx routes traffic within VPS container between services
        try:
            # Generate customer hash for subdomains (reuse from existing code if available)
            import hashlib
            customer_hash = hashlib.md5(str(subscription.customer_id).encode()).hexdigest()[:8]

            # Import NginxAutoConfigService for internal nginx configuration
            from app.modules.hosting.services.nginx_auto_config_service import NginxAutoConfigService
            nginx_auto_service = NginxAutoConfigService()

            # Configure nginx inside VPS
            nginx_configured = await nginx_auto_service.configure_nginx_in_vps(
                container_name=container.container_name,
                service_routes=service_routes,
                base_domain=base_domain,
                customer_hash=customer_hash
            )

            if not nginx_configured:
                logger.warning(f"Failed to configure nginx inside VPS {container.container_name}")
                # Continue anyway - external nginx configs are already written
            else:
                logger.info(f"Successfully configured internal nginx for {len(created_domains)} domains")

        except Exception as e:
            logger.error(f"Error configuring nginx inside VPS: {e}", exc_info=True)
            # Continue - external nginx configs are already written, internal nginx is optional

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
