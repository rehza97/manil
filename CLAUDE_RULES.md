# CloudManager v1.0 - Claude Development Rules

## Project Overview

**Project Name:** CloudManager / HostingManager v1.0
**Type:** Enterprise Cloud & Hosting Management Platform
**Team:** Manil (Backend Lead) & Wassim (Frontend Lead)
**Duration:** 90 days development + 15 days testing
**Tech Stack:** React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui | FastAPI + PostgreSQL + Redis

---

## 🎯 Core Principles

### 1. **Modular Architecture - STRICTLY ENFORCED**

- Each file MUST have a **single responsibility**
- Maximum **150 lines** per file (excluding comments and imports)
- If a file exceeds 150 lines, it MUST be split into smaller modules
- Functions should not exceed **30 lines**
- Classes should not exceed **200 lines**

### 2. **Production-Grade Quality**

- All code must be production-ready from day one
- No placeholder code or "TODO" comments in committed code
- Comprehensive error handling in every function
- Security-first approach in all implementations
- Performance optimization as a default practice

### 3. **Reusability**

- Write code that can be reused across multiple projects
- Abstract business logic from infrastructure code
- Create generic utilities and helpers
- Document reusable components thoroughly

---

## 📁 Project Structure

```
cloudmanager/
├── frontend/                      # React + Vite Application
│   ├── src/
│   │   ├── app/                   # Application configuration
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── providers.tsx
│   │   ├── modules/               # Feature modules (domain-driven)
│   │   │   ├── auth/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   ├── types/
│   │   │   │   ├── utils/
│   │   │   │   └── index.ts
│   │   │   ├── customers/
│   │   │   ├── tickets/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── reporting/
│   │   │   └── settings/
│   │   ├── shared/                # Shared across modules
│   │   │   ├── components/        # Reusable UI components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── utils/             # Helper functions
│   │   │   ├── types/             # TypeScript types/interfaces
│   │   │   ├── constants/         # Application constants
│   │   │   ├── api/               # API client configuration
│   │   │   └── store/             # Global state management
│   │   ├── layouts/               # Page layouts
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── PublicLayout.tsx
│   │   ├── pages/                 # Route pages (thin layer)
│   │   └── assets/                # Static assets
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── backend/                       # FastAPI Application
│   ├── app/
│   │   ├── main.py               # Application entry point
│   │   ├── config/               # Configuration management
│   │   │   ├── __init__.py
│   │   │   ├── settings.py       # Environment settings
│   │   │   └── database.py       # Database configuration
│   │   ├── core/                 # Core application logic
│   │   │   ├── __init__.py
│   │   │   ├── security.py       # Security utilities
│   │   │   ├── dependencies.py   # FastAPI dependencies
│   │   │   ├── exceptions.py     # Custom exceptions
│   │   │   └── middleware.py     # Custom middleware
│   │   ├── modules/              # Feature modules (domain-driven)
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py     # API routes
│   │   │   │   ├── service.py    # Business logic
│   │   │   │   ├── models.py     # Database models
│   │   │   │   ├── schemas.py    # Pydantic schemas
│   │   │   │   ├── repository.py # Data access layer
│   │   │   │   └── utils.py      # Module-specific utils
│   │   │   ├── customers/
│   │   │   ├── tickets/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── invoices/
│   │   │   ├── reporting/
│   │   │   └── settings/
│   │   ├── shared/               # Shared utilities
│   │   │   ├── __init__.py
│   │   │   ├── utils/            # Helper functions
│   │   │   ├── validators/       # Custom validators
│   │   │   ├── constants/        # Application constants
│   │   │   └── types/            # Custom types
│   │   ├── infrastructure/       # Infrastructure concerns
│   │   │   ├── __init__.py
│   │   │   ├── database/         # Database utilities
│   │   │   ├── cache/            # Redis cache
│   │   │   ├── email/            # Email service
│   │   │   ├── sms/              # SMS service
│   │   │   ├── storage/          # File storage
│   │   │   └── pdf/              # PDF generation
│   │   └── migrations/           # Alembic migrations
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
│
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
└── docker-compose.yml            # Docker configuration
```

---

## 🎨 Frontend Rules (React + Vite + TypeScript)

### Module Structure Pattern

Each module MUST follow this structure:

```typescript
module/
├── components/           # UI components (max 150 lines each)
│   ├── ModuleList.tsx
│   ├── ModuleForm.tsx
│   ├── ModuleCard.tsx
│   └── index.ts
├── hooks/               # Custom hooks (max 100 lines each)
│   ├── useModule.ts
│   ├── useModuleForm.ts
│   └── index.ts
├── services/            # API calls (max 150 lines each)
│   ├── moduleService.ts
│   └── index.ts
├── types/               # TypeScript interfaces
│   ├── module.types.ts
│   └── index.ts
├── utils/               # Module utilities
│   ├── moduleHelpers.ts
│   └── index.ts
└── index.ts             # Module exports
```

### Component Rules

#### 1. Component File Structure

```typescript
// 1. Imports (grouped and sorted)
import React from 'react';
import { type ComponentProps } from './types';
import { useCustomHook } from './hooks';
import { Button } from '@/shared/components/ui/button';

// 2. Type definitions
interface Props {
  // Props definition
}

// 3. Component definition (max 100 lines)
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // 4. Hooks (all at the top)
  const [state, setState] = React.useState();
  const customData = useCustomHook();

  // 5. Event handlers (separate functions)
  const handleClick = () => {
    // Handler logic
  };

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// 7. Display name (for debugging)
ComponentName.displayName = 'ComponentName';
```

#### 2. Component Best Practices

- Use **functional components** with hooks (no class components)
- One component per file
- Extract complex JSX into separate components
- Use **React.memo()** for expensive components
- Implement proper **error boundaries**
- Always provide **TypeScript types** for props

#### 3. Custom Hooks

```typescript
// hooks/useFeature.ts
import { useState, useEffect } from 'react';
import { type FeatureData } from '../types';

export const useFeature = (id: string) => {
  const [data, setData] = useState<FeatureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Logic
  }, [id]);

  return { data, loading, error };
};
```

**Hook Rules:**

- Start with `use` prefix
- Max 100 lines per hook
- Return object with clear naming
- Handle loading and error states
- Clean up side effects

#### 4. Service Layer (API Calls)

```typescript
// services/customerService.ts
import { apiClient } from '@/shared/api/client';
import { type Customer, type CreateCustomerDTO } from '../types';

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>('/customers');
    return response.data;
  },

  async getById(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const response = await apiClient.post<Customer>('/customers', data);
    return response.data;
  },

  // More methods...
};
```

**Service Rules:**

- One service object per domain entity
- Use async/await (no raw promises)
- Proper TypeScript types for all methods
- Centralized error handling
- Max 150 lines per service file

### State Management

#### 1. Use React Query for Server State

```typescript
// hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: customerService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
```

#### 2. Use Zustand for Client State

```typescript
// shared/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### TypeScript Standards

#### 1. Type Definitions

```typescript
// types/customer.types.ts

// Base entity
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

// Enums
export enum CustomerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

// DTOs (Data Transfer Objects)
export interface CreateCustomerDTO {
  name: string;
  email: string;
  phone: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  id: string;
}

// API Response types
export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}
```

**TypeScript Rules:**

- **No `any` type** - always use proper types
- Use `interface` for objects, `type` for unions
- Export all types from `index.ts`
- Use strict mode
- Prefer `unknown` over `any` if type is truly unknown

### shadcn/ui Integration

#### 1. Component Usage

```typescript
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export const CustomerForm: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Customer name" />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

#### 2. ALL Required Components

You MUST install and use ALL components from `shadcn_components.txt`:

```bash
# UI Components
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add aspect-ratio
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add breadcrumb
npx shadcn@latest add button
npx shadcn@latest add calendar
npx shadcn@latest add card
npx shadcn@latest add carousel
npx shadcn@latest add chart
npx shadcn@latest add checkbox
npx shadcn@latest add collapsible
npx shadcn@latest add command
npx shadcn@latest add context-menu
npx shadcn@latest add dialog
npx shadcn@latest add drawer
npx shadcn@latest add dropdown-menu
npx shadcn@latest add hover-card
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add input-otp
npx shadcn@latest add label
npx shadcn@latest add menubar
npx shadcn@latest add navigation-menu
npx shadcn@latest add pagination
npx shadcn@latest add popover
npx shadcn@latest add progress
npx shadcn@latest add radio-group
npx shadcn@latest add resizable
npx shadcn@latest add scroll-area
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add sheet
npx shadcn@latest add sidebar
npx shadcn@latest add skeleton
npx shadcn@latest add slider
npx shadcn@latest add sonner
npx shadcn@latest add switch
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add textarea
npx shadcn@latest add toggle
npx shadcn@latest add toggle-group
npx shadcn@latest add tooltip

# Additional dependencies
npm install @tanstack/react-table
```

### Form Handling

#### Use React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema definition
const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Invalid phone number'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const CustomerForm: React.FC = () => {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = async (data: CustomerFormData) => {
    // Handle submission
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* Fields */}</form>;
};
```

### Routing

```typescript
// app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
    ],
  },
]);
```

---

## 🔧 Backend Rules (FastAPI + PostgreSQL)

### Module Structure Pattern

Each module MUST follow this layered architecture:

```python
module/
├── __init__.py          # Module initialization
├── router.py            # API routes (max 150 lines)
├── service.py           # Business logic (max 150 lines)
├── repository.py        # Data access (max 150 lines)
├── models.py            # SQLAlchemy models (max 150 lines)
├── schemas.py           # Pydantic schemas (max 150 lines)
└── utils.py             # Module utilities (max 100 lines)
```

### 1. Router Layer (API Endpoints)

```python
# modules/customers/router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
)
from app.modules.customers.service import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
async def get_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get all customers with pagination."""
    service = CustomerService(db)
    return await service.get_all(skip=skip, limit=limit)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get customer by ID."""
    service = CustomerService(db)
    return await service.get_by_id(customer_id)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new customer."""
    service = CustomerService(db)
    return await service.create(customer_data, created_by=current_user.id)
```

**Router Rules:**

- Max 150 lines per router file
- One router per module
- Use dependency injection
- Clear docstrings for all endpoints
- Proper HTTP status codes
- Response models for all endpoints

### 2. Service Layer (Business Logic)

```python
# modules/customers/service.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate
from app.modules.customers.models import Customer
from app.infrastructure.email.service import EmailService


class CustomerService:
    """Customer business logic service."""

    def __init__(self, db: Session):
        self.repository = CustomerRepository(db)
        self.email_service = EmailService()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Customer]:
        """Get all customers with pagination."""
        return await self.repository.get_all(skip=skip, limit=limit)

    async def get_by_id(self, customer_id: str) -> Customer:
        """Get customer by ID."""
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")
        return customer

    async def create(
        self,
        customer_data: CustomerCreate,
        created_by: str
    ) -> Customer:
        """Create a new customer."""
        # Check if email already exists
        existing = await self.repository.get_by_email(customer_data.email)
        if existing:
            raise ConflictException("Email already exists")

        # Create customer
        customer = await self.repository.create(customer_data, created_by)

        # Send welcome email
        await self.email_service.send_welcome_email(customer.email)

        return customer

    async def update(
        self,
        customer_id: str,
        customer_data: CustomerUpdate
    ) -> Customer:
        """Update customer."""
        customer = await self.get_by_id(customer_id)
        return await self.repository.update(customer, customer_data)

    async def delete(self, customer_id: str) -> None:
        """Delete customer."""
        customer = await self.get_by_id(customer_id)
        await self.repository.delete(customer)
```

**Service Rules:**

- Max 150 lines per service file
- Contains ALL business logic
- No database queries (use repository)
- No request/response handling (use router)
- Proper exception handling
- Async/await for I/O operations

### 3. Repository Layer (Data Access)

```python
# modules/customers/repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate


class CustomerRepository:
    """Customer data access layer."""

    def __init__(self, db: Session):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Customer]:
        """Get all customers."""
        query = select(Customer).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, customer_id: str) -> Optional[Customer]:
        """Get customer by ID."""
        query = select(Customer).where(Customer.id == customer_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email."""
        query = select(Customer).where(Customer.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(
        self,
        customer_data: CustomerCreate,
        created_by: str
    ) -> Customer:
        """Create a new customer."""
        customer = Customer(
            **customer_data.model_dump(),
            created_by=created_by,
        )
        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def update(
        self,
        customer: Customer,
        customer_data: CustomerUpdate
    ) -> Customer:
        """Update customer."""
        update_data = customer_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)

        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def delete(self, customer: Customer) -> None:
        """Delete customer."""
        await self.db.delete(customer)
        await self.db.commit()
```

**Repository Rules:**

- Max 150 lines per repository file
- ONLY database operations
- No business logic
- Use SQLAlchemy 2.0 style (select statements)
- Return models, not dictionaries
- Async/await for all operations

### 4. Models (Database Models)

```python
# modules/customers/models.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.modules.customers.schemas import CustomerStatus


class Customer(Base):
    """Customer database model."""

    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[CustomerStatus] = mapped_column(
        SQLEnum(CustomerStatus),
        default=CustomerStatus.PENDING
    )

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)

    # Relationships
    tickets = relationship("Ticket", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

    def __repr__(self) -> str:
        return f"<Customer {self.name} ({self.email})>"
```

**Model Rules:**

- Max 150 lines per model file
- Use `Mapped` type hints (SQLAlchemy 2.0)
- Always include audit fields (created_at, updated_at, created_by)
- Use UUIDs for primary keys
- Index frequently queried fields
- Define relationships clearly

### 5. Schemas (Pydantic Validation)

```python
# modules/customers/schemas.py
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class CustomerStatus(str, Enum):
    """Customer status enumeration."""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class CustomerBase(BaseModel):
    """Base customer schema."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., pattern=r"^[0-9]{10}$")


class CustomerCreate(CustomerBase):
    """Schema for creating a customer."""
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating a customer."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^[0-9]{10}$")
    status: Optional[CustomerStatus] = None


class CustomerResponse(CustomerBase):
    """Schema for customer response."""
    id: str
    status: CustomerStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    """Schema for customer list response."""
    data: list[CustomerResponse]
    total: int
    page: int
    page_size: int
```

**Schema Rules:**

- Max 150 lines per schema file
- Use Pydantic V2 syntax
- Separate schemas for Create/Update/Response
- Use `Field` for validation rules
- Use `EmailStr`, `HttpUrl`, etc. for typed fields
- Enable `from_attributes` for ORM models

### Configuration Management

```python
# config/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # App
    APP_NAME: str = "CloudManager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str
    REDIS_PASSWORD: str | None = None

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email
    EMAIL_PROVIDER: str = "sendgrid"
    EMAIL_FROM: str
    SENDGRID_API_KEY: str | None = None

    # SMS
    SMS_PROVIDER: str = "twilio"
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None

    # Security
    BCRYPT_ROUNDS: int = 12
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

### Database Configuration

```python
# config/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config.settings import get_settings

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Exception Handling

```python
# core/exceptions.py
from fastapi import HTTPException, status


class CloudManagerException(HTTPException):
    """Base exception for CloudManager."""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(CloudManagerException):
    """Raised when resource not found."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ConflictException(CloudManagerException):
    """Raised when resource conflict occurs."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class UnauthorizedException(CloudManagerException):
    """Raised when user is not authorized."""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(CloudManagerException):
    """Raised when user is forbidden from resource."""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class ValidationException(CloudManagerException):
    """Raised when validation fails."""

    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
```

### Dependency Injection

```python
# core/dependencies.py
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.modules.auth.service import AuthService
from app.modules.auth.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    auth_service = AuthService(db)
    user = await auth_service.verify_token(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def require_role(required_roles: list[str]):
    """Dependency to require specific roles."""
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker
```

### Main Application

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config.settings import get_settings
from app.core.middleware import LoggingMiddleware, RateLimitMiddleware
from app.modules.auth.router import router as auth_router
from app.modules.customers.router import router as customers_router
from app.modules.tickets.router import router as tickets_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}
```

---

## 🔒 Security Rules

### 1. Authentication

- Use JWT with access + refresh tokens
- Access token: 30 minutes expiry
- Refresh token: 7 days expiry
- Store tokens in HTTP-only cookies (frontend)
- Implement 2FA with TOTP (Google Authenticator)

### 2. Authorization

- Implement RBAC (Role-Based Access Control)
- Roles: admin, corporate, client
- Granular permissions per resource
- Check permissions at service layer

### 3. Password Security

- Use bcrypt with 12 rounds minimum
- Minimum 8 characters, must include uppercase, lowercase, number
- Password reset with email verification
- Track failed login attempts

### 4. Data Protection

- Encrypt sensitive data at rest
- Use HTTPS only in production
- Sanitize all user inputs
- Implement CSRF protection
- Rate limiting on all endpoints

### 5. Audit Trail

- Log all authentication events
- Log all data modifications
- Include user ID, timestamp, action, resource
- Store logs securely

---

## 📊 Database Rules

### 1. Naming Conventions

- Tables: lowercase, plural (e.g., `customers`, `tickets`)
- Columns: lowercase, snake_case (e.g., `created_at`, `first_name`)
- Indexes: `idx_table_column` (e.g., `idx_customers_email`)
- Foreign keys: `fk_table1_table2` (e.g., `fk_tickets_customers`)

### 2. Required Fields

Every table MUST have:

- `id` (UUID, primary key)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `created_by` (user ID)

### 3. Indexes

- Index all foreign keys
- Index frequently searched columns
- Index columns used in WHERE clauses
- Use composite indexes wisely

### 4. Migrations

- Use Alembic for migrations
- Never edit existing migrations
- Test migrations on staging first
- Include rollback strategy

---

## 🧪 Testing Rules

### Frontend Testing

```typescript
// Component test
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerForm } from './CustomerForm';

describe('CustomerForm', () => {
  it('should render form fields', () => {
    render(<CustomerForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should submit valid form', async () => {
    const onSubmit = jest.fn();
    render(<CustomerForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });
});
```

### Backend Testing

```python
# Service test
import pytest
from app.modules.customers.service import CustomerService
from app.modules.customers.schemas import CustomerCreate

@pytest.mark.asyncio
async def test_create_customer(db_session):
    """Test creating a customer."""
    service = CustomerService(db_session)

    customer_data = CustomerCreate(
        name="John Doe",
        email="john@example.com",
        phone="1234567890",
    )

    customer = await service.create(customer_data, created_by="test-user")

    assert customer.id is not None
    assert customer.name == "John Doe"
    assert customer.email == "john@example.com"

@pytest.mark.asyncio
async def test_create_duplicate_customer(db_session):
    """Test creating a customer with duplicate email."""
    service = CustomerService(db_session)

    customer_data = CustomerCreate(
        name="John Doe",
        email="john@example.com",
        phone="1234567890",
    )

    await service.create(customer_data, created_by="test-user")

    with pytest.raises(ConflictException):
        await service.create(customer_data, created_by="test-user")
```

### Testing Requirements

- Minimum 80% code coverage
- Test all business logic
- Test error cases
- Test edge cases
- Integration tests for API endpoints
- E2E tests for critical flows

---

## 📝 Documentation Rules

### 1. Code Documentation

```python
def calculate_total(items: list[Item], tax_rate: float = 0.2) -> float:
    """
    Calculate total price including tax.

    Args:
        items: List of items to calculate total for
        tax_rate: Tax rate as decimal (default: 0.2 for 20%)

    Returns:
        Total price including tax

    Raises:
        ValueError: If items list is empty

    Example:
        >>> items = [Item(price=10), Item(price=20)]
        >>> calculate_total(items, tax_rate=0.2)
        36.0
    """
    if not items:
        raise ValueError("Items list cannot be empty")

    subtotal = sum(item.price for item in items)
    return subtotal * (1 + tax_rate)
```

### 2. API Documentation

- Use OpenAPI/Swagger
- Document all endpoints
- Include request/response examples
- Document error responses
- Specify authentication requirements

### 3. README Files

Each module MUST have a README.md:

```markdown
# Customer Module

## Overview
Manages customer accounts, profiles, and validation.

## Features
- Customer CRUD operations
- KYC validation
- Account status management
- Security activity tracking

## API Endpoints
- `GET /api/v1/customers` - List all customers
- `GET /api/v1/customers/{id}` - Get customer by ID
- `POST /api/v1/customers` - Create customer
- `PUT /api/v1/customers/{id}` - Update customer
- `DELETE /api/v1/customers/{id}` - Delete customer

## Database Schema
See [models.py](./models.py)

## Usage Example
\```python
service = CustomerService(db)
customer = await service.create(CustomerCreate(...))
\```
```

---

## 🚀 Performance Rules

### Frontend

- Lazy load routes and components
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Optimize images (WebP, lazy loading)
- Use production builds for deployment
- Implement code splitting

### Backend

- Use database connection pooling
- Implement Redis caching for frequently accessed data
- Use async/await for I/O operations
- Paginate large result sets
- Use database indexes
- Implement rate limiting

### Database

- Optimize queries with EXPLAIN
- Avoid N+1 queries
- Use eager loading for relationships
- Index foreign keys
- Regular VACUUM and ANALYZE

---

## 🐛 Error Handling Rules

### Frontend

```typescript
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Uncaught error:', error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div>
        <h1>Something went wrong</h1>
        <button onClick={() => setHasError(false)}>Try again</button>
      </div>
    );
  }

  return <>{children}</>;
};
```

### Backend

```python
# Global exception handler
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    # Log error
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
        },
    )
```

---

## 📦 Deployment Rules

### Environment Configuration

- Use `.env` files for configuration
- Never commit secrets to git
- Different configs for dev/staging/prod
- Use environment variables in production

### Docker

- Multi-stage builds for optimization
- Use slim base images
- Implement health checks
- Run as non-root user

### CI/CD

- Run tests on every commit
- Lint code before merge
- Build Docker images
- Deploy to staging automatically
- Deploy to production manually

---

## 📋 Git Workflow Rules

### Branch Naming

- `feature/module-name-description` - New features
- `fix/module-name-bug-description` - Bug fixes
- `refactor/module-name-description` - Refactoring
- `docs/description` - Documentation
- `test/module-name-description` - Tests

### Commit Messages

```
type(scope): subject

body (optional)

footer (optional)
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

Example:

```
feat(customers): add customer creation endpoint

- Implement CustomerService.create()
- Add CustomerCreate schema
- Add POST /api/v1/customers endpoint
- Add unit tests

Closes #123
```

### Pull Request Rules

- One feature per PR
- Update documentation
- Add tests
- Pass CI checks
- Code review required
- Squash commits before merge

---

## ✅ Code Quality Checklist

Before committing ANY code, verify:

### General

- [ ] File is under 150 lines (or properly justified)
- [ ] Single responsibility principle followed
- [ ] No code duplication
- [ ] Clear, descriptive names
- [ ] No commented-out code
- [ ] No console.log or print statements
- [ ] Proper error handling

### Frontend

- [ ] TypeScript types defined
- [ ] No `any` types
- [ ] Components are memoized if needed
- [ ] Hooks follow rules of hooks
- [ ] Props are properly typed
- [ ] Loading and error states handled
- [ ] Accessibility attributes present

### Backend

- [ ] Proper layering (router → service → repository)
- [ ] All database queries in repository
- [ ] All business logic in service
- [ ] Pydantic schemas validated
- [ ] Async/await used correctly
- [ ] Proper exception handling
- [ ] Database transactions used

### Security

- [ ] User input validated
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection implemented
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Audit trail logged

### Testing

- [ ] Unit tests written
- [ ] Tests pass locally
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Minimum 80% coverage

### Documentation

- [ ] Code comments for complex logic
- [ ] Docstrings for functions
- [ ] API endpoint documented
- [ ] README updated if needed
- [ ] Type hints present

---

## 🎯 Module Development Checklist

When developing a new module, complete in this order:

### Backend (First)

1. [ ] Create module folder structure
2. [ ] Define Pydantic schemas (schemas.py)
3. [ ] Create database models (models.py)
4. [ ] Write Alembic migration
5. [ ] Implement repository layer (repository.py)
6. [ ] Implement service layer (service.py)
7. [ ] Create API router (router.py)
8. [ ] Write unit tests
9. [ ] Update main.py to include router
1. [ ] Test endpoints with Postman/curl

### Frontend (Second)

1. [ ] Create module folder structure
2. [ ] Define TypeScript types (types/)
3. [ ] Create API service (services/)
4. [ ] Create React Query hooks (hooks/)
5. [ ] Build UI components (components/)
6. [ ] Create pages
7. [ ] Add routes to router
8. [ ] Write component tests
9. [ ] Test in browser
1. [ ] Verify integration with backend

---

## 🚨 Critical Rules - NEVER BREAK

1. **NO direct database queries in routers or services** - Use repository layer
2. **NO business logic in repositories** - Only data access
3. **NO `any` type in TypeScript** - Always use proper types
4. **NO secrets in code** - Use environment variables
5. **NO files over 150 lines** - Split into smaller files
6. **NO skipping error handling** - Handle all errors
7. **NO skipping tests** - Minimum 80% coverage
8. **NO merging without code review** - Always review
9. **NO committing without running tests** - Tests must pass
10. **NO documentation gaps** - Document everything

---

## 📚 Required Dependencies

### Frontend

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.13.0",
    "@tanstack/react-table": "^8.10.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "vitest": "^1.0.0"
  }
}
```

### Backend

```
fastapi[all]==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy[asyncio]==2.0.23
alembic==1.12.1
asyncpg==0.29.0
pydantic[email]==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis==5.0.1
celery==5.3.4
sendgrid==6.11.0
twilio==8.10.0
pyotp==2.9.0
qrcode==7.4.2
reportlab==4.0.7
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.1
```

---

## 🎓 Learning Resources

### React + TypeScript

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query Docs](https://tanstack.com/query/latest)

### FastAPI

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0 Docs](https://docs.sqlalchemy.org)
- [Pydantic V2 Docs](https://docs.pydantic.dev)

### Architecture

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

## 🔄 Development Workflow

### Daily Routine

1. Pull latest changes from main
2. Create feature branch
3. Write failing test
4. Implement feature
5. Make test pass
6. Refactor if needed
7. Run all tests
8. Commit with clear message
9. Push to remote
10. Create pull request

### Code Review Focus

- Architecture adherence
- Code quality
- Test coverage
- Documentation completeness
- Security concerns
- Performance implications

---

## 📞 Support and Questions

For questions about:

- **Architecture**: Consult this document first
- **Technical decisions**: Discuss with team lead
- **Blockers**: Raise immediately in daily standup
- **Best practices**: Refer to official documentation

---

**Remember: Production-grade code from day one. No shortcuts. No exceptions.**

**Version:** 1.0
**Last Updated:** 2025-10-13
**Maintained By:** Manil & Wassim
