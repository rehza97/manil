"""
Diagnostic script to check if routes are properly registered.
Run this to verify the create-subscription route exists.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.main import app

    print("=" * 80)
    print("ROUTE REGISTRATION CHECK")
    print("=" * 80)

    # Find all routes that match our pattern
    create_sub_routes = []
    all_hosting_admin_routes = []

    for route in app.routes:
        if hasattr(route, 'path'):
            path = route.path
            methods = getattr(route, 'methods', set())

            # Check for our specific route
            if 'create-subscription' in path:
                create_sub_routes.append({
                    'path': path,
                    'methods': methods,
                    'name': getattr(route, 'name', 'N/A')
                })

            # Check for all hosting admin routes
            if '/hosting/admin' in path:
                all_hosting_admin_routes.append({
                    'path': path,
                    'methods': methods,
                    'name': getattr(route, 'name', 'N/A')
                })

    print(f"\nRoutes containing 'create-subscription': {len(create_sub_routes)}")
    print("-" * 80)
    for r in create_sub_routes:
        print(f"  Path: {r['path']}")
        print(f"  Methods: {r['methods']}")
        print(f"  Name: {r['name']}")
        print()

    if not create_sub_routes:
        print("  ❌ NO ROUTES FOUND! This is the problem.")
        print("  The route is not registered in the FastAPI app.")
        print()

    print(f"\nAll '/hosting/admin' routes: {len(all_hosting_admin_routes)}")
    print("-" * 80)
    for r in sorted(all_hosting_admin_routes, key=lambda x: x['path']):
        methods_str = ', '.join(sorted(r['methods'])) if r['methods'] else 'N/A'
        print(f"  {methods_str:10} {r['path']}")

    print("\n" + "=" * 80)
    print("EXPECTED ROUTE:")
    print("=" * 80)
    print("  Path: /api/v1/hosting/admin/create-subscription")
    print("  Method: POST")
    print()

    # Check if the expected route exists
    expected_found = any(
        r['path'] == '/api/v1/hosting/admin/create-subscription' and 'POST' in r['methods']
        for r in create_sub_routes
    )

    if expected_found:
        print("✅ SUCCESS: Route is properly registered!")
    else:
        print("❌ FAILURE: Route is NOT registered as expected!")
        print("\nPossible issues:")
        print("  1. Backend server needs to be restarted")
        print("  2. Import error preventing route registration")
        print("  3. Router not included in main.py")

    print()

except Exception as e:
    print(f"❌ ERROR: Failed to import app: {e}")
    import traceback
    traceback.print_exc()
    print("\nThis usually means there's an import error preventing the app from loading.")
