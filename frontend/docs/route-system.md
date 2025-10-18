# CloudManager Route System

## Overview

The CloudManager application implements a comprehensive route system based on role-based access control (RBAC) and module-based architecture. The system supports three distinct user roles with different access levels and features.

## Architecture

### Route Structure

```
/                           # Public landing page
/login                      # Authentication
/register
/forgot-password
/reset-password
/setup-2fa
/redirect                   # Role-based redirect after login

/dashboard/*                # Client dashboard routes
/corporate/*                # Corporate dashboard routes
/admin/*                    # Admin dashboard routes

/unauthorized               # Access denied page
/account-disabled           # Disabled account page
```

### Role-Based Access Control

#### Client Role (`client`)

- **Access Level**: Public with 2FA authentication
- **Dashboard**: `/dashboard`
- **Features**:
  - Profile and security management
  - Service subscription management
  - Support ticket creation and tracking
  - Product catalog consultation
  - Quote requests
  - Order management
  - Invoice viewing

#### Corporate Role (`corporate`)

- **Access Level**: VPN access required
- **Dashboard**: `/corporate`
- **Features**:
  - Customer management and KYC validation
  - Product/service catalog management
  - Ticket and commercial tracking
  - Order management and workflow
  - Quote and invoice management
  - Business operations management
  - Reporting and analytics

#### Admin Role (`admin`)

- **Access Level**: VPN access required
- **Dashboard**: `/admin`
- **Features**:
  - System overview and health monitoring
  - User management and role assignment
  - System settings and configuration
  - Activity and audit logging
  - System reports and analytics
  - Support group management
  - System maintenance

## Module-Based Routes

### Module 0: Infrastructure & Foundation

- **Auth Module**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/setup-2fa`

### Module 1: Customer Manager

- **Client Routes**: Profile management, security settings
- **Corporate Routes**: Customer management, KYC validation, customer documents

### Module 2: Ticket Manager

- **Client Routes**: Ticket creation, tracking, replies
- **Corporate Routes**: Ticket management, assignment, transfer, categories, templates
- **Admin Routes**: Support groups, categories, templates, automation

### Module 3: Product Catalogue

- **Client Routes**: Product catalog, quote requests
- **Corporate Routes**: Product management, categories

### Module 4: Order Manager

- **Client Routes**: Order viewing, tracking
- **Corporate Routes**: Order management, processing, approval, delivery

### Module 5: Reporting

- **Corporate Routes**: Business reports, customer reports, ticket reports, revenue reports
- **Admin Routes**: System reports, user reports, activity reports, security reports

### Module 6: Invoice Manager

- **Client Routes**: Invoice viewing
- **Corporate Routes**: Quote management, invoice creation, payment tracking

### Module 7: Settings & Configuration

- **Client Routes**: Account settings, notifications
- **Corporate Routes**: Corporate settings, automation, templates
- **Admin Routes**: System settings, security, email, SMS, storage, backup

## Route Protection

### ProtectedRoute Component

- Checks authentication status
- Validates user role against required role
- Handles inactive accounts
- Provides loading states

### RouteGuard Component

- Additional permission checking
- Module-specific access control
- Custom permission validation
- Graceful error handling

### Permission System

- **Route Permissions**: Role-based route access
- **Module Permissions**: Module-level access control
- **Feature Permissions**: Granular feature access

## Navigation Structure

### Client Dashboard Navigation

```
/dashboard
├── / (Dashboard Overview)
├── /profile
├── /services
├── /tickets
├── /catalog
├── /orders
├── /invoices
└── /settings
```

### Corporate Dashboard Navigation

```
/corporate
├── / (Dashboard Overview)
├── /customers
├── /tickets
├── /products
├── /orders
├── /quotes
├── /invoices
├── /reports
└── /settings
```

### Admin Dashboard Navigation

```
/admin
├── / (Dashboard Overview)
├── /overview
├── /users
├── /roles
├── /settings
├── /logs
├── /reports
├── /support
└── /maintenance
```

## Implementation Details

### Route Configuration

- **File**: `frontend/src/app/routes.ts`
- **Type**: React Router v6 RouteObject[]
- **Features**: Nested routes, route guards, error boundaries

### Permission Hooks

- **useRoutePermissions**: Route access checking
- **useAuth**: Authentication and role checking
- **hasPermission**: Granular permission validation

### Route Guards

- **ProtectedRoute**: Basic authentication and role checking
- **RouteGuard**: Advanced permission and module checking
- **withRouteGuard**: HOC for component protection

## Security Features

### Authentication

- Email/password login
- Two-factor authentication (2FA)
- Password reset flow
- Account activation

### Authorization

- Role-based access control
- Module-level permissions
- Route-level protection
- Feature-level restrictions

### Session Management

- JWT token handling
- Refresh token rotation
- Session timeout
- Concurrent session limits

## Error Handling

### Route Errors

- **404**: Page not found
- **401**: Unauthorized access
- **403**: Forbidden access
- **500**: Server errors

### Access Denied

- **Unauthorized**: Insufficient permissions
- **Account Disabled**: Inactive accounts
- **Module Access**: Module-specific restrictions

## Development Guidelines

### Adding New Routes

1. Define route in `routes.ts`
2. Add permission mapping
3. Update navigation components
4. Add route guards if needed
5. Test with different user roles

### Route Testing

- Test with different user roles
- Verify permission restrictions
- Check error handling
- Validate navigation flow

### Performance Considerations

- Lazy load route components
- Optimize bundle splitting
- Cache route permissions
- Minimize re-renders

## Future Enhancements

### Planned Features

- Dynamic route generation
- Feature flags integration
- Advanced permission matrix
- Route analytics
- A/B testing support

### Scalability

- Micro-frontend support
- Route-based code splitting
- Dynamic module loading
- Distributed routing
