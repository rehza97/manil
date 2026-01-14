"""
Manually trigger service domain creation for a VPS subscription.

Usage:
    python -m scripts.trigger_service_domains <subscription_id> <service_name>:<port> [<service_name>:<port> ...]

Example:
    python -m scripts.trigger_service_domains 2fdfbeb9-328e-4c1f-bd6c-dfd1eed6fe6c frontend:5173 backend:8000
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.database import AsyncSessionLocal
from app.modules.hosting.services.service_domain_service import ServiceDomainService


async def trigger_service_domains(subscription_id: str, service_routes: list, base_domain: str = "vps.localhost"):
    """Manually trigger service domain creation."""
    async with AsyncSessionLocal() as db:
        service = ServiceDomainService(db)
        
        print(f"🌐 Triggering domain creation for subscription: {subscription_id}")
        print(f"📋 Service routes: {service_routes}")
        print(f"🌍 Base domain: {base_domain}")
        print()
        
        try:
            created_domains = await service.auto_create_domains_for_deployment(
                subscription_id=subscription_id,
                service_routes=service_routes,
                base_domain=base_domain
            )
            
            if created_domains:
                print(f"✅ Successfully created {len(created_domains)} domains:")
                for domain in created_domains:
                    print(f"  • {domain.service_name}: {domain.domain_name}")
                    print(f"    Status: {'Active' if domain.is_active else 'Inactive'}")
                    print(f"    Proxy: {'Configured' if domain.proxy_configured else 'Not configured'}")
            else:
                print("⚠️  No domains were created")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.trigger_service_domains <subscription_id> <service>:<port> [<service>:<port> ...]")
        print("\nExample:")
        print("  python -m scripts.trigger_service_domains 2fdfbeb9-328e-4c1f-bd6c-dfd1eed6fe6c frontend:5173 backend:8000")
        sys.exit(1)
    
    subscription_id = sys.argv[1]
    base_domain = os.getenv("VPS_BASE_DOMAIN", "vps.localhost")
    
    # Parse service routes
    service_routes = []
    for arg in sys.argv[2:]:
        if ':' in arg:
            service_name, port_str = arg.split(':', 1)
            try:
                port = int(port_str)
                service_routes.append({
                    "service": service_name,
                    "port": port,
                    "url": f"http://localhost:{port}",
                    "internal_port": None
                })
            except ValueError:
                print(f"⚠️  Invalid port: {port_str}, skipping {arg}")
        else:
            print(f"⚠️  Invalid format: {arg} (expected service:port), skipping")
    
    if not service_routes:
        print("❌ No valid service routes provided")
        sys.exit(1)
    
    # Run async function
    success = asyncio.run(trigger_service_domains(subscription_id, service_routes, base_domain))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
