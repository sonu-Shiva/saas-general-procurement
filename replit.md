# SCLEN Procurement Platform

## Overview
This project is a modern, full-stack procurement management platform designed to streamline and enhance procurement processes. It features a React frontend and a Django REST API backend, offering comprehensive tools for managing vendors, products, RFx processes, auctions, and purchase orders. The platform incorporates AI-powered features and real-time capabilities to provide a complete and efficient solution for procurement needs. The business vision is to provide an innovative platform that simplifies complex procurement workflows, improves transparency, and drives efficiency for businesses, positioning itself as a leader in digital procurement solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### AI Discovery Integration (January 2025)
- **FULLY RESOLVED**: Complete AI vendor discovery with real contact information (January 5, 2025)
- **COMPLETED**: Fixed Perplexity API integration with correct "sonar-pro" model
- **WORKING**: Real phone numbers (e.g., +91-80-2674 2322) and email addresses (e.g., info@srindus.com) fully functional
- **CONFIRMED**: AI search matches Google search quality with complete vendor contact details including phone and email
- **TESTED**: Contact parsing logic fixed - both email and phone number extraction working correctly
- Implemented development authentication bypass for testing core functionality

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state management.
- **UI Framework**: Radix UI components with shadcn/ui styling.
- **Styling**: Tailwind CSS with CSS custom properties for theming.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite for development and production builds.
- **UI/UX Decisions**: Consistent component library, responsive design with a mobile-first approach, dark mode capability, and WCAG-compliant accessibility. Real-time updates are facilitated via WebSocket integration.

### Backend Architecture
- **Runtime**: Python 3.12 with Django framework.
- **API Framework**: Django REST Framework for API development.
- **Language**: Python with object-oriented design patterns.
- **API Design**: RESTful API with token-based authentication (JWT).
- **Database ORM**: Django ORM for data modeling and migrations.
- **Apps Structure**: Modular Django apps for distinct functionalities (users, vendors, products, boms, rfx, auctions, purchase_orders, approvals, notifications).
- **Middleware**: Django middleware for CORS, authentication, and error handling.

### Authentication System
- **Provider**: Replit OpenID Connect (OIDC) authentication.
- **Session Management**: PostgreSQL-backed session management for persistent login.
- **Strategy**: Passport.js with OpenID Connect strategy.
- **Authorization**: Role-based access control (buyer_admin, buyer_user, sourcing_manager, vendor).

### Database Layer
- **Database**: PostgreSQL (configured for Neon serverless).
- **Schema**: Comprehensive procurement domain model including user management, vendor lifecycle, product catalog, BOM, RFx processes, auction system, purchase order management, and approval workflows.

### Core Modules
- **Dashboard**: Executive overview and AI chat.
- **Vendor Management**: Complete vendor lifecycle.
- **Vendor Portal**: Complete seller interface for RFx responses and workflow management.
- **Product Catalog**: Centralized product information.
- **BOM Management**: Bill of Materials creation and management.
- **RFx Management**: Request for Quote/Proposal/Information workflows.
- **Auction Center**: Real-time bidding system with WebSocket integration.
- **Purchase Orders**: Order creation, tracking, and fulfillment.
- **Analytics**: Comprehensive reporting and insights.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM (used during migration, now primarily Django ORM).
- **@tanstack/react-query**: Server state management.
- **@radix-ui/**: Accessible UI components.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **passport**: Authentication middleware.
- **openid-client**: OIDC authentication.
- **Perplexity API**: Integrated for AI vendor discovery.

### Replit Integration
- **@replit/vite-plugin-cartographer**: Development environment integration.
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error reporting.