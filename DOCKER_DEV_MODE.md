# Docker Development Mode Configuration

This Docker setup is configured for **development mode** with hot-reloading for both frontend and backend.

## What Changed

### Frontend Configuration

**Before:** Production build with Nginx
- Multi-stage build compiling TypeScript
- Static files served by Nginx
- Port 80

**Now:** Development mode with Vite
- Single-stage Node.js container
- Vite dev server with hot-reload
- Volume mounts for live code updates
- Port 5173

### Why Development Mode?

1. **TypeScript Errors**: The frontend has TypeScript compilation errors that need to be fixed
2. **Faster Development**: Hot-reload allows instant feedback on code changes
3. **Easier Debugging**: Development server provides better error messages
4. **No Build Step**: Skip the compilation step during development

## Running the Application

### Start all services:
```bash
docker-compose up
```

### Start specific service:
```bash
docker-compose up frontend
docker-compose up backend
```

### View logs:
```bash
docker-compose logs -f
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Stop services:
```bash
docker-compose down
```

## Access Points

- **Frontend (Vite Dev Server)**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Development Workflow

### Frontend Development

1. Edit files in `./frontend/src/`
2. Changes are automatically reflected (hot-reload)
3. Browser auto-refreshes on file save

### Backend Development

1. Edit files in `./backend/app/`
2. Uvicorn auto-reloads on file changes
3. Check logs: `docker-compose logs -f backend`

## Volume Mounts

### Frontend
```yaml
volumes:
  - ./frontend:/app          # Source code
  - /app/node_modules        # Persist node_modules in container
```

### Backend
```yaml
volumes:
  - ./backend:/app           # Source code
  - storage_data:/app/storage   # File uploads
  - logs_data:/app/logs         # Application logs
```

## TypeScript Errors to Fix

Before moving to production, these TypeScript errors need to be resolved:

### Critical Issues:
1. **Type-only imports** - Many imports need to use `import type` syntax
2. **Enum usage** - `CustomerStatus`, `CustomerType` exported as types but used as values
3. **User model** - Missing fields like `phone`, `address`, `company_name`, etc.
4. **Circular imports** - `input-otp.tsx` has circular dependencies
5. **Missing modules** - Some UI component paths are incorrect

### Quick Fixes Needed:

#### 1. Fix enum exports in `customer.types.ts`:
```typescript
// Change from:
export type CustomerStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type CustomerType = 'individual' | 'corporate';

// To:
export enum CustomerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

export enum CustomerType {
  INDIVIDUAL = 'individual',
  CORPORATE = 'corporate'
}
```

#### 2. Fix type imports:
```typescript
// Change from:
import { CustomerType } from '../types/customer.types';

// To:
import type { CustomerType } from '../types/customer.types';
// OR if used as value:
import { CustomerType } from '../types/customer.types';
```

#### 3. Add missing User fields in `auth.types.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_2fa_enabled: boolean;
  created_at: string;

  // Add these missing fields:
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company_name?: string;
  tax_id?: string;
}
```

## Production Build (Future)

Once TypeScript errors are fixed, you can switch back to production mode:

### Create `Dockerfile.prod` for frontend:
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Update docker-compose.yml:
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.prod
  ports:
    - "80:80"
  # Remove volumes for production
```

## Troubleshooting

### Frontend won't start
```bash
# Rebuild without cache
docker-compose build --no-cache frontend
docker-compose up frontend
```

### Backend database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check migrations
docker-compose exec backend alembic current
```

### Port conflicts
If ports are already in use, update `docker-compose.yml`:
```yaml
ports:
  - "5174:5173"  # Frontend
  - "8001:8000"  # Backend
```

### Clear everything and start fresh
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## Environment Variables

### Frontend (.env or docker-compose.yml)
```bash
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=CloudManager
```

### Backend (.env)
```bash
DATABASE_URL=postgresql+asyncpg://cloudmanager:password@postgres:5432/cloudmanager
REDIS_URL=redis://:password@redis:6379/0
JWT_SECRET_KEY=your-secret-key
DEBUG=True
ENVIRONMENT=development
```

## Next Steps

1. **Fix TypeScript errors** (Priority 1)
   - Convert type-only string unions to enums where used as values
   - Fix type imports using `import type` syntax
   - Add missing User model fields
   - Fix circular dependencies

2. **Test the application** (Priority 2)
   - Verify frontend connects to backend API
   - Test authentication flow
   - Test customer CRUD operations

3. **Production preparation** (Priority 3)
   - Create optimized production Dockerfile
   - Set up proper environment variables
   - Configure SSL/TLS certificates
   - Set up CI/CD pipeline

## Status

- ✅ Backend: Running in development mode with auto-reload
- ✅ Frontend: Running in development mode with hot-reload
- ✅ Database: PostgreSQL with all migrations applied
- ✅ Redis: Running and available
- ⚠️ TypeScript: Has compilation errors (non-blocking in dev mode)
- ❌ Production: Not ready until TypeScript errors are fixed

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review DOCKER.md for detailed deployment guide
- Check DEVELOPMENT_PROGRESS.md for project status
