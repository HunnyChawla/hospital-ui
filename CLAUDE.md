# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based Hospital Management System UI covering patients, appointments, OPD/IPD, billing, lab tests, optometry/ophthalmology, surgery & day-care, ABHA (Ayushman Bharat Health Account) integration, and platform/tenant administration. It is a multi-tenant system supporting subdomain-based hospital identification and permission-based access control.

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production (static export)
npm start            # Start production server (after build)
npm run lint         # Run ESLint
npm run export       # Alias for `next build` (static export to out/)
npm run serve        # Serve the built out/ directory locally (npx serve)
```

There is no test suite configured (no jest/vitest/playwright/cypress).

### Environment Setup
Copy `.env.local.example` to `.env.local` for local development:
```bash
cp .env.local.example .env.local
```

Key environment variables:
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: http://127.0.0.1:8000)
- `NEXT_PUBLIC_DOMAIN_URL`: Base domain for subdomain detection (optional)
- `NEXT_PUBLIC_BASE_PATH`: Base path for GitHub Pages deployment (production only)

Runtime env values are read through `src/utils/env.ts` (which also supports a `window.__ENV` override), not directly via `process.env`, in most service files — see `services/api.ts`.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **State Management**: Redux Toolkit (global state) + TanStack Query / React Query (server state), used side by side
- **UI**: Tailwind CSS 4, Lucide React icons, Headless UI, `clsx`
- **Drag & drop**: `@dnd-kit/core` + `@dnd-kit/sortable` (e.g. reorderable rows in `screens/`)
- **Charts**: Recharts (analytics, vitals charts)
- **Forms**: React Hook Form
- **Notifications**: Sonner
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **HTTP Client**: Axios
- **TypeScript**: Strict mode enabled

### Project Structure

The app has grown into many domains. Rather than an exhaustive tree, the important groupings under `src/` are:

- `app/` — Next.js App Router pages. `(dashboard)/` is a route group holding almost every authenticated screen (patients, doctors, opd, ipd, billing, lab-*, optometrist-panel, surgeries, day-care, platform-billing, tenants, permissions, feature-flags, master-data, etc.) behind a shared `(dashboard)/layout.tsx`. Standalone top-level routes also exist: `login/`, `tv-login/`, `tv-display/` (queue TV screens with their own auth).
- `components/` — organized by domain, one folder per feature area (patients, doctors, opd, ipd, lab-tests, lab-bookings, lab-technician, billing, payments, analytics, queue, mrd, services, users, optometrist, abha, permissions, feature-flags, platform-billing, tenants, surgeries, planned-surgeries, day-care, master-data, doctor-groups, screens, layout, common, shared, …).
- `redux/` — one slice per domain (auth, tenant, patients, admissions, billing, doctors, labTests, services, queue, permissions, optometristPanel, optometryData, seedData, vitalSigns, clinicalNotes, diagnoses, symptoms, advices, medicines, wards, beds, doctorPanel, …), wired up in `store.ts`. `redux/hooks.ts` exports the typed `useAppDispatch`/`useAppSelector` used everywhere.
- `services/` — axios-based API layer, one file per resource (`*Api.ts`); there are ~60+ of these across clinical, optometry, surgery, billing, and platform-admin domains.
- `hooks/` — general hooks (`useTenant`, `useFeatureFlags`, `usePermissions`, `useSSE`, `useVoiceRecording`, `useConfirm`, `useSidebar`, …) plus a `hooks/queries/` subfolder holding the React Query hooks (`usePatients`, `useAdmissions`, `useDoctors`, `useInvoices`, `useLabBookings`, `useOpdVisits`, `useQueue`, `useSurgeryBilling`, …) that wrap the `services/*Api.ts` calls.
- `types/` — `index.ts` plus domain-specific files (`dayCare.ts`, `platformBilling.ts`).
- `utils/` — `auth.ts`, `subdomain.ts`, `format.ts`, `errorHandler.ts`, `env.ts` (runtime env / `window.__ENV`), `license.ts`, `sound.ts`, and per-panel queue filter helpers (`queueFilters.ts`, `doctorQueueFilters.ts`, `optometristQueueFilters.ts`).

Several root-level markdown files document specific backend integrations in more detail than this file (e.g. `DOCTOR_PANEL_API.md`, `OPTOMETRY_API_CHANGES.md`, `OPTOMETRY_BACKEND_API_REQUIREMENTS.md`, `FRONTEND_INTEGRATION_GUIDE.md`, `QUICK_API_REFERENCE.md`) — check these when working on those specific modules.

### Key Architectural Patterns

#### 1. Multi-Tenancy
- The app supports multi-tenant architecture via subdomain detection
- `extractSubdomain()` in `utils/subdomain.ts` extracts hospital ID from subdomain
- `isPlatformOwner()` in `utils/auth.ts` checks if user is platform owner
- Platform owners can specify `tenant_id` param; regular users cannot
- `getTenantIdForApi()` ensures tenant_id is only sent for platform owners

#### 2. State Management Strategy
- **Redux Toolkit**: Global state for auth, patients, admissions, billing, doctors, labs, services, queue, tenant, permissions, optometry panel/data, and more (one slice per domain in `redux/`)
- **React Query**: Server state caching, mutations, and optimistic updates, mostly through dedicated hooks in `hooks/queries/` that call `services/*Api.ts` — used alongside Redux, not as a replacement
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
- `apiClient` in `services/api.ts` is instantiated lazily behind a `Proxy` (it waits on the runtime env value from `utils/env.ts` / `window.__ENV` before creating the real axios instance) rather than a plain module-scope `axios.create()`
- Request interceptor adds `Authorization: Bearer <token>`
- Response interceptor catches 401 errors, clears auth storage, and redirects to `/login` (respecting `basePath`)
- Session restored on app mount via `restoreSession()` in `authSlice.ts`

#### 5. Routing & Access Control
- Standard Next.js App Router file-based routing — each feature area is a real route under `app/(dashboard)/<feature>/page.tsx`, not a hash-routed single-page app
- `app/(dashboard)/layout.tsx` gates every route: it calls `usePermissions()` to fetch `allowedScreens`/`default_screen`, then `hasAccess(pathname)` to decide between rendering the page or an "Access Denied" screen
- Doctors are routed to either `doctor-panel` or `optometrist-panel` based on `specialization === "Ophthalmology"` (handled in the same layout)
- A legacy hash-redirect shim lives in `app/(dashboard)/page.tsx` (~line 305): old bookmarked/shared links like `#patients` are caught and redirected to the corresponding real route — this is a backwards-compatibility fallback, not the primary routing mechanism
- Feature flags (`useFeatureFlags`, `services/featureFlagsApi.ts`) layer on top of permissions to toggle newer functionality per tenant

#### 6. Print/PDF Generation
- Components with "Print" suffix (e.g. `OpdSlipPrint.tsx`, `DischargeSummaryPrint.tsx`) use `react-to-print`
- PDF exports use `jsPDF` and `jsPDF-AutoTable`
- Print components hidden from main UI, mounted only when printing
- Hospital logo and tenant details fetched from `tenantSlice` via `useTenant()` hook

#### 7. Form Handling
- Uses `react-hook-form` for all forms
- Modal components typically receive `isOpen`, `onClose`, and optional `defaultValues` props
- Forms submit via Redux async thunks or React Query mutations
- Success notifications via `toast()` from Sonner

#### 8. Role-Based Access Control & Permissions
- User role stored in `localStorage` as `role` (`admin`, `doctor`, `nurse`, `receptionist`, `lab_technician`, `platform_owner`, …)
- Fine-grained access is permission-based, not just role checks: `redux/permissionsSlice.ts` + `services/permissionsApi.ts` + `hooks/usePermissions.ts` drive `hasAccess(pathname)` in `app/(dashboard)/layout.tsx`
- Some panels (doctor panel, optometrist panel, lab-technician panel) additionally check role/specialization before rendering

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

### Deployment
Three deployment paths exist in this repo — check which is relevant before changing build/deploy config:
- **Static export / GitHub Pages**: `output: "export"` in `next.config.ts`; `basePath`/`assetPrefix` set via `NEXT_PUBLIC_BASE_PATH`; images unoptimized; trailing slash enabled
- **Docker**: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `entrypoint.sh`, `docker-build.sh`/`.bat`, `push-to-dockerhub.sh`
- **Netlify**: `netlify.toml`

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
1. Define TypeScript types in `src/types/index.ts` (or a domain-specific file in `src/types/`)
2. Create API service in `src/services/` (e.g. `newFeatureApi.ts`)
3. Create Redux slice if needed in `src/redux/`, or a React Query hook in `src/hooks/queries/`
4. Add slice to `store.ts` reducer (if using Redux)
5. Create components in `src/components/new-feature/`
6. Add a route at `src/app/(dashboard)/new-feature/page.tsx`
7. Add sidebar menu item in `Sidebar.tsx`, and a permission entry if the feature should be access-gated

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
- React Query for server caching and mutations (appointments, lab bookings, invoices, admissions, surgery billing, etc. — see `hooks/queries/`)
- Both can coexist: use `useQuery`/hooks from `hooks/queries/` for fetching, dispatch Redux actions for state updates

## Testing & Quality

- ESLint configured via `eslint.config.mjs`
- TypeScript strict mode enabled
- No unit tests currently configured (can be added)

## License Information

- License validity tracked via tenant's `license_valid_till` field
- License expiry alert shown on dashboard when expiring or expired
- Helper functions for license checks live in `src/utils/license.ts`
