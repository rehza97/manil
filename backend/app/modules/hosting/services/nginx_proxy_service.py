"""
Nginx Proxy Service - Manages nginx configuration for VPS service domains.

Handles dynamic nginx server block generation, configuration file management,
and nginx container reloads.
"""
import os
import logging
from typing import Optional
from pathlib import Path

import docker
from docker.errors import DockerException, NotFound

logger = logging.getLogger(__name__)


class NginxProxyService:
    """Service for managing nginx proxy configuration."""

    def __init__(self):
        """Initialize nginx proxy service."""
        self.nginx_sites_dir = Path("/Users/fathallah/projects/manil/nginx/sites-enabled")
        self.nginx_container_name = "cloudmanager-nginx-proxy"
        self.docker_client = None

    def _get_docker_client(self):
        """Get or create Docker client."""
        if self.docker_client is None:
            try:
                self.docker_client = docker.from_env()
            except DockerException as e:
                logger.error(f"Failed to connect to Docker: {e}")
                raise
        return self.docker_client

    def _generate_server_block(
        self,
        domain: str,
        vps_ip: str,
        port: int
    ) -> str:
        """
        Generate nginx server block configuration.

        Args:
            domain: Domain name (e.g., web.customer.vps.example.com)
            vps_ip: Internal VPS IP (e.g., 172.20.1.10)
            port: Service port inside VPS

        Returns:
            Nginx server block configuration as string
        """
        config = f"""# Auto-generated configuration for {domain}
# VPS IP: {vps_ip}, Port: {port}

server {{
    listen 80;
    server_name {domain};

    # Logging
    access_log /var/log/nginx/{domain}_access.log main;
    error_log /var/log/nginx/{domain}_error.log warn;

    # Proxy settings
    location / {{
        proxy_pass http://{vps_ip}:{port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering (disable for streaming)
        proxy_buffering off;
        proxy_cache off;
    }}

    # Health check endpoint
    location /health {{
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }}
}}
"""
        return config

    async def add_service_route(
        self,
        domain: str,
        vps_ip: str,
        port: int
    ) -> bool:
        """
        Add a service route to nginx configuration.

        Args:
            domain: Domain name
            vps_ip: VPS internal IP
            port: Service port

        Returns:
            True if successful, False otherwise
        """
        try:
            # Generate configuration
            config = self._generate_server_block(domain, vps_ip, port)

            # Write config file
            config_file = self.nginx_sites_dir / f"{domain}.conf"
            config_file.write_text(config)

            logger.info(f"Created nginx config for domain: {domain} -> {vps_ip}:{port}")

            # Reload nginx
            reload_success = await self.reload_nginx()

            if not reload_success:
                # Rollback: remove config file if reload failed
                config_file.unlink(missing_ok=True)
                logger.error(f"Nginx reload failed, removed config for {domain}")
                return False

            return True

        except Exception as e:
            logger.error(f"Failed to add service route for {domain}: {e}", exc_info=True)
            return False

    async def remove_service_route(self, domain: str) -> bool:
        """
        Remove a service route from nginx configuration.

        Args:
            domain: Domain name to remove

        Returns:
            True if successful, False otherwise
        """
        try:
            config_file = self.nginx_sites_dir / f"{domain}.conf"

            if not config_file.exists():
                logger.warning(f"Config file not found for domain: {domain}")
                return True  # Already removed

            # Remove config file
            config_file.unlink()
            logger.info(f"Removed nginx config for domain: {domain}")

            # Reload nginx
            reload_success = await self.reload_nginx()

            if not reload_success:
                logger.error(f"Nginx reload failed after removing {domain}")
                # Don't rollback removal - config is already deleted
                return False

            return True

        except Exception as e:
            logger.error(f"Failed to remove service route for {domain}: {e}", exc_info=True)
            return False

    async def reload_nginx(self) -> bool:
        """
        Reload nginx configuration.

        Returns:
            True if successful, False otherwise
        """
        try:
            client = self._get_docker_client()
            container = client.containers.get(self.nginx_container_name)

            # Test configuration first
            test_result = container.exec_run("nginx -t")
            if test_result.exit_code != 0:
                logger.error(f"Nginx config test failed: {test_result.output.decode()}")
                return False

            # Reload nginx
            reload_result = container.exec_run("nginx -s reload")
            if reload_result.exit_code != 0:
                logger.error(f"Nginx reload failed: {reload_result.output.decode()}")
                return False

            logger.info("Nginx reloaded successfully")
            return True

        except NotFound:
            logger.error(f"Nginx container '{self.nginx_container_name}' not found")
            return False
        except DockerException as e:
            logger.error(f"Docker error during nginx reload: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to reload nginx: {e}", exc_info=True)
            return False

    async def check_nginx_health(self) -> bool:
        """
        Check if nginx is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            client = self._get_docker_client()
            container = client.containers.get(self.nginx_container_name)

            # Check container status
            container.reload()  # Refresh container info
            if container.status != "running":
                logger.warning(f"Nginx container status: {container.status}")
                return False

            # Test configuration
            test_result = container.exec_run("nginx -t")
            if test_result.exit_code != 0:
                logger.error(f"Nginx config invalid: {test_result.output.decode()}")
                return False

            return True

        except NotFound:
            logger.error(f"Nginx container '{self.nginx_container_name}' not found")
            return False
        except Exception as e:
            logger.error(f"Failed to check nginx health: {e}", exc_info=True)
            return False

    async def regenerate_all_routes(self) -> bool:
        """
        Regenerate all nginx configurations from database.

        This method should be called by ServiceDomainService to rebuild
        all configurations from scratch.

        Returns:
            True if successful, False otherwise
        """
        try:
            # Clear all existing config files (except .gitkeep)
            for config_file in self.nginx_sites_dir.glob("*.conf"):
                config_file.unlink()
                logger.info(f"Removed config file: {config_file.name}")

            logger.info("Cleared all nginx site configurations")

            # Note: The actual regeneration happens in ServiceDomainService
            # which calls add_service_route() for each active domain

            # Reload nginx to apply empty configuration
            return await self.reload_nginx()

        except Exception as e:
            logger.error(f"Failed to regenerate all routes: {e}", exc_info=True)
            return False

    async def list_configured_domains(self) -> list[str]:
        """
        List all domains currently configured in nginx.

        Returns:
            List of domain names
        """
        try:
            domains = []
            for config_file in self.nginx_sites_dir.glob("*.conf"):
                # Extract domain from filename (domain.conf -> domain)
                domain = config_file.stem
                domains.append(domain)

            return sorted(domains)

        except Exception as e:
            logger.error(f"Failed to list configured domains: {e}", exc_info=True)
            return []
