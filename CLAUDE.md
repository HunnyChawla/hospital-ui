# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based Hospital Management System UI that manages patients, appointments, OPD/IPD operations, billing, lab tests, and more. The application is a multi-tenant system that supports subdomain-based hospital identification and role-based access control.

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production (static export)
npm start            # Start production server (after build)
npm run lint         # Run ESLint
```

### Environment Setup
Copy `.env.local.example` to `.env.local` for local development:
```bash
cp .env.local.example .env.local
```

Key environment variables:
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: http://127.0.0.1:8000)
- `NEXT_PUBLIC_DOMAIN_URL`: Base domain for subdomain detection (optional)
- `NEXT_PUBLIC_BASE_PATH`: Base path for GitHub Pages deployment (production only)

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **State Management**: Redux Toolkit + React Query (TanStack Query)
- **UI**: Tailwind CSS 4, Lucide React icons
- **Forms**: React Hook Form
- **Notifications**: Sonner
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **HTTP Client**: Axios
- **TypeScript**: Strict mode enabled

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main dashboard (all sections in one SPA)
│   ├── login/page.tsx     # Login page
│   └── providers.tsx      # Redux + React Query providers
├── components/            # React components organized by domain
│   ├── patients/         # Patient management
│   ├── doctors/          # Doctor management + doctor panel
│   ├── opd/              # OPD visits and appointments
│   ├── ipd/              # IPD/admissions, wards, beds, discharge
│   ├── lab-tests/        # Lab test catalog management
│   ├── lab-bookings/     # Lab test bookings
│   ├── lab-technician/   # Test results entry
│   ├── billing/          # Invoices and payments
│   ├── payments/         # Payment collection modals
│   ├── analytics/        # Analytics dashboard
│   ├── queue/            # Patient queue board
│   ├── mrd/              # Medical Records Department
│   ├── services/         # Service master
│   ├── users/            # Staff/user management
│   ├── layout/           # Sidebar, TopBar
│   ├── common/           # Shared UI components
│   └── shared/           # Generic reusable components
├── redux/                # Redux slices (state management)
│   ├── store.ts          # Redux store configuration
│   ├── authSlice.ts      # Authentication state
│   ├── tenantSlice.ts    # Multi-tenant state
│   ├── patientsSlice.ts  # Patient CRUD operations
│   ├── admissionsSlice.ts
│   ├── billingSlice.ts
│   ├── doctorsSlice.ts
│   ├── labTestsSlice.ts
│   ├── servicesSlice.ts
│   ├── queueSlice.ts
│   └── testsSlice.ts
├── services/             # API service layer (axios-based)
│   ├── api.ts            # Base axios client with auth interceptor
│   ├── patientsApi.ts
│   ├── doctorsApi.ts
│   ├── opdVisitsApi.ts
│   ├── appointmentsApi.ts
│   ├── admissionsApi.ts
│   ├── labTestsApi.ts
│   ├── labBookingsApi.ts
│   ├── invoicesApi.ts
│   ├── paymentsApi.ts
│   ├── prescriptionsApi.ts
│   ├── medicinesApi.ts
│   ├── analyticsApi.ts
│   ├── authApi.ts
│   ├── usersApi.ts
│   ├── wardsApi.ts
│   ├── bedsApi.ts
│   ├── mrdApi.ts
│   ├── queueApi.ts
│   └── serviceChargesApi.ts
├── types/                # TypeScript type definitions
│   └── index.ts          # Central type definitions
├── utils/                # Utility functions
│   ├── auth.ts           # Platform owner checks, tenant ID helpers
│   ├── subdomain.ts      # Subdomain extraction logic
│   ├── format.ts         # Date, currency formatting
│   └── errorHandler.ts   # Error handling utilities
├── hooks/                # Custom React hooks
│   └── useTenant.ts      # Tenant context hook
└── contexts/             # React contexts (if needed)
```

### Key Architectural Patterns

#### 1. Multi-Tenancy
- The app supports multi-tenant architecture via subdomain detection
- `extractSubdomain()` in `utils/subdomain.ts` extracts hospital ID from subdomain
- `isPlatformOwner()` in `utils/auth.ts` checks if user is platform owner
- Platform owners can specify `tenant_id` param; regular users cannot
- `getTenantIdForApi()` ensures tenant_id is only sent for platform owners

#### 2. State Management Strategy
- **Redux Toolkit**: Global state for auth, patients, admissions, billing, doctors, labs, services, queue, tenant
- **React Query**: Server state caching, mutations, and optimistic updates (used alongside Redux)
- **Local State**: Component-level UI state (modals, tabs, filters)

#### 3. API Layer Pattern
Each API service file (`*Api.ts`) follows this structure:
```typescript
// 1. Define TypeScript interfaces for requests/responses
// 2. Map API responses to internal types (if needed)
// 3. Export an object with async methods using apiClient from services/api.ts
// 4. Use getTenantIdForApi() for multi-tenant support
```

Example pattern from `patientsApi.ts`:
- Define request/response interfaces
- Use `apiClient` (axios instance with auth interceptor)
- Map backend responses to frontend types via helper functions
- Support optional `tenantId` parameter for platform owners

#### 4. Authentication Flow
- Token stored in `localStorage` as `auth_token`
- `apiClient` in `services/api.ts` has request interceptor to add `Authorization: Bearer <token>`
- Response interceptor catches 401 errors and redirects to `/login`
- Session restored on app mount via `restoreSession()` in `authSlice.ts`

#### 5. Single-Page Application Structure
- Main app (`src/app/page.tsx`) is a **single-page app** with hash-based routing
- All sections (dashboard, patients, doctors, opd, billing, etc.) are rendered in one component
- Active section determined by `window.location.hash` (e.g., `#patients`, `#billing`)
- Navigation via Sidebar sets hash, which triggers section visibility

#### 6. Print/PDF Generation
- Components with "Print" suffix (e.g., `OpdSlipPrint.tsx`, `DischargeSummaryPrint.tsx`) use `react-to-print`
- PDF exports use `jsPDF` and `jsPDF-AutoTable`
- Print components hidden from main UI, mounted only when printing
- Hospital logo and tenant details fetched from `tenantSlice` via `useTenant()` hook

#### 7. Form Handling
- Uses `react-hook-form` for all forms
- Modal components typically receive `isOpen`, `onClose`, and optional `defaultValues` props
- Forms submit via Redux async thunks or React Query mutations
- Success notifications via `toast()` from Sonner

#### 8. Role-Based Access Control
- User role stored in `localStorage` as `role`
- Roles: `admin`, `doctor`, `nurse`, `receptionist`, `lab_technician`, `platform_owner`
- Some sections (e.g., lab-technician panel) check role before rendering
- Doctor Panel (`#doctor-panel`) is role-specific for doctors

## Important Implementation Details

### Subdomain Detection
The app can run in multiple modes:
- **Local development**: No subdomain (localhost:3000)
- **Local with subdomain**: `demo-hospital.localhost`
- **Production**: `demo-hospital.cura.com` (requires NEXT_PUBLIC_DOMAIN_URL=cura.com)

Subdomain extraction logic (`utils/subdomain.ts`):
- Handles IP addresses (no subdomain)
- Handles localhost and localhost subdomains
- Handles configured domain with NEXT_PUBLIC_DOMAIN_URL
- Handles auto-detection for 3+ part hostnames

### GitHub Pages Deployment
- `output: "export"` in `next.config.ts` for static export
- `basePath` set via `NEXT_PUBLIC_BASE_PATH` for GitHub Pages
- Images unoptimized for static export
- Trailing slash enabled

### Service Worker (PWA)
- Service worker defined in `public/sw.js`
- Manifest at `public/manifest.json`
- Registration handled in `ServiceWorkerRegistration.tsx`

### Path Aliases
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Always use `@/` imports instead of relative paths

### Styling Conventions
- Tailwind CSS utility classes
- Cards use `.card` class (defined in globals.css)
- Color scheme: Sky blue primary, Emerald/Teal accents
- Icons from `lucide-react`

### Error Handling
- Backend errors typically return `{ detail: string }` or `{ message: string }`
- API errors handled via Redux `rejectWithValue` or React Query error callbacks
- User-facing errors displayed via Sonner toast notifications

### Data Flow Example: Creating a Patient
1. User opens "Add Patient" modal → `PatientFormModal` component
2. Form submit triggers Redux thunk `addPatient()` from `patientsSlice.ts`
3. Thunk calls `patientsApi.create()` which uses `apiClient.post()`
4. Success: Patient added to Redux store, modal closes, toast shown
5. Failure: Error message shown via toast

## Common Development Patterns

### Adding a New Feature
1. Define TypeScript types in `src/types/index.ts`
2. Create API service in `src/services/` (e.g., `newFeatureApi.ts`)
3. Create Redux slice if needed in `src/redux/`
4. Add slice to `store.ts` reducer
5. Create components in `src/components/new-feature/`
6. Add section to main `page.tsx` with hash routing
7. Add sidebar menu item in `Sidebar.tsx`

### Working with Forms
```typescript
import { useForm } from "react-hook-form";

const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

const onSubmit = async (data: FormData) => {
  // Dispatch Redux thunk or use React Query mutation
  await dispatch(addSomething(data)).unwrap();
  toast.success("Success!");
};
```

### Adding API Endpoints
```typescript
// In services/exampleApi.ts
import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export const exampleApi = {
  async getItems(tenantId?: string) {
    const params = getTenantIdForApi(tenantId) ? { tenant_id: getTenantIdForApi(tenantId) } : {};
    const response = await apiClient.get("/items", { params });
    return response.data;
  },
};
```

### Using React Query with Redux
- Redux for global app state (patients list, auth, etc.)
- React Query for server caching and mutations (appointments, lab bookings, invoices)
- Both can coexist: use `useQuery` for fetching, dispatch Redux actions for state updates

## Testing & Quality

- ESLint configured via `eslint.config.mjs`
- TypeScript strict mode enabled
- No unit tests currently configured (can be added)

## Deployment Notes

- Production builds use static export (`next build` generates `out/` directory)
- GitHub Actions workflow can set environment variables via secrets
- For subdomain-based routing in production, ensure `NEXT_PUBLIC_DOMAIN_URL` is set
- Base path automatically set to `/hospital-ui` for GitHub Pages

## License Information

- License validity tracked via tenant's `license_valid_till` field
- License expiry alert shown on dashboard when expiring or expired
- Helper functions for license checks inlined in `page.tsx` to avoid HMR issues
