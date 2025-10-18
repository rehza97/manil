# CloudManager Dashboard System

## Overview

The CloudManager dashboard system provides role-based access to different user interfaces based on user roles: **Client**, **Corporate**, and **Admin**. Each role has its own dedicated dashboard with appropriate features and permissions.

## Architecture

### Role-Based Access Control (RBAC)

The system uses a three-tier role structure:

1. **Client** (`"client"`) - End users with basic access
2. **Corporate** (`"corporate"`) - Business users with management capabilities
3. **Admin** (`"admin"`) - System administrators with full access

### Dashboard Structure

```
/dashboard     → Client Dashboard (UserDashboardLayout)
/corporate     → Corporate Dashboard (CorporateDashboardLayout)
/admin         → Admin Dashboard (AdminDashboardLayout)
```

## Dashboard Features

### 1. Client Dashboard (`/dashboard`)

**Access**: Public with 2FA authentication  
**Features**:

- ✅ Email/password login with 2FA support
- ✅ Basic profile and security management
- ✅ List of subscribed services
- ✅ Ticketing: create, track, file attachments
- ✅ Product catalog consultation and quote requests
- ✅ Order management and history

**Navigation**:

- Dashboard (overview)
- My Services
- Support Tickets
- Product Catalog
- My Orders
- Profile & Settings

### 2. Corporate Dashboard (`/corporate`)

**Access**: VPN access required  
**Features**:

- ✅ Client management and account validation (KYC)
- ✅ Product/service catalog and quotes
- ✅ Ticket/commercial tracking and follow-ups
- ✅ Order management and workflow
- ✅ Business operations management
- ✅ Revenue and customer analytics

**Navigation**:

- Dashboard (overview)
- Customers (with KYC validation)
- Support Tickets (assign and manage)
- Products (catalog management)
- Orders (workflow management)
- Invoices (quote generation)
- Reports (business analytics)

### 3. Admin Dashboard (`/admin`)

**Access**: VPN access required  
**Features**:

- ✅ Basic settings and simple role management
- ✅ Minimal activity tracking (connection logs)
- ✅ System administration
- ✅ User management and permissions
- ✅ System health monitoring
- ✅ No technical inventory or integrations

**Navigation**:

- Dashboard (system overview)
- System Overview (health monitoring)
- User Management
- Role & Permissions
- System Settings
- Activity Logs
- System Reports

## Technical Implementation

### Layouts

Each dashboard has its own dedicated layout component:

- `UserDashboardLayout.tsx` - Client interface with blue theme
- `CorporateDashboardLayout.tsx` - Business interface with green theme
- `AdminDashboardLayout.tsx` - Admin interface with red theme

### Pages

Dashboard pages aggregate appropriate modules:

- `UserDashboardPage.tsx` - Client overview with services, tickets, orders
- `CorporateDashboardPage.tsx` - Business overview with customers, revenue, KYC
- `AdminDashboardPage.tsx` - System overview with health, users, activity

### Routing

Role-based routing with protected routes:

```typescript
// Client routes
{
  path: "/dashboard",
  element: <ProtectedRoute requiredRole="client"><UserDashboardLayout /></ProtectedRoute>
}

// Corporate routes
{
  path: "/corporate",
  element: <ProtectedRoute requiredRole="corporate"><CorporateDashboardLayout /></ProtectedRoute>
}

// Admin routes
{
  path: "/admin",
  element: <ProtectedRoute requiredRole="admin"><AdminDashboardLayout /></ProtectedRoute>
}
```

### Authentication Flow

1. **Login** → Single login form for all roles
2. **Role Detection** → System determines user role
3. **Redirect** → `RoleBasedRedirect` component routes to appropriate dashboard
4. **Access Control** → `ProtectedRoute` validates role permissions

## Module Integration

The dashboard system leverages existing modules:

### Available Modules

- ✅ `auth/` - Authentication and user management
- ✅ `customers/` - Customer management with KYC
- ✅ `tickets/` - Support ticket system
- ✅ `products/` - Product catalog
- ✅ `orders/` - Order management
- ✅ `invoices/` - Invoice and quote system
- ✅ `reporting/` - Analytics and reports
- ✅ `settings/` - System configuration

### Permission System

Each module respects role-based permissions:

```typescript
// Example permission checks
hasPermission("customer:read"); // Can view customers
hasPermission("customer:write"); // Can manage customers
hasPermission("ticket:assign"); // Can assign tickets
hasPermission("system:admin"); // Can access admin features
```

## Security Features

### Authentication

- ✅ Email/password authentication
- ✅ Two-factor authentication (2FA/TOTP)
- ✅ Password strength validation
- ✅ Account lockout protection
- ✅ Session management

### Authorization

- ✅ Role-based access control (RBAC)
- ✅ Permission-based feature access
- ✅ Route protection
- ✅ Component-level access control

### Data Protection

- ✅ Secure API communication
- ✅ Input validation and sanitization
- ✅ XSS and CSRF protection
- ✅ Audit logging

## User Experience

### Design System

- ✅ Consistent shadcn/ui components
- ✅ Role-specific color themes
- ✅ Responsive design
- ✅ Accessibility compliance

### Navigation

- ✅ Intuitive sidebar navigation
- ✅ Breadcrumb navigation
- ✅ Quick action buttons
- ✅ Search functionality

### Performance

- ✅ Lazy loading for routes
- ✅ Optimized bundle splitting
- ✅ Efficient state management
- ✅ Caching strategies

## Development Guidelines

### File Structure

```
frontend/src/
├── layouts/
│   ├── UserDashboardLayout.tsx
│   ├── CorporateDashboardLayout.tsx
│   └── AdminDashboardLayout.tsx
├── modules/
│   ├── dashboard/
│   │   └── pages/
│   │       ├── UserDashboardPage.tsx
│   │       ├── CorporateDashboardPage.tsx
│   │       └── AdminDashboardPage.tsx
│   └── auth/
│       └── components/
│           ├── ProtectedRoute.tsx
│           └── RoleBasedRedirect.tsx
└── app/
    └── router.tsx
```

### Best Practices

- ✅ Modular architecture with single responsibility
- ✅ TypeScript for type safety
- ✅ Component composition over inheritance
- ✅ Consistent error handling
- ✅ Comprehensive testing coverage

## Future Enhancements

### Planned Features

- 🔄 Real-time notifications
- 🔄 Advanced analytics dashboard
- 🔄 Customizable dashboard widgets
- 🔄 Multi-language support
- 🔄 Dark mode theme
- 🔄 Mobile app integration

### Scalability

- 🔄 Micro-frontend architecture
- 🔄 API versioning
- 🔄 Database sharding
- 🔄 CDN integration
- 🔄 Performance monitoring

## Conclusion

The CloudManager dashboard system provides a comprehensive, secure, and scalable solution for role-based access control. Each user type gets a tailored experience with appropriate features and permissions, while maintaining consistency across the platform.

The modular architecture ensures maintainability and extensibility, while the security-first approach protects sensitive business data and operations.
