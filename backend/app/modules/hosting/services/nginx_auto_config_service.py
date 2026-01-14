"""
Automatic Nginx Configuration Service for VPS Service Domains

This service automatically configures nginx inside VPS containers to route
traffic from service domains to docker-compose services.
"""
import base64
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
        domain_port_mappings: List[Dict[str, Any]]
    ) -> str:
        """
        Generate nginx configuration for service routing.

        Args:
            domain_port_mappings: List of dicts with 'domain_name' and 'port' keys
                                 Each dict should have the actual domain name from database
                                 and the service port number

        Returns:
            Complete nginx configuration as string
        """
        config_blocks = []

        for mapping in domain_port_mappings:
            domain_name = mapping['domain_name']
            port = mapping['port']

            config_block = f"""
server {{
    listen 80;
    server_name {domain_name};

    location / {{
        # Proxy to localhost since docker-compose services expose ports with 0.0.0.0
        # This makes them accessible via localhost inside the VPS container
        # Each VPS has isolated network namespace, so localhost:PORT is unique per VPS
        proxy_pass http://localhost:{port};
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
        domain_port_mappings: List[Dict[str, Any]]
    ) -> bool:
        """
        Configure nginx inside a VPS container.

        Args:
            container_name: Name of VPS container
            domain_port_mappings: List of dicts with 'domain_name' and 'port' keys
                                 Each dict should have the actual domain name from database
                                 and the service port number

        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            logger.error("Docker client not available")
            return False

        logger.info(f"Starting internal nginx configuration for container: {container_name}")
        logger.info(f"Configuring {len(domain_port_mappings)} domain-port mappings")
        for mapping in domain_port_mappings:
            logger.info(f"  - {mapping['domain_name']} -> localhost:{mapping['port']}")

        try:
            container: DockerContainer = self.client.containers.get(container_name)
            logger.info(f"Found container: {container_name}, status: {container.status}")

            # Verify nginx is installed in container
            nginx_check = container.exec_run("which nginx", user="root")
            if nginx_check.exit_code != 0:
                logger.error(f"Nginx is not installed in container {container_name}")
                return False
            nginx_path = nginx_check.output.decode().strip()
            logger.info(f"Nginx found at: {nginx_path}")

            # Generate nginx config using actual domain names
            logger.info("Generating nginx configuration...")
            nginx_config = self.generate_nginx_config(domain_port_mappings)
            logger.info(f"Generated nginx config ({len(nginx_config)} bytes)")

            # Write config to temporary file in container
            config_path = "/etc/nginx/sites-available/vps-services.conf"
            logger.info(f"Writing nginx config to: {config_path}")

            # Ensure directory exists
            dir_result = container.exec_run(
                "mkdir -p /etc/nginx/sites-available",
                user="root"
            )
            if dir_result.exit_code != 0:
                error_output = dir_result.output.decode() if dir_result.output else "Unknown error"
                logger.error(f"Failed to create directory /etc/nginx/sites-available: {error_output}")
                return False
            
            # Write config file using Python script (more reliable than base64 echo)
            # This avoids shell escaping issues and handles large files better
            python_write_script = f"""
import base64
import os

config_content = {repr(nginx_config)}

# Ensure directory exists
os.makedirs('/etc/nginx/sites-available', exist_ok=True)

# Write config file
with open('{config_path}', 'w') as f:
    f.write(config_content)

# Verify file was written
if os.path.exists('{config_path}'):
    size = os.path.getsize('{config_path}')
    print(f'SUCCESS: File written, size: {{size}} bytes')
else:
    print('ERROR: File was not created')
    exit(1)
"""
            
            script_b64 = base64.b64encode(python_write_script.encode('utf-8')).decode('utf-8')
            exec_result = container.exec_run(
                f"bash -c 'echo {script_b64} | base64 -d | python3'",
                user="root"
            )

            # Check Python script output
            script_output = exec_result.output.decode() if exec_result.output else ""
            logger.info(f"Python script output: {script_output}")

            if exec_result.exit_code != 0:
                error_output = exec_result.output.decode() if exec_result.output else "Unknown error"
                logger.error(f"Failed to write nginx config to {config_path}: {error_output}")
                # Try to check if file exists and show directory contents for debugging
                check_result = container.exec_run(
                    f"ls -la {config_path} 2>&1 || echo 'File does not exist'",
                    user="root"
                )
                check_output = check_result.output.decode() if check_result.output else ""
                logger.error(f"File check result: {check_output}")
                
                ls_result = container.exec_run(
                    "ls -la /etc/nginx/sites-available/ 2>&1",
                    user="root"
                )
                ls_output = ls_result.output.decode() if ls_result.output else ""
                logger.error(f"Directory contents: {ls_output}")
                return False

            # Check if Python script reported success
            if "SUCCESS" not in script_output:
                logger.warning(f"Python script did not report SUCCESS, but exit code was 0. Output: {script_output}")

            # Verify config file was written and has content
            # Use ls to check file exists (more reliable than test in some cases)
            file_check = container.exec_run(
                f"ls -l {config_path}",
                user="root"
            )
            if file_check.exit_code != 0:
                logger.error(f"Config file verification failed: {config_path} does not exist")
                # Try to see what's in the directory
                ls_result = container.exec_run(
                    "ls -la /etc/nginx/sites-available/",
                    user="root"
                )
                ls_output = ls_result.output.decode() if ls_result.output else ""
                logger.error(f"Directory contents: {ls_output}")
                return False
            
            logger.info(f"File exists check passed: {file_check.output.decode() if file_check.output else ''}")
            
            # Get file size
            size_result = container.exec_run(
                f"wc -c {config_path}",
                user="root"
            )
            if size_result.exit_code != 0:
                logger.error(f"Failed to get file size for {config_path}")
                return False
            
            size_output = size_result.output.decode().strip() if size_result.output else ""
            file_size = size_output.split()[0] if size_output else "unknown"
            
            if file_size == "0" or file_size == "unknown" or not file_size.isdigit():
                logger.error(f"Config file is empty or size check failed: {config_path}, size: {file_size}")
                return False
            
            file_size_int = int(file_size)
            if file_size_int < 100:  # Config should be at least 100 bytes
                logger.error(f"Config file seems too small: {config_path}, size: {file_size_int} bytes")
                return False
            
            logger.info(f"Config file written successfully: {config_path} ({file_size} bytes)")
            
            # Verify file content is valid (contains server blocks)
            content_check = container.exec_run(
                f"grep -q 'server {{' {config_path} && echo 'valid' || echo 'invalid'",
                user="root"
            )
            content_output = content_check.output.decode() if content_check.output else ""
            if content_check.exit_code != 0 or "invalid" in content_output:
                logger.error(f"Config file content validation failed: {config_path}")
                logger.error(f"Content check output: {content_output}")
                return False

            # Ensure nginx.conf has server_names_hash_bucket_size set (for long domain names)
            # Check if it's already set (uncommented), if not add or uncomment it
            logger.info("Checking server_names_hash_bucket_size in nginx.conf...")
            check_result = container.exec_run(
                "grep -q '^[^#]*server_names_hash_bucket_size' /etc/nginx/nginx.conf",
                user="root"
            )
            if check_result.exit_code != 0:
                logger.info("server_names_hash_bucket_size not set, adding it...")
                # Use Python script with base64 encoding to modify nginx.conf
                # This will uncomment existing line or add new one
                python_script = "import re\n"
                python_script += "with open('/etc/nginx/nginx.conf', 'r') as f:\n"
                python_script += "    content = f.read()\n"
                python_script += "# First, try to uncomment existing line\n"
                python_script += "content = re.sub(r'^\\s*#\\s*server_names_hash_bucket_size\\s+\\d+;', '    server_names_hash_bucket_size 128;', content, flags=re.MULTILINE)\n"
                python_script += "# If no uncommented line exists, add it after http {\n"
                python_script += "if not re.search(r'^[^#]*server_names_hash_bucket_size', content, re.MULTILINE):\n"
                python_script += "    content = re.sub(r'(^http\\s*\\{)', r'\\1\\n    server_names_hash_bucket_size 128;', content, flags=re.MULTILINE)\n"
                python_script += "with open('/etc/nginx/nginx.conf', 'w') as f:\n"
                python_script += "    f.write(content)\n"
                
                script_b64 = base64.b64encode(python_script.encode('utf-8')).decode('utf-8')
                update_result = container.exec_run(
                    f"bash -c 'echo {script_b64} | base64 -d | python3'",
                    user="root"
                )
                if update_result.exit_code != 0:
                    error_output = update_result.output.decode() if update_result.output else "Unknown error"
                    logger.error(f"Failed to update nginx.conf with server_names_hash_bucket_size: {error_output}")
                    return False
                else:
                    logger.info("Successfully added/uncommented server_names_hash_bucket_size in nginx.conf")
            else:
                logger.info("server_names_hash_bucket_size already set in nginx.conf")

            # Enable site
            logger.info("Enabling nginx site...")
            enable_result = container.exec_run(
                f"ln -sf {config_path} /etc/nginx/sites-enabled/vps-services.conf",
                user="root"
            )
            if enable_result.exit_code != 0:
                error_output = enable_result.output.decode() if enable_result.output else "Unknown error"
                logger.error(f"Failed to enable nginx site: {error_output}")
                return False

            # Verify symlink was created
            symlink_check = container.exec_run(
                "test -L /etc/nginx/sites-enabled/vps-services.conf",
                user="root"
            )
            if symlink_check.exit_code != 0:
                logger.error("Failed to verify nginx site symlink")
                return False
            logger.info("Nginx site enabled successfully")

            # Remove default site
            logger.info("Removing default nginx site...")
            container.exec_run(
                "rm -f /etc/nginx/sites-enabled/default",
                user="root"
            )

            # Test nginx configuration
            logger.info("Testing nginx configuration...")
            test_result = container.exec_run("nginx -t", user="root")
            if test_result.exit_code != 0:
                error_output = test_result.output.decode() if test_result.output else "Unknown error"
                logger.error(f"Nginx config test failed: {error_output}")
                return False
            logger.info("Nginx configuration test passed")

            # Check if nginx is running
            nginx_status = container.exec_run("service nginx status", user="root")
            nginx_running = nginx_status.exit_code == 0
            logger.info(f"Nginx service status: {'running' if nginx_running else 'not running'}")

            # Reload or start nginx
            if nginx_running:
                logger.info("Reloading nginx service...")
                reload_result = container.exec_run("service nginx reload", user="root")
                if reload_result.exit_code != 0:
                    error_output = reload_result.output.decode() if reload_result.output else "Unknown error"
                    logger.error(f"Failed to reload nginx: {error_output}")
                    return False
                logger.info("Nginx reloaded successfully")
            else:
                logger.info("Starting nginx service...")
                start_result = container.exec_run("service nginx start", user="root")
                if start_result.exit_code != 0:
                    error_output = start_result.output.decode() if start_result.output else "Unknown error"
                    logger.error(f"Failed to start nginx: {error_output}")
                    return False
                logger.info("Nginx started successfully")

            # Verify nginx is running after reload/start
            final_status = container.exec_run("service nginx status", user="root")
            if final_status.exit_code != 0:
                logger.error("Nginx is not running after reload/start")
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
