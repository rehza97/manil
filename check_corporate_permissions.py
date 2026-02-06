"""Check corporate role ticket permissions."""
import sys
sys.path.insert(0, r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

from app.core.permissions import ROLE_PERMISSIONS

corporate_perms = ROLE_PERMISSIONS.get("corporate", set())

# Filter ticket permissions
ticket_perms = [p.value for p in corporate_perms if 'ticket' in p.value.lower()]
ticket_perms.sort()

print(f"Corporate role has {len(ticket_perms)} ticket permissions:")
for perm in ticket_perms:
    print(f"  - {perm}")

# Check specifically for tickets:close
has_close = any('tickets:close' in p.value for p in corporate_perms)
print(f"\nHas 'tickets:close' permission: {has_close}")

# Show all corporate permissions
print(f"\nTotal corporate permissions: {len(corporate_perms)}")
