"""Deep analysis of permission coverage across the codebase."""

import sys
import re
from pathlib import Path

sys.path.insert(0, r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

from app.core.permissions import Permission, ROLE_PERMISSIONS

# Get all defined permissions
all_permissions = {perm.value for perm in Permission}
admin_permissions = {perm.value for perm in ROLE_PERMISSIONS.get("admin", set())}

print("="*70)
print("PERMISSION COVERAGE ANALYSIS")
print("="*70)
print(f"Total permissions defined: {len(all_permissions)}")
print(f"Admin permissions assigned: {len(admin_permissions)}")

# Verify admin has all permissions
missing_from_admin = all_permissions - admin_permissions
if missing_from_admin:
    print(f"\nWARNING: Admin is missing {len(missing_from_admin)} permissions:")
    for perm in sorted(missing_from_admin):
        print(f"  - {perm}")
else:
    print("\nAdmin role has all defined permissions.")

# Now search for permission checks in the codebase
print("\n" + "="*70)
print("SEARCHING FOR PERMISSION USAGE IN CODE")
print("="*70)

backend_path = Path(r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

# Pattern to find permission checks
patterns = [
    r'Permission\.([\w_]+)',
    r'require_permission\(["\']([^"\']+)["\']\)',
    r'has_permission\([^,]+,\s*["\']([^"\']+)["\']\)',
    r'@requires_permission\(["\']([^"\']+)["\']\)',
]

used_permissions = set()
files_with_permissions = []

for py_file in backend_path.rglob("*.py"):
    if "venv" in str(py_file) or "__pycache__" in str(py_file):
        continue

    try:
        content = py_file.read_text(encoding='utf-8')
        file_perms = set()

        for pattern in patterns:
            matches = re.findall(pattern, content)
            file_perms.update(matches)

        if file_perms:
            used_permissions.update(file_perms)
            files_with_permissions.append((py_file.name, len(file_perms)))
    except Exception:
        pass

print(f"\nFound {len(used_permissions)} unique permissions referenced in code")
print(f"Across {len(files_with_permissions)} files")

# Check if there are permissions used in code but not defined
undefined_permissions = used_permissions - all_permissions
if undefined_permissions:
    print(f"\nWARNING: Found {len(undefined_permissions)} permissions used in code but NOT defined:")
    for perm in sorted(undefined_permissions):
        print(f"  - {perm}")

# Check if there are defined permissions never used
unused_permissions = all_permissions - used_permissions
if unused_permissions:
    print(f"\nINFO: Found {len(unused_permissions)} permissions defined but not found in code:")
    for perm in sorted(unused_permissions):
        print(f"  - {perm}")
else:
    print("\nAll defined permissions are used in the code.")

# Group permissions by module
print("\n" + "="*70)
print("PERMISSIONS BY MODULE")
print("="*70)

modules = {}
for perm in sorted(all_permissions):
    module = perm.split(':')[0] if ':' in perm else 'other'
    if module not in modules:
        modules[module] = []
    modules[module].append(perm)

for module, perms in sorted(modules.items()):
    print(f"\n{module.upper()} ({len(perms)} permissions):")
    for perm in perms:
        in_admin = " [ADMIN]" if perm in admin_permissions else " [MISSING FROM ADMIN!]"
        in_code = " [USED]" if perm in used_permissions else " [NOT FOUND IN CODE]"
        print(f"  {perm:40s} {in_admin:20s} {in_code}")
