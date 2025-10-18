# CloudManager Frontend

Enterprise Cloud & Hosting Management Platform - Frontend Application

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS
- **shadcn/ui** - UI component library
- **React Router** - Routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # App configuration
│   │   ├── router.tsx       # Route definitions
│   │   └── providers.tsx    # Global providers
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication module
│   │   ├── customers/       # Customer management
│   │   ├── tickets/         # Ticket system
│   │   ├── products/        # Product catalog
│   │   ├── orders/          # Order management
│   │   ├── invoices/        # Invoice management
│   │   ├── reporting/       # Reports and analytics
│   │   └── settings/        # Application settings
│   ├── shared/              # Shared resources
│   │   ├── api/             # API client
│   │   ├── components/      # Shared components
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript types
│   │   ├── constants/       # Constants
│   │   └── store/           # Global state
│   ├── layouts/             # Page layouts
│   └── pages/               # Route pages
├── public/                  # Static assets
└── .env.example            # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your API URL
```

### Development

```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

## Module Structure

Each module follows this structure:

```
module/
├── components/      # UI components
├── hooks/          # React Query hooks
├── services/       # API service layer
├── types/          # TypeScript types
├── utils/          # Module utilities
└── index.ts        # Module exports
```

## Coding Standards

### TypeScript

- **NO `any` types** - Use proper typing
- Use `interface` for objects, `type` for unions
- Export all types from module `index.ts`

### Components

- Use functional components with hooks
- One component per file (max 150 lines)
- Use React.memo for expensive components
- Proper TypeScript types for all props

### State Management

- **React Query** for server state
- **Zustand** for client state
- Store auth state in Zustand with persistence

### Styling

- Use TailwindCSS for styling
- Use shadcn/ui components
- Primary color: `#38ada9`
- Secondary color: `#3c6382`

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=CloudManager
VITE_APP_VERSION=1.0.0
```

## Available Routes

### Public Routes

- `/` - Home page
- `/login` - Login
- `/register` - Register
- `/forgot-password` - Password reset request

### Protected Routes (Dashboard)

- `/dashboard` - Dashboard overview
- `/dashboard/customers` - Customer management
- `/dashboard/tickets` - Ticket management
- `/dashboard/products` - Product catalog
- `/dashboard/orders` - Order management
- `/dashboard/invoices` - Invoice management
- `/dashboard/reports` - Reports and analytics
- `/dashboard/settings` - Settings

## API Integration

API client is configured in `src/shared/api/client.ts` with:

- Automatic token injection
- Request/response interceptors
- Error handling
- Token refresh logic

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Building for Production

```bash
# Build production bundle
npm run build

# Output will be in dist/ directory
```

## Deployment

The application can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps

## Documentation

- [Architecture Rules](.cursor/rules/01-frontend-architecture.mdc)
- [Testing Standards](.cursor/rules/03-testing-standards.mdc)
- [Documentation Standards](.cursor/rules/04-documentation-standards.mdc)
- [UI/UX Design System](docs/ui-ux-design-system.md)

## License

Proprietary - CloudManager v1.0

## Team

- **Wassim** - Frontend Lead
- **Manil** - Backend Lead
