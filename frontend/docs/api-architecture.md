# CloudManager API Architecture

## Overview

The CloudManager frontend implements a comprehensive, modular API architecture that follows single responsibility principles and provides role-based access to different dashboard functionalities.

## Architecture Principles

### 1. **Modular Structure**

- Each dashboard (Client, Corporate, Admin) has its own API namespace
- Each domain/feature has its own dedicated API file
- Clear separation of concerns and responsibilities

### 2. **Single Responsibility**

- Each API file handles ONE specific domain/feature
- Maximum 200 lines per file to maintain readability
- Consistent naming patterns across all APIs

### 3. **Type Safety**

- Full TypeScript support with comprehensive interfaces
- Strongly typed request/response data
- Consistent error handling patterns

### 4. **Role-Based Access**

- Different API endpoints for different user roles
- VPN validation for Corporate and Admin access
- Permission-based feature access

## Directory Structure

```
src/shared/api/
├── client.ts                 # Base API client configuration
├── index.ts                  # Main API exports
└── dashboard/                # Dashboard-specific APIs
    ├── index.ts              # Dashboard API exports
    ├── client/               # Client dashboard APIs
    │   ├── index.ts          # Client API exports
    │   ├── auth.ts           # Client authentication
    │   ├── profile.ts        # Client profile management
    │   ├── services.ts       # Client service management
    │   ├── tickets.ts        # Client support tickets
    │   ├── catalog.ts        # Client product catalog
    │   ├── orders.ts         # Client order management
    │   ├── invoices.ts       # Client invoice management
    │   └── settings.ts       # Client account settings
    ├── corporate/            # Corporate dashboard APIs
    │   ├── index.ts          # Corporate API exports
    │   ├── auth.ts           # Corporate authentication
    │   ├── customers.ts      # Customer management
    │   ├── tickets.ts        # Support ticket management
    │   ├── products.ts       # Product management
    │   ├── orders.ts         # Order management
    │   ├── quotes.ts         # Quote management
    │   ├── invoices.ts       # Invoice management
    │   ├── reports.ts        # Business reports
    │   └── settings.ts       # Corporate settings
    └── admin/                # Admin dashboard APIs
        ├── index.ts          # Admin API exports
        ├── auth.ts           # Admin authentication
        ├── users.ts          # User management
        ├── roles.ts          # Role & permission management
        ├── settings.ts       # System settings
        ├── logs.ts           # Activity & audit logs
        ├── reports.ts        # System reports
        ├── support.ts        # Support management
        └── maintenance.ts    # System maintenance
```

## API Service Patterns

### Standard API Service Structure

```typescript
/**
 * Domain API Service
 *
 * @module shared/api/dashboard/{dashboard}/{domain}
 */

import { apiClient } from "../../client";

export interface DomainEntity {
  id: string;
  // ... other properties
}

export interface CreateDomainData {
  // ... properties
}

export const domainApi = {
  /**
   * Get all entities
   */
  getEntities: async (
    params?: QueryParams
  ): Promise<PaginatedResponse<DomainEntity>> => {
    const response = await apiClient.get("/domain/entities", { params });
    return response.data;
  },

  /**
   * Get entity by ID
   */
  getEntity: async (id: string): Promise<DomainEntity> => {
    const response = await apiClient.get(`/domain/entities/${id}`);
    return response.data;
  },

  /**
   * Create new entity
   */
  createEntity: async (data: CreateDomainData): Promise<DomainEntity> => {
    const response = await apiClient.post("/domain/entities", data);
    return response.data;
  },

  // ... other methods
};
```

### Naming Conventions

- **API Objects**: `{domain}Api` (e.g., `clientAuthApi`, `corporateCustomersApi`)
- **Interfaces**: `{Domain}Entity`, `Create{Domain}Data`, `Update{Domain}Data`
- **Methods**: `getEntities`, `getEntity`, `createEntity`, `updateEntity`, `deleteEntity`

## Dashboard-Specific APIs

### Client Dashboard APIs

#### Authentication (`client/auth.ts`)

- Login/logout functionality
- Token refresh
- 2FA verification
- Profile management

#### Profile Management (`client/profile.ts`)

- Update personal information
- Change password
- Avatar management
- Address management

#### Services (`client/services.ts`)

- View subscribed services
- Service usage tracking
- Service cancellation/reactivation
- Billing history

#### Support Tickets (`client/tickets.ts`)

- Create and manage tickets
- File attachments
- Ticket replies
- Rating system

#### Product Catalog (`client/catalog.ts`)

- Browse products
- Search and filtering
- Quote requests
- Product recommendations

#### Orders (`client/orders.ts`)

- Order management
- Tracking information
- Return requests
- Order history

#### Invoices (`client/invoices.ts`)

- Invoice viewing
- Payment processing
- Payment methods
- Billing history

#### Settings (`client/settings.ts`)

- Notification preferences
- Security settings
- Privacy controls
- Billing settings

### Corporate Dashboard APIs

#### Customer Management (`corporate/customers.ts`)

- Customer CRUD operations
- KYC document management
- Customer notes and history
- Customer statistics

#### Support Management (`corporate/tickets.ts`)

- Advanced ticket management
- Ticket assignment and transfer
- Response templates
- Ticket categories

#### Product Management (`corporate/products.ts`)

- Product catalog management
- Pricing and features
- Product categories
- Inventory tracking

#### Order Management (`corporate/orders.ts`)

- Order processing workflow
- Order approval system
- Delivery tracking
- Order analytics

#### Quote Management (`corporate/quotes.ts`)

- Quote creation and management
- Quote approval workflow
- Quote conversion to orders
- Quote analytics

#### Invoice Management (`corporate/invoices.ts`)

- Invoice generation
- Payment tracking
- Invoice automation
- Financial reporting

#### Business Reports (`corporate/reports.ts`)

- Customer analytics
- Sales reports
- Performance metrics
- Custom report generation

### Admin Dashboard APIs

#### User Management (`admin/users.ts`)

- User CRUD operations
- User session management
- User activity tracking
- Bulk user operations

#### Role Management (`admin/roles.ts`)

- Role and permission management
- Role assignment
- Permission matrix
- Role cloning

#### System Settings (`admin/settings.ts`)

- System configuration
- Email/SMS settings
- Security policies
- Backup configuration

#### Activity Logs (`admin/logs.ts`)

- Audit trail management
- Security logs
- System logs
- User activity logs

#### System Reports (`admin/reports.ts`)

- System performance metrics
- User analytics
- Security reports
- System health reports

#### Support Management (`admin/support.ts`)

- Support group management
- Ticket category management
- Response templates
- Automation rules

#### System Maintenance (`admin/maintenance.ts`)

- Backup management
- Cache management
- Data cleanup
- Database migrations

## Usage Examples

### Importing APIs

```typescript
// ✅ CORRECT - Import specific APIs
import { clientAuthApi } from "@/shared/api/dashboard/client";
import { corporateCustomersApi } from "@/shared/api/dashboard/corporate";
import { adminUsersApi } from "@/shared/api/dashboard/admin";

// ❌ WRONG - Don't import everything
import * from "@/shared/api";
```

### Using APIs in Components

```typescript
import { clientTicketsApi } from "@/shared/api/dashboard/client";
import { handleApiError } from "@/shared/api";

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await clientTicketsApi.getTickets();
      setTickets(response.tickets);
    } catch (error) {
      const message = handleApiError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ... component logic
};
```

### Error Handling

```typescript
import { handleApiError } from "@/shared/api";

try {
  const result = await clientAuthApi.login(credentials);
  return result;
} catch (error) {
  const message = handleApiError(error);
  throw new Error(message);
}
```

## Security Features

### Authentication

- JWT token management
- Automatic token refresh
- 2FA support
- Session management

### Authorization

- Role-based access control
- VPN validation for Corporate/Admin
- Permission-based feature access
- API endpoint protection

### Data Protection

- Request/response encryption
- Secure file uploads
- Input validation
- XSS protection

## Performance Considerations

### Caching

- API response caching
- Token caching
- Request deduplication

### Optimization

- Lazy loading of API modules
- Request batching
- Pagination support
- File upload optimization

## Development Guidelines

### Adding New APIs

1. Create new file in appropriate dashboard folder
2. Follow naming conventions
3. Define TypeScript interfaces
4. Implement standard CRUD operations
5. Add error handling
6. Update index.ts exports
7. Write tests

### Testing APIs

- Unit tests for each API function
- Integration tests for API workflows
- Mock API responses for development
- Error scenario testing

### Documentation

- JSDoc comments for all functions
- Interface documentation
- Usage examples
- Error code documentation

## Future Enhancements

### Planned Features

- API versioning support
- GraphQL integration
- Real-time API updates
- Advanced caching strategies
- API analytics and monitoring

### Scalability

- Microservice API support
- Load balancing
- API rate limiting
- Distributed caching
- API gateway integration
