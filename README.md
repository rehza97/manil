# CloudManager v1.0

> Enterprise Cloud & Hosting Management Platform

A comprehensive cloud and hosting management system with three interfaces: Client Dashboard, Corporate Dashboard, and Admin Dashboard (DSI). Built with modern tech stack following strict modular architecture principles.

## 📋 Project Overview

**Duration:** 90 days development + 15 days testing
**Team:** Manil (Backend Lead) & Wassim (Frontend Lead)
**Type:** MVP (Minimum Viable Product)

### Features

- **User Dashboard** (Public with 2FA)
  - Profile management and security
  - Service subscriptions
  - Ticket system
  - Product catalog

- **Corporate Dashboard** (VPN)
  - Customer management and KYC validation
  - Product/service catalog management
  - Ticket and order management
  - Quote and invoice generation

- **Admin Dashboard** (DSI/VPN)
  - System configuration
  - Role-based access control (RBAC)
  - Audit trail and activity monitoring

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **State Management:** React Query + Zustand
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v6

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15+ (async with SQLAlchemy 2.0)
- **Cache:** Redis 7+
- **Authentication:** JWT + OAuth2 + 2FA (TOTP/SMS)
- **Migrations:** Alembic

### Infrastructure
- **Email:** SendGrid / AWS SES
- **SMS:** Twilio / Infobip
- **Storage:** Local / MinIO / AWS S3
- **PDF:** ReportLab

## 📁 Project Structure

```
cloudmanager/
├── CLAUDE_RULES.md          # Development rules & guidelines
├── README.md                 # This file
├── docker-compose.yml        # Docker configuration
├── .gitignore
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── app/             # App configuration
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/
│   │   │   ├── customers/
│   │   │   ├── tickets/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── reporting/
│   │   │   └── settings/
│   │   ├── shared/          # Shared components & utilities
│   │   ├── layouts/         # Page layouts
│   │   └── pages/           # Route pages
│   ├── package.json
│   └── README.md
│
└── backend/                  # FastAPI application
    ├── app/
    │   ├── config/          # Configuration
    │   ├── core/            # Core functionality
    │   ├── modules/         # Feature modules
    │   │   ├── auth/
    │   │   ├── customers/
    │   │   ├── tickets/
    │   │   ├── products/
    │   │   ├── orders/
    │   │   ├── invoices/
    │   │   ├── reporting/
    │   │   └── settings/
    │   ├── shared/          # Shared utilities
    │   ├── infrastructure/  # Infrastructure services
    │   └── migrations/      # Database migrations
    ├── tests/
    ├── requirements.txt
    └── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.11+
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cloudmanager
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

4. **Setup Database**
   ```bash
   # Create PostgreSQL database
   createdb cloudmanager

   # Run migrations
   cd backend
   alembic upgrade head
   ```

5. **Setup Redis**
   ```bash
   # Install and start Redis
   redis-server
   ```

### Development URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

## 🎯 Development Rules

**CRITICAL:** All developers MUST read and follow [CLAUDE_RULES.md](./CLAUDE_RULES.md)

### Key Principles

1. **Modular Architecture**
   - Each file has a single responsibility
   - Maximum 150 lines per file
   - Functions max 30 lines
   - Classes max 200 lines

2. **Production-Grade Quality**
   - No placeholder code
   - Comprehensive error handling
   - Security-first approach
   - Performance optimization

3. **Testing**
   - Minimum 80% code coverage
   - Unit tests for all business logic
   - Integration tests for APIs
   - E2E tests for critical flows

4. **Documentation**
   - Clear docstrings for all functions
   - API documentation (OpenAPI/Swagger)
   - README in each module
   - Code comments for complex logic

## 📝 Module Development Workflow

### Backend Module Structure

```
modules/[module_name]/
├── __init__.py
├── router.py        # API endpoints
├── service.py       # Business logic
├── repository.py    # Database operations
├── models.py        # SQLAlchemy models
├── schemas.py       # Pydantic schemas
└── utils.py         # Module-specific utilities
```

### Frontend Module Structure

```
modules/[module_name]/
├── components/      # UI components
├── hooks/           # Custom hooks
├── services/        # API calls
├── types/           # TypeScript types
├── utils/           # Module utilities
└── index.ts         # Module exports
```

## 🧪 Testing

### Frontend
```bash
cd frontend
npm test              # Run tests
npm run test:coverage # Run with coverage
```

### Backend
```bash
cd backend
pytest                      # Run tests
pytest --cov=app            # Run with coverage
pytest --cov=app --cov-report=html  # HTML coverage report
```

## 🔒 Security

- **Authentication:** JWT with access (30 min) + refresh tokens (7 days)
- **2FA:** TOTP (Google Authenticator) + SMS backup
- **RBAC:** Role-based access control with granular permissions
- **Audit Trail:** All actions logged with user, timestamp, and details
- **Password Security:** Bcrypt with 12 rounds
- **Data Protection:** HTTPS only, CSRF protection, rate limiting

## 📦 Deployment

### Docker Deployment

```bash
docker-compose up -d
```

### Manual Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Configure Nginx**
   - Serve frontend static files
   - Proxy API requests to backend
   - Enable HTTPS with SSL certificates

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=CloudManager
VITE_ENVIRONMENT=development
```

#### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/cloudmanager
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-super-secret-key-here
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
```

## 📚 Documentation

- [Development Rules](./CLAUDE_RULES.md) - **MUST READ**
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)
- [API Documentation](http://localhost:8000/api/docs) (when running)

## 🤝 Contributing

1. Read [CLAUDE_RULES.md](./CLAUDE_RULES.md)
2. Create feature branch: `feature/module-name-description`
3. Follow code quality checklist
4. Write tests (minimum 80% coverage)
5. Update documentation
6. Submit pull request

### Git Workflow

```bash
git checkout -b feature/customers-crud
# Make changes
git add .
git commit -m "feat(customers): add customer creation endpoint"
git push origin feature/customers-crud
# Create pull request
```

## 🐛 Troubleshooting

### Frontend Issues

**Module not found:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Port already in use:**
```bash
# Change port in vite.config.ts or kill process
lsof -ti:5173 | xargs kill -9
```

### Backend Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
pg_isready
# Check connection string in .env
```

**Migration errors:**
```bash
# Reset migrations (development only!)
alembic downgrade base
alembic upgrade head
```

## 📊 Project Milestones

- **Week 1-2:** Infrastructure + Auth (2FA, RBAC)
- **Week 3-5:** Customer & Ticket Management
- **Week 6-8:** Commercial (Products, Orders)
- **Week 9-11:** Invoicing & Reporting
- **Week 11-12:** Testing & Stabilization

## 📄 License

Proprietary - Algérie Télécom DSI

## 👥 Team

- **Manil** - Backend Lead (FastAPI, Auth, Tickets, Infrastructure)
- **Wassim** - Frontend Lead (React, UI/UX, Customer, Products)

## 📞 Contact

For questions or issues:
- Create an issue in the repository
- Contact project leads
- Refer to documentation

---

**Version:** 1.0.0
**Last Updated:** 2025-10-13
**Status:** In Development
