# SCLEN Procurement Platform

## Overview
This project is a modern, full-stack procurement management platform designed to streamline and enhance procurement processes. It features a React frontend and a Django REST API backend, offering comprehensive tools for managing vendors, products, RFx processes, auctions, and purchase orders. The platform incorporates AI-powered features and real-time capabilities to provide a complete and efficient solution for procurement needs. The business vision is to provide an innovative platform that simplifies complex procurement workflows, improves transparency, and drives efficiency for businesses, positioning itself as a leader in digital procurement solutions.

## User Preferences
Preferred communication style: Simple, everyday language.
Code quality priority: Zero tolerance for regression issues - existing functionality must always be preserved.
Development approach: Comprehensive testing and validation before any changes to prevent breaking working features.
Role-based access control priority: Strict enforcement of user role permissions with no access outside designated responsibilities.

## Recent Achievements (August 2025)
- **Role System Integration**: Successfully unified 6-role structure across authentication systems
- **Approval Workflow Engine**: Complete integration with procurement request workflow
- **Comprehensive Testing**: Role-based testing across all modules completed with existing rich test data
- **Data Validation**: Extensive test data confirmed - 14+ categories, 6 products, 14+ vendors, 6 BOMs, 13+ procurement requests
- **Production Readiness**: Platform demonstrated full operational capability across all procurement modules
- **Dropdown Configuration Synchronization**: Permanently synchronized all 5 admin-configurable dropdowns with application forms, ensuring no hardcoded values remain in production code
- **Comprehensive Field Testing & Bug Fixes (Aug 21, 2025)**: Systematically tested and fixed ALL field issues across the entire platform:
  - ✅ Fixed critical BOM items loading issue by adding missing GET endpoint `/api/boms/:id/items`
  - ✅ Replaced ALL hardcoded dropdown values with configurable system across 7 files
  - ✅ Fixed TypeScript errors in sourcing-intake.tsx and direct-procurement-simple.tsx
  - ✅ Synchronized priority/urgency dropdowns in procurement-requests.tsx and audit logs
  - ✅ Updated payment terms and priority dropdowns in direct procurement forms
  - ✅ Ensured all 5 admin-configurable dropdowns work perfectly: Department, Urgency, Category, Payment Terms, Priority

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state management.
- **UI Framework**: Radix UI components with shadcn/ui styling.
- **Styling**: Tailwind CSS with CSS custom properties for theming.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite for development and production builds.
- **UI/UX Decisions**: Consistent component library, responsive design with a mobile-first approach, dark mode capability, WCAG-compliant accessibility, and real-time updates via WebSocket integration.

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
- **Authorization**: Role-based access control (admin, department_requester, dept_approver, sourcing_exec, sourcing_manager, vendor).

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
- **Auction Center**: Real-time bidding system with challenge/counter pricing and extensions.
- **Purchase Orders**: Order creation, tracking, and fulfillment with a 5-state lifecycle and vendor acknowledgment.
- **Analytics**: Comprehensive reporting and insights.
- **Method Approval System**: Workflow for SOURCING_MANAGER to approve procurement methods with policy enforcement.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
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