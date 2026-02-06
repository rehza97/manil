"""Quick script to verify if admin role has all permissions."""

import sys
sys.path.insert(0, r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

from app.core.permissions import Permission, ROLE_PERMISSIONS

# Get all defined permissions
all_permissions = set(Permission)
print(f"Total permissions defined: {len(all_permissions)}")

# Get admin permissions
admin_permissions = ROLE_PERMISSIONS.get("admin", set())
print(f"Admin permissions assigned: {len(admin_permissions)}")

# Find missing permissions
missing_permissions = all_permissions - admin_permissions
if missing_permissions:
    print(f"\nMISSING {len(missing_permissions)} PERMISSIONS FROM ADMIN ROLE:")
    for perm in sorted(missing_permissions, key=lambda x: x.value):
        print(f"  - {perm.value}")
else:
    print("\nAll permissions are assigned to admin role!")

# Also check other roles for completeness
print("\n" + "="*60)
print("Permission counts by role:")
print("="*60)
for role_name, perms in ROLE_PERMISSIONS.items():
    print(f"{role_name:20s}: {len(perms):3d} permissions")
