"""Check permissions in database."""
import asyncio
import sys
sys.path.insert(0, r"C:\Users\fetho\OneDrive\Desktop\freelance project\manil\backend")

from app.config.database import get_db
from app.modules.settings.service import PermissionService

async def check():
    async for db in get_db():
        service = PermissionService(db)
        perms, total = await service.get_all(limit=200)

        print(f'Total permissions in DB: {total}')

        print(f'\nTickets permissions:')
        tickets = [p for p in perms if 'ticket' in p.slug.lower()]
        print(f'Found {len(tickets)} tickets permissions in DB')
        for p in sorted(tickets, key=lambda x: x.slug):
            print(f'  - {p.slug}')

        print(f'\nSMS permissions:')
        sms = [p for p in perms if 'sms' in p.slug.lower()]
        print(f'Found {len(sms)} SMS permissions in DB')
        for p in sorted(sms, key=lambda x: x.slug):
            print(f'  - {p.slug}')

        # Show all categories
        print(f'\nAll categories:')
        categories = {}
        for p in perms:
            cat = p.category or 'Unknown'
            if cat not in categories:
                categories[cat] = 0
            categories[cat] += 1

        for cat, count in sorted(categories.items()):
            print(f'  {cat}: {count} permissions')

        break

if __name__ == "__main__":
    asyncio.run(check())
