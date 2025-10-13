# CloudManager Backend

> FastAPI backend with modular architecture

## 📋 Overview

Production-grade backend API built with FastAPI, featuring modular architecture, async database operations, JWT authentication with 2FA, and comprehensive security measures.

## 🛠 Tech Stack

- **FastAPI** 0.104+ - Modern Python web framework
- **SQLAlchemy** 2.0 - Async ORM
- **Alembic** - Database migrations
- **PostgreSQL** 15+ - Primary database
- **Redis** 7+ - Caching and sessions
- **Pydantic** V2 - Data validation
- **JWT** - Authentication
- **pytest** - Testing framework

## 📁 Structure

```
app/
├── config/                   # Configuration
│   ├── settings.py          # Environment settings
│   └── database.py          # Database setup
│
├── core/                     # Core functionality
│   ├── exceptions.py        # Custom exceptions
│   ├── security.py          # Auth utilities
│   ├── dependencies.py      # FastAPI dependencies
│   └── middleware.py        # Custom middleware
│
├── modules/                  # Feature modules
│   ├── auth/
│   │   ├── router.py        # API routes
│   │   ├── service.py       # Business logic
│   │   ├── repository.py    # Database operations
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── utils.py         # Module utilities
│   ├── customers/
│   ├── tickets/
│   ├── products/
│   ├── orders/
│   ├── invoices/
│   ├── reporting/
│   └── settings/
│
├── shared/                   # Shared utilities
│   ├── utils/
│   ├── validators/
│   ├── constants/
│   └── types/
│
├── infrastructure/           # Infrastructure services
│   ├── database/            # DB utilities
│   ├── cache/               # Redis cache
│   ├── email/               # Email service
│   ├── sms/                 # SMS service
│   ├── storage/             # File storage
│   └── pdf/                 # PDF generation
│
├── migrations/              # Alembic migrations
└── main.py                  # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
# Create database
createdb cloudmanager

# Run migrations
alembic upgrade head

# Create first migration (if needed)
alembic revision --autogenerate -m "initial migration"
```

### Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

## 📝 Development Guidelines

### Module Creation

Every module MUST follow this layered architecture:

#### 1. Schemas (schemas.py)

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

#### 2. Models (models.py)

```python
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.config.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

#### 3. Repository (repository.py)

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, customer_id: str) -> Customer | None:
        query = select(Customer).where(Customer.id == customer_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, customer_data: CustomerCreate) -> Customer:
        customer = Customer(**customer_data.model_dump())
        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)
        return customer
```

#### 4. Service (service.py)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundException, ConflictException

class CustomerService:
    def __init__(self, db: AsyncSession):
        self.repository = CustomerRepository(db)

    async def get_by_id(self, customer_id: str) -> Customer:
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException("Customer not found")
        return customer

    async def create(self, customer_data: CustomerCreate) -> Customer:
        existing = await self.repository.get_by_email(customer_data.email)
        if existing:
            raise ConflictException("Email already exists")

        return await self.repository.create(customer_data)
```

#### 5. Router (router.py)

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get customer by ID."""
    service = CustomerService(db)
    return await service.get_by_id(customer_id)

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new customer."""
    service = CustomerService(db)
    return await service.create(customer_data)
```

## 🔒 Security

### Authentication

```python
from app.core.dependencies import get_current_user, require_role

@router.get("/admin-only")
async def admin_endpoint(
    current_user = Depends(require_role(["admin"])),
):
    return {"message": "Admin access"}
```

### Exception Handling

```python
from app.core.exceptions import NotFoundException

async def get_item(item_id: str):
    item = await repository.get_by_id(item_id)
    if not item:
        raise NotFoundException(f"Item {item_id} not found")
    return item
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_customers.py

# Run with verbose output
pytest -v
```

### Writing Tests

```python
import pytest
from app.modules.customers.service import CustomerService
from app.modules.customers.schemas import CustomerCreate

@pytest.mark.asyncio
async def test_create_customer(db_session):
    service = CustomerService(db_session)

    customer_data = CustomerCreate(
        name="John Doe",
        email="john@example.com",
        phone="1234567890",
    )

    customer = await service.create(customer_data)

    assert customer.id is not None
    assert customer.name == "John Doe"
    assert customer.email == "john@example.com"
```

## 🗄 Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to base
alembic downgrade base

# Show current version
alembic current

# Show migration history
alembic history
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Application
APP_NAME=CloudManager
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/cloudmanager
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@cloudmanager.com

# SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
```

## 📊 API Documentation

### Automatic Documentation

FastAPI generates interactive API documentation automatically:

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

### Documenting Endpoints

```python
@router.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new customer.

    Args:
        customer_data: Customer information

    Returns:
        Created customer object

    Raises:
        409: Email already exists
        422: Validation error
    """
    service = CustomerService(db)
    return await service.create(customer_data)
```

## 🚨 Common Issues

### Database connection error

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/cloudmanager
```

### Migration conflicts

```bash
# Reset migrations (development only!)
alembic downgrade base
alembic upgrade head
```

### Import errors

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## 📦 Dependencies

### Core
- fastapi[all] - Web framework
- uvicorn[standard] - ASGI server
- sqlalchemy[asyncio] - ORM
- alembic - Migrations
- pydantic[email] - Validation

### Security
- python-jose[cryptography] - JWT
- passlib[bcrypt] - Password hashing
- pyotp - 2FA TOTP

### Infrastructure
- redis - Caching
- sendgrid - Email
- twilio - SMS
- reportlab - PDF generation

### Development
- pytest - Testing
- black - Code formatting
- flake8 - Linting
- mypy - Type checking

## 🎯 Code Quality Checklist

Before committing:

- [ ] File under 150 lines
- [ ] Proper layering (router → service → repository)
- [ ] All database queries in repository
- [ ] All business logic in service
- [ ] Pydantic schemas validated
- [ ] Async/await used correctly
- [ ] Exception handling implemented
- [ ] Tests written and passing
- [ ] Docstrings for all functions

## 📚 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0 Docs](https://docs.sqlalchemy.org)
- [Pydantic V2 Docs](https://docs.pydantic.dev)
- [Alembic Docs](https://alembic.sqlalchemy.org)

---

**Remember:** Read [CLAUDE_RULES.md](../CLAUDE_RULES.md) for complete guidelines!
