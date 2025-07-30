# SCLEN Procurement Platform

## Overview

This is a modern, full-stack procurement management platform with a React frontend and Django REST API backend. The application provides comprehensive tools for managing vendors, products, RFx processes, auctions, and purchase orders with AI-powered features and real-time capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Backend Migration to Django (July 2025)
- **Complete Backend Migration**: Successfully migrated from Node.js/Express to Python 3.12 with Django REST Framework
- **Django Project Structure**: Created modular Django apps for users, vendors, products, boms, rfx, auctions, purchase_orders, approvals, and notifications
- **Database Migration**: Seamlessly migrated existing PostgreSQL schema using Django's fake migration system
- **API Endpoints**: All procurement API endpoints converted to Django REST Framework with proper authentication
- **Maintained Functionality**: All existing features preserved during migration including role-based access and business logic
- **Authentication Integration**: Django REST Framework JWT authentication ready for frontend integration

### Comprehensive Vendor Management System (July 2025)
- **Unified Vendor Interface**: Consolidated vendor discovery and management into single page for streamlined workflow
- **Dual Vendor Addition Methods**: Implemented both manual GUI entry and AI vendor discovery within vendor management dialog
- **Manual Vendor Entry**: Complete form with company name, contact person, email, phone, address, website, description, and categories
- **Enhanced AI Vendor Discovery**: Advanced search with comprehensive test database covering Electronics, Manufacturing, Services, Energy, and Logistics sectors
- **Vendor Management Page**: Complete vendor listing with search, filtering, and detailed vendor cards showing proper company names
- **AI Logo Integration**: Company logos displayed only from AI discovery when available from web sources
- **Phone Number Validation**: Enforced exactly 10-digit phone number format (no country codes)
- **Streamlined Manual Entry**: Simplified vendor registration form without logo upload to prevent data issues
- **Consistent UI Styling**: Applied 2px borders across all form elements for visual consistency
- **API Endpoints**: Added POST /api/vendors and POST /api/vendors/discover endpoints for vendor operations
- **Removed Duplication**: Eliminated standalone vendor discovery page to avoid confusion and streamline user experience
- **Real AI Integration**: Fully integrated Perplexity API for live vendor discovery with fallback to test data for reliability

### RFx-BOM Integration & Complete Workflow (July 2025)
- **BOM-RFx Integration**: Added complete Bill of Materials integration to RFx creation workflow
- **Optional BOM Linking**: Users can create RFI/RFP/RFQ with or without linking to specific BOMs
- **BOM Selection UI**: Intuitive BOM selection dropdown in RFx form with BOM details (name, version, category)
- **Status Workflow Implementation**: Complete draft → active → closed status workflow with action buttons
- **View/Edit/Publish Actions**: Implemented view, edit (draft only), publish (draft to active), and close (active) functionality
- **BOM Visual Indicators**: RFx list shows "BOM Linked" badges for requests connected to specific BOMs
- **Structured Procurement**: BOM connection enables structured procurement workflows tied to specific material requirements
- **API Endpoints**: Added PATCH /api/rfx/:id/status endpoint for status management with proper authorization
- **Role-Based Actions**: Different action buttons shown based on RFx status and user permissions

### Major Session & RFx Fixes (January 2025)
- **Session Persistence Completely Fixed**: Implemented PostgreSQL-backed session management for persistent login across server restarts
- **Refresh Issue Resolved**: Page refreshes now maintain login state without redirecting to sign-in using database sessions
- **Database Crash Prevention**: Enhanced connection stability with proper error handling
- **RFx TypeScript Errors Fixed**: Resolved all array typing issues preventing form rendering
- **Create RFx Functionality Working**: Form dialog opens properly with all tabs functional
- **RFx UI Consistency Fixed**: Implemented uniform 2px borders across all form elements (cards, inputs, textareas, checkboxes)
- **PostgreSQL Session Store**: Using database-backed sessions for development stability and production readiness
- **Authentication Stability**: Rolling sessions with proper cookie configuration
- **Form Validation Ready**: Complete RFx creation workflow with vendor selection and BOM integration

### Product Catalogue Access Restriction (January 2025)
- **Major Architecture Change**: Product Catalogue is now vendor-only access
- **Buyers cannot access Product Catalogue directly** - they interact with vendor products only through BOM creation
- **Workflow**: Buyers find vendors → Browse vendor's product catalogue → Add to BOM
- **Enhanced role-based restrictions**: Clear access control with informative redirect messages
- **Improved user experience**: Buyers guided to appropriate sections (BOM Management, Vendor Discovery)

### Dynamic RFx Form Interface (January 2025)
- **Updated RFx Creation Workflow**: Form now dynamically updates based on selected type
- **Type-Specific Labels**: Header and buttons change to "Create RFI", "Create RFP", or "Create RFQ"
- **Improved User Experience**: Clear indication of what type of request is being created
- **Logical Type Ordering**: Reordered to RFI → RFP → RFQ following procurement progression
- **Adaptive Form Content**: Fields, placeholders, and help text adapt to the selected request type

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
- **Runtime**: Python 3.12 with Django framework
- **API Framework**: Django REST Framework for comprehensive API development
- **Language**: Python with object-oriented design patterns
- **API Design**: RESTful API with token-based authentication (JWT)
- **Database ORM**: Django ORM for robust data modeling and migrations
- **Apps Structure**: Modular Django apps (users, vendors, products, boms, rfx, auctions, purchase_orders, approvals, notifications)
- **Middleware**: Django middleware for CORS, authentication, and error handling

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