"""Find permission gaps and verify complete coverage."""

import sys
from pathlib import Path
import re

sys.path.insert(0, r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

from app.core.permissions import Permission, ROLE_PERMISSIONS

print("="*80)
print("COMPREHENSIVE PERMISSION COVERAGE ANALYSIS")
print("="*80)

# 1. Count all permissions
all_permissions = list(Permission)
admin_permissions = list(ROLE_PERMISSIONS["admin"])

print(f"\nTotal permissions defined: {len(all_permissions)}")
print(f"Admin permissions: {len(admin_permissions)}")

# 2. Group permissions by module
permission_modules = {}
for perm in all_permissions:
    module = perm.value.split(':')[0] if ':' in perm.value else 'unknown'
    if module not in permission_modules:
        permission_modules[module] = []
    permission_modules[module].append(perm)

print(f"\n{'MODULE':<20s} {'COUNT':<10s} {'OPERATIONS'}")
print("-" * 80)
for module, perms in sorted(permission_modules.items()):
    operations = set()
    for p in perms:
        if ':' in p.value:
            op = p.value.split(':')[1]
            operations.add(op)
    print(f"{module:<20s} {len(perms):<10d} {', '.join(sorted(operations))}")

# 3. Check for standard CRUD gaps
print("\n" + "="*80)
print("CHECKING FOR MISSING CRUD OPERATIONS")
print("="*80)

crud_operations = ['view', 'create', 'edit', 'delete']
for module, perms in sorted(permission_modules.items()):
    if module in ['unknown', 'system', 'audit', 'reports']:
        continue  # These don't necessarily need full CRUD

    perm_values = {p.value for p in perms}
    operations = set()
    for p in perms:
        if ':' in p.value:
            op = p.value.split(':')[1]
            operations.add(op)

    missing_crud = [op for op in crud_operations if op not in operations]
    if missing_crud:
        print(f"\n{module.upper()}:")
        print(f"  Has: {', '.join(sorted(operations))}")
        print(f"  Missing CRUD: {', '.join(missing_crud)}")

# 4. Scan backend routes for modules
print("\n" + "="*80)
print("CHECKING BACKEND MODULES FOR ROUTER FILES")
print("="*80)

backend_path = Path(r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend\app\modules")
modules_with_routers = set()

for module_dir in backend_path.iterdir():
    if module_dir.is_dir() and not module_dir.name.startswith('_'):
        # Check if module has routers
        router_files = list(module_dir.glob('*router*.py')) + list(module_dir.glob('*routes*.py'))
        if router_files:
            modules_with_routers.add(module_dir.name)

print(f"\nFound {len(modules_with_routers)} modules with routers:")
for m in sorted(modules_with_routers):
    print(f"  - {m}")

# Check which modules have permissions
modules_with_permissions = set(permission_modules.keys())
print(f"\nModules with defined permissions: {len(modules_with_permissions)}")
for m in sorted(modules_with_permissions):
    print(f"  - {m}")

# Find modules with routers but no permissions
missing_perms = modules_with_routers - modules_with_permissions
if missing_perms:
    print(f"\n!!! MODULES WITH ROUTERS BUT NO PERMISSIONS:")
    for m in sorted(missing_perms):
        print(f"  - {m}")
else:
    print(f"\nOK: All modules with routers have permissions defined")

# 5. Check for permission consistency across roles
print("\n" + "="*80)
print("ROLE PERMISSION CONSISTENCY")
print("="*80)

print(f"\n{'ROLE':<25s} {'PERMISSIONS':<15s} {'% OF ADMIN'}")
print("-" * 80)
for role_name, role_perms in ROLE_PERMISSIONS.items():
    pct = (len(role_perms) / len(all_permissions) * 100) if all_permissions else 0
    print(f"{role_name:<25s} {len(role_perms):<15d} {pct:>6.1f}%")

# 6. Check admin completeness
print("\n" + "="*80)
print("ADMIN ROLE COMPLETENESS CHECK")
print("="*80)

admin_perm_set = set(admin_permissions)
all_perm_set = set(all_permissions)
missing_from_admin = all_perm_set - admin_perm_set

if missing_from_admin:
    print(f"\nCRITICAL: Admin is missing {len(missing_from_admin)} permissions!")
    for perm in sorted(missing_from_admin, key=lambda x: x.value):
        print(f"  - {perm.value}")
else:
    print(f"\nOK: Admin role has ALL {len(all_permissions)} permissions")

# 7. Look for potential missing permissions in routes
print("\n" + "="*80)
print("SCANNING FOR UNPROTECTED ROUTES (NO PERMISSION CHECK)")
print("="*80)

unprotected_routes = []
for router_file in backend_path.rglob("*router*.py"):
    if "test" in str(router_file) or "__pycache__" in str(router_file):
        continue

    try:
        content = router_file.read_text(encoding='utf-8')

        # Find route definitions
        route_pattern = r'@router\.(get|post|put|patch|delete)\(["\']([^"\']+)["\']\)'
        routes = re.findall(route_pattern, content)

        # Find permission checks in the same file
        has_permission_check = 'require_permission' in content or 'require_role' in content or 'require_any_permission' in content

        if routes and not has_permission_check:
            module_name = router_file.parent.name
            unprotected_routes.append((module_name, router_file.name, len(routes)))
    except Exception:
        pass

if unprotected_routes:
    print(f"\n!!! Found {len(unprotected_routes)} router files without permission checks:")
    for module, filename, count in sorted(unprotected_routes):
        print(f"  - {module}/{filename} ({count} routes)")
else:
    print("\nOK: All router files have permission checks")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Total Permissions: {len(all_permissions)}")
print(f"Admin Has All: {'YES' if not missing_from_admin else 'NO'}")
print(f"Permission Modules: {len(modules_with_permissions)}")
print(f"Router Modules: {len(modules_with_routers)}")
print(f"Unprotected Routers: {len(unprotected_routes)}")
