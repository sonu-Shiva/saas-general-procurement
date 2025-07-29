# SCLEN Procurement Platform

## Overview

This is a modern, full-stack procurement management platform built with React and Express.js. The application provides comprehensive tools for managing vendors, products, RFx processes, auctions, and purchase orders with AI-powered features and real-time capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### RFx Management TypeScript Fixes (January 2025)
- **Fixed Create RFx Functionality**: Resolved TypeScript errors that were preventing RFx creation
- **Type Safety Improvements**: Properly typed `rfxEvents` query as `RfxEvent[]` instead of `{}`
- **Array Method Support**: Fixed filter, length, and other array operations on RFx data
- **Form Validation Ready**: RFx form component properly structured with Zod schema validation
- **Backend Integration**: Confirmed RFx storage implementation and API routes are functional
- **Authentication Required**: RFx creation requires user authentication (working as designed)

### Product Catalogue Access Restriction (January 2025)
- **Major Architecture Change**: Product Catalogue is now vendor-only access
- **Buyers cannot access Product Catalogue directly** - they interact with vendor products only through BOM creation
- **Workflow**: Buyers find vendors → Browse vendor's product catalogue → Add to BOM
- **Enhanced role-based restrictions**: Clear access control with informative redirect messages
- **Improved user experience**: Buyers guided to appropriate sections (BOM Management, Vendor Discovery)

### Role-Based Access Control (December 2024)
- Implemented comprehensive role-based differentiation:
  - **Vendors/Sellers**: Full product catalogue access - create categories and products
  - **Buyers** (buyer_admin, buyer_user, sourcing_manager): Access vendor products only via BOMs
  - Added role selection interface with detailed role descriptions
  - Added role badges in header with ability to change roles
  - Fixed all DollarSign icons replaced with Indian Rupee (₹) symbols
  - Enhanced middleware with `isVendor` and `isBuyer` role validation

### Product CRUD System Completion (January 2025)
- **Complete Product Management**: Full CRUD operations (Create, Read, Update, Delete) for vendor products
- **Delete Product Functionality**: Vendors can remove products with confirmation dialog and role-based security
- **Authentication Issues Resolved**: Fixed session persistence and refresh authentication problems
- **Role-Based Access Control**: Proper vendor/buyer role validation and access restrictions
- **Form Validation**: Comprehensive client and server-side validation with error handling
- **Database Integration**: Full product operations with category assignment and automatic ID generation
- **UI Polish**: Removed debugging information and cleaned up user interface

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with session-based authentication
- **Real-time**: WebSocket support for live auction features
- **Middleware**: Express middleware for logging, error handling, and authentication

### Authentication System
- **Provider**: Replit OpenID Connect (OIDC) authentication
- **Session Management**: Express sessions with PostgreSQL store
- **Strategy**: Passport.js with OpenID Connect strategy
- **Authorization**: Role-based access control (buyer_admin, buyer_user, sourcing_manager, vendor)

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with TypeScript-first approach
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Comprehensive procurement domain model including:
  - User management and organizations
  - Vendor lifecycle management
  - Product catalog and BOM (Bill of Materials)
  - RFx (Request for Quote/Proposal/Information) processes
  - Auction system with bidding
  - Purchase order management
  - Approval workflows and notifications

### Core Modules
1. **Dashboard**: Executive overview with key metrics and AI chat
2. **Vendor Management**: Complete vendor lifecycle from discovery to management
3. **Product Catalog**: Centralized product information management
4. **BOM Management**: Bill of Materials creation and management
5. **RFx Management**: Request for Quote/Proposal/Information workflows
6. **Auction Center**: Real-time bidding system with WebSocket integration
7. **Purchase Orders**: Order creation, tracking, and fulfillment
8. **Analytics**: Comprehensive reporting and insights

### UI/UX Features
- **Design System**: Consistent component library based on Radix UI
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: System-wide theme switching capability
- **Accessibility**: WCAG-compliant components with proper ARIA attributes
- **Real-time Updates**: WebSocket integration for live auction bidding

## Data Flow

### Authentication Flow
1. User accesses protected route
2. Middleware checks session validity
3. If not authenticated, redirect to Replit OIDC login
4. Upon successful authentication, user data is stored in session
5. Subsequent requests use session-based authentication

### API Request Flow
1. Frontend makes API requests using TanStack React Query
2. Express middleware handles authentication and authorization
3. Business logic processes requests using Drizzle ORM
4. Responses are cached and managed by React Query
5. Real-time updates pushed via WebSocket for auction features

### Database Operations
1. Drizzle ORM provides type-safe database operations
2. Schema validation using Zod for all data inputs
3. Transactions used for complex operations (e.g., BOM creation)
4. Connection pooling via Neon serverless PostgreSQL

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **passport**: Authentication middleware
- **openid-client**: OIDC authentication

### Development Tools
- **TypeScript**: Static type checking
- **Vite**: Fast development and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint/Prettier**: Code formatting and linting

### Replit Integration
- **@replit/vite-plugin-cartographer**: Development environment integration
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error reporting

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon PostgreSQL with automatic provisioning
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPL_ID
- **Authentication**: Replit OIDC with development domains

### Production Build
- **Frontend**: Static assets built with Vite to `dist/public`
- **Backend**: Compiled TypeScript bundled with esbuild
- **Process Management**: Node.js process serving both static files and API
- **Session Storage**: PostgreSQL-backed session store for scalability

### Database Management
- **Migrations**: Drizzle Kit for schema migrations
- **Schema**: Shared TypeScript definitions between frontend and backend
- **Connection**: Serverless PostgreSQL with connection pooling
- **Backup**: Managed by Neon database service

The architecture emphasizes type safety, developer experience, and scalability while maintaining simplicity in deployment and maintenance. The modular design allows for easy extension of procurement workflows and integration with external systems.