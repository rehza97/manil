# RBAC Security Flow Diagram

**Visual representation of role-based access control implementation**

---

## User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Login                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Login Endpoint  │
                    │  /auth/login     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Verify Email    │
                    │  & Password      │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 FAIL ✗              SUCCESS ✓
                    │                   │
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────────┐
            │ Return Error │   │ Generate JWT     │
            └──────────────┘   │ Return User Info │
                               └──────────────────┘
                                        │
                                        ▼
                               ┌──────────────────┐
                               │  Store in        │
                               │  authStore       │
                               │  + localStorage  │
                               └──────────────────┘
                                        │
                                        ▼
                               ┌──────────────────┐
                               │ RoleBasedRedirect│
                               │ Component        │
                               └──────────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        │               │               │
                     ADMIN          CORPORATE        CLIENT
                        │               │               │
                        ▼               ▼               ▼
                  /admin/*        /corporate/*     /dashboard/*
```

---

## Route Protection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                User Attempts to Access Route                    │
│                    (e.g., /admin/users)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ProtectedRoute  │
                    │  Layer 1         │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         Is Authenticated?          NO ✗
                    │                   │
                 YES ✓                  ▼
                    │          ┌──────────────────┐
                    │          │ Redirect to      │
                    │          │ /login           │
                    │          └──────────────────┘
                    ▼
            ┌──────────────────┐
            │ Is Account Active?│
            └──────────────────┘
                    │
            ┌───────┴───────┐
            │               │
         YES ✓           NO ✗
            │               │
            │               ▼
            │      ┌──────────────────┐
            │      │ Redirect to      │
            │      │ /account-disabled│
            │      └──────────────────┘
            ▼
    ┌──────────────────┐
    │ Role Matches     │
    │ Required Role?   │
    └──────────────────┘
            │
    ┌───────┴───────┐
    │               │
 YES ✓           NO ✗
    │               │
    │               ▼
    │      ┌──────────────────┐
    │      │ Redirect to User │
    │      │ Dashboard        │
    │      │ (Based on Role)  │
    │      └──────────────────┘
    ▼
┌──────────────────┐
│   RoleGuard      │
│   Layer 2        │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Exact Role Match?│
└──────────────────┘
    │
┌───┴───┐
│       │
YES ✓  NO ✗
│       │
│       ▼
│  ┌──────────────────┐
│  │ Log Warning      │
│  │ Redirect to      │
│  │ User Dashboard   │
│  └──────────────────┘
▼
┌──────────────────┐
│  Render Layout   │
│  & Content       │
└──────────────────┘
```

---

## Role Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Auth Detection  │
                    │  (User Role)     │
                    └──────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ ADMIN PORTAL  │    │CORPORATE      │    │ CLIENT PORTAL │
│               │    │PORTAL         │    │               │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ /admin/*      │    │ /corporate/*  │    │ /dashboard/*  │
├───────────────┤    ├───────────────┤    ├───────────────┤
│               │    │               │    │               │
│ • Dashboard   │    │ • Dashboard   │    │ • Dashboard   │
│ • Users       │    │ • Customers   │    │ • Services    │
│ • Roles       │    │ • Tickets     │    │ • Tickets     │
│ • Settings    │    │ • Products    │    │ • Catalog     │
│ • Logs        │    │ • Orders      │    │ • Orders      │
│ • Reports     │    │ • Quotes      │    │ • Invoices    │
│ • Maintenance │    │ • Invoices    │    │ • Settings    │
│               │    │ • Reports     │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     │                     │
    ❌ BLOCKED           ❌ BLOCKED           ❌ BLOCKED
        │                     │                     │
        ▼                     ▼                     ▼
   Cannot Access        Cannot Access        Cannot Access
   /corporate/*         /dashboard/*         /corporate/*
   /dashboard/*         /admin/*             /admin/*
```

---

## Security Layers Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Layer 1: Route Protection (ProtectedRoute)            │   │
│  │ • Authentication Check                                  │   │
│  │ • Role Validation (Exact Match)                        │   │
│  │ • Active Account Check                                  │   │
│  │ • Automatic Redirect                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Layer 2: Layout Guards (RoleGuard)                     │   │
│  │ • Double-Check Role                                     │   │
│  │ • Log Security Events                                   │   │
│  │ • Prevent Rendering                                     │   │
│  │ • Defense-in-Depth                                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Layer 3: Permission System                             │   │
│  │ • Fine-Grained Permissions                             │   │
│  │ • Component-Level Checks                               │   │
│  │ • Action-Based Authorization                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Layer 4: Navigation Filtering                          │   │
│  │ • Role-Specific Menus                                  │   │
│  │ • Permission-Based UI                                   │   │
│  │ • Context-Aware Elements                               │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│                    AUTHORIZED CONTENT                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Access Attempt Scenarios

### Scenario 1: Client Tries to Access Admin Dashboard

```
Client User
    │
    ├─ Attempts: GET /admin/users
    │
    ▼
[ProtectedRoute]
    │
    ├─ Check: isAuthenticated? ✓ YES
    ├─ Check: is_active? ✓ YES
    ├─ Check: role === "admin"? ✗ NO (role is "client")
    │
    ▼
Redirect to /dashboard
    │
    ▼
[RoleGuard allowedRole="client"]
    │
    ├─ Check: user.role === "client"? ✓ YES
    │
    ▼
Render Client Dashboard ✓
```

### Scenario 2: Corporate Tries to Access Client Dashboard

```
Corporate User
    │
    ├─ Attempts: GET /dashboard/services
    │
    ▼
[ProtectedRoute]
    │
    ├─ Check: isAuthenticated? ✓ YES
    ├─ Check: is_active? ✓ YES
    ├─ Check: role === "client"? ✗ NO (role is "corporate")
    │
    ▼
Redirect to /corporate
    │
    ▼
[RoleGuard allowedRole="corporate"]
    │
    ├─ Check: user.role === "corporate"? ✓ YES
    │
    ▼
Render Corporate Dashboard ✓
```

### Scenario 3: Unauthenticated User Tries to Access Protected Route

```
Anonymous User
    │
    ├─ Attempts: GET /dashboard
    │
    ▼
[ProtectedRoute]
    │
    ├─ Check: isAuthenticated? ✗ NO
    │
    ▼
Redirect to /login
    │
    ▼
Login Page ✓
```

### Scenario 4: Admin Accesses Admin Dashboard (Success)

```
Admin User
    │
    ├─ Attempts: GET /admin/users
    │
    ▼
[ProtectedRoute]
    │
    ├─ Check: isAuthenticated? ✓ YES
    ├─ Check: is_active? ✓ YES
    ├─ Check: role === "admin"? ✓ YES
    │
    ▼
[RoleGuard allowedRole="admin"]
    │
    ├─ Check: user.role === "admin"? ✓ YES
    │
    ▼
Render Admin Dashboard ✓
```

---

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│                         RouterProvider                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   routes.tsx     │
                    │   Route Config   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ProtectedRoute  │
                    │  Wrapper         │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  authStore   │    │  Navigation  │
            │  (Zustand)   │    │  State       │
            └──────────────┘    └──────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │  Dashboard Layout│
            │  with RoleGuard  │
            └──────────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │  Page Components │
            │  with useAuth    │
            └──────────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │  UI Components   │
            │  (Conditional)   │
            └──────────────────┘
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      authStore (Zustand)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  State:                                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • user: User | null                                     │  │
│  │ • token: string | null                                  │  │
│  │ • isAuthenticated: boolean                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Actions:                                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ • setAuth(user, token)                                  │  │
│  │ • clearAuth()                                           │  │
│  │ • updateUser(partial)                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Persistence:                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ localStorage: "auth-storage"                            │  │
│  │ localStorage: "access_token"                            │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Used by
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ProtectedRoute│  │  RoleGuard   │  │   useAuth    │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Permission Check Flow

```
Component Needs Permission Check
            │
            ▼
    ┌──────────────────┐
    │  useAuth() hook  │
    └──────────────────┘
            │
            ▼
    ┌──────────────────┐
    │ hasPermission()  │
    │ function         │
    └──────────────────┘
            │
            ▼
    ┌──────────────────┐
    │ Get user.role    │
    │ from authStore   │
    └──────────────────┘
            │
            ▼
    ┌──────────────────┐
    │ Lookup role      │
    │ permissions      │
    └──────────────────┘
            │
    ┌───────┴───────┐
    │               │
 HAS PERM       NO PERM
    │               │
    ▼               ▼
  Render         Hide/Disable
  Element        Element
```

---

## Visual Summary

```
╔═══════════════════════════════════════════════════════════════════╗
║                   RBAC SECURITY GUARANTEE                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✅ Client users can ONLY access:                                ║
║     └─ /dashboard/* routes                                       ║
║     └─ Client Portal layout                                      ║
║     └─ Client-specific features                                  ║
║                                                                   ║
║  ✅ Corporate users can ONLY access:                             ║
║     └─ /corporate/* routes                                       ║
║     └─ Corporate Portal layout                                   ║
║     └─ Corporate-specific features                               ║
║                                                                   ║
║  ✅ Admin users can ONLY access:                                 ║
║     └─ /admin/* routes                                           ║
║     └─ Admin Portal layout                                       ║
║     └─ Admin-specific features                                   ║
║                                                                   ║
║  ❌ Cross-role access is BLOCKED by:                             ║
║     └─ ProtectedRoute (route-level)                             ║
║     └─ RoleGuard (layout-level)                                 ║
║     └─ Automatic redirection to correct dashboard               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

**Created by:** Claude Code
**Date:** December 3, 2024
**Purpose:** Visual documentation of RBAC implementation
