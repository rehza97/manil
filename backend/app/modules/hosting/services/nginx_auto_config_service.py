"""
Automatic Nginx Configuration Service for VPS Service Domains

This service automatically configures nginx inside VPS containers to route
traffic from service domains to docker-compose services.
"""
import logging
from typing import Dict, List, Any

try:
    import docker
    from docker.models.containers import Container as DockerContainer
    from docker.errors import NotFound, DockerException
except ImportError:
    # Docker SDK not installed - will use mock for development
    docker = None
    DockerContainer = None
    NotFound = Exception
    DockerException = Exception

logger = logging.getLogger(__name__)


class NginxAutoConfigService:
    """
    Manages automatic nginx configuration inside VPS containers.
    Generates nginx configs based on detected docker-compose services.
    """

    def __init__(self):
        """Initialize nginx auto-config service."""
        if docker:
            try:
                self.client = docker.from_env()
            except DockerException as e:
                logger.error(f"Failed to initialize Docker client: {e}")
                self.client = None
        else:
            logger.warning("Docker SDK not installed")
            self.client = None

    def generate_nginx_config(
        self,
        service_routes: List[Dict[str, Any]],
        base_domain: str,
        customer_hash: str
    ) -> str:
        """
        Generate nginx configuration for service routing.

        Args:
            service_routes: List of dicts with 'service' and 'port' keys
            base_domain: Base domain (e.g., 'vps.localhost')
            customer_hash: 8-char hash for subdomain uniqueness

        Returns:
            Complete nginx configuration as string
        """
        config_blocks = []

        for route in service_routes:
            service_name = route['service']
            port = route['port']
            domain = f"{service_name}.{customer_hash}.{base_domain}"

            config_block = f"""
server {{
    listen 80;
    server_name {domain};

    location / {{
        # Proxy to docker-compose service by name
        # Docker's internal DNS resolves service names
        proxy_pass http://{service_name}:{port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}
}}
"""
            config_blocks.append(config_block)

        # Add default server block
        default_block = """
server {
    listen 80 default_server;
    return 404 "No route configured for this domain";
}
"""
        config_blocks.append(default_block)

        return "\n".join(config_blocks)

    async def configure_nginx_in_vps(
        self,
        container_name: str,
        service_routes: List[Dict[str, Any]],
        base_domain: str,
        customer_hash: str
    ) -> bool:
        """
        Configure nginx inside a VPS container.

        Args:
            container_name: Name of VPS container
            service_routes: List of service route definitions
            base_domain: Base domain for service domains
            customer_hash: Customer identifier hash

        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            logger.error("Docker client not available")
            return False

        try:
            container: DockerContainer = self.client.containers.get(container_name)

            # Generate nginx config
            nginx_config = self.generate_nginx_config(
                service_routes,
                base_domain,
                customer_hash
            )

            # Write config to temporary file in container
            config_path = "/etc/nginx/sites-available/vps-services.conf"

            # Create config file using heredoc
            exec_result = container.exec_run(
                f"bash -c 'cat > {config_path} << \"EOF\"\n{nginx_config}\nEOF\n'",
                user="root"
            )

            if exec_result.exit_code != 0:
                logger.error(f"Failed to write nginx config: {exec_result.output.decode()}")
                return False

            # Enable site
            container.exec_run(
                f"ln -sf {config_path} /etc/nginx/sites-enabled/vps-services.conf",
                user="root"
            )

            # Remove default site
            container.exec_run(
                "rm -f /etc/nginx/sites-enabled/default",
                user="root"
            )

            # Test nginx configuration
            test_result = container.exec_run("nginx -t", user="root")
            if test_result.exit_code != 0:
                logger.error(f"Nginx config test failed: {test_result.output.decode()}")
                return False

            # Reload nginx
            reload_result = container.exec_run("service nginx reload", user="root")
            if reload_result.exit_code != 0:
                # Try start if reload fails (nginx might not be running)
                start_result = container.exec_run("service nginx start", user="root")
                if start_result.exit_code != 0:
                    logger.error(f"Failed to start nginx: {start_result.output.decode()}")
                    return False

            logger.info(f"Successfully configured nginx in VPS {container_name}")
            return True

        except NotFound:
            logger.error(f"Container {container_name} not found")
            return False
        except Exception as e:
            logger.error(f"Error configuring nginx in VPS: {e}", exc_info=True)
            return False

    def update_external_nginx_config(
        self,
        domain_name: str,
        vps_http_port: int
    ) -> str:
        """
        Generate external nginx configuration to route to VPS HTTP port.

        Args:
            domain_name: Service domain name
            vps_http_port: Host port that maps to VPS port 80

        Returns:
            Nginx server block configuration
        """
        config = f"""server {{
    listen 80;
    server_name {domain_name};

    location / {{
        proxy_pass http://host.docker.internal:{vps_http_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}
}}
"""
        return config
