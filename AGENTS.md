# Cura Frontend - Agent Guidelines & Architectural Rules

This document defines the core conventions, architectural boundaries, and design standards for `cura-frontend` (Multi-tenant Hospital Management System Web Portal).

---

## 1. Tech Stack & Environment
- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Server State & Caching**: TanStack React Query v5
- **Client State Management**: Redux Toolkit & React-Redux
- **Forms & Validation**: `react-hook-form`
- **Icons**: `lucide-react`
- **Notifications**: `sonner` (Toaster)
- **Printing**: `react-to-print` (for OPD prescriptions, patient summary, and invoices)

---

## 2. State Management Architecture
Follow a strict separation between server state and client state:
- **TanStack React Query v5 (Server State)**:
  - All API data fetching, caching, background refetching, and mutations belong in React Query hooks (located in `src/services/` or `src/hooks/`).
  - Use query keys consistently: `['patients', tenantId, filters]`, `['appointments', tenantId, date]`.
  - Always handle `isLoading`, `isError`, and `error` states gracefully.
- **Redux Toolkit (Client State Only)**:
  - Keep Redux strictly for global client state: authenticated user session, current tenant context, user roles, sidebar collapse, and theme preference.
  - **Do NOT duplicate server data into Redux slices.**

---

## 3. Mandatory Multi-Tenancy & API Conventions
- **Tenant Context Header**: Every outgoing Axios/HTTP request must include the hospital tenant header:
  ```typescript
  // Axios interceptor or request config
  headers['X-Tenant-ID'] = activeTenantId;
  ```
- **Tenant-Scoped Routing**: Ensure route parameters or session state validate the current tenant context to avoid cross-tenant contamination.

---

## 4. UI/UX, Design Tokens & Accessibility
Follow the `ui-ux-pro-max`, `ui-styling`, and `impeccable` standards:
- **WCAG 2.1 AA Compliance**: Maintain minimum 4.5:1 contrast for regular text and 3:1 for large text. Never use gray-on-gray unreadable text.
- **Touch Targets for Hospital Devices**: Doctor laptops and nurse tablets require minimum touch target sizes of **44×44px** with at least 8px spacing.
- **Form Usability**: Always pair form fields with visible `<label>` tags and inline error messages using `react-hook-form`. Never rely on placeholder text as the label.
- **Empty States**: Every table, list, or queue must provide an informative empty state (e.g., *"No OPD appointments scheduled for today"* with an action button to *"Register New Patient"*).
- **Anti-Slop**: Avoid generic AI gradients, unnecessary nested cards, or oversized hero sections. Clinical interfaces prioritize dense scanability and clear typographic hierarchy.

---

## 5. Medical Document Printing (`react-to-print`)
Printing physical receipts, prescriptions, and discharge summaries is a core hospital workflow:
- Always test printable components with `@media print` styles.
- **Print Formatting Rules**:
  - Force background colors to print if needed: `print-color-adjust: exact`.
  - Hide navigation bars, action buttons, toolbars, and modals: `className="print:hidden"`.
  - Avoid breaking medical line items across pages: `className="break-inside-avoid"`.
  - Optimize layout for standard A4 paper with 15mm margins.

---

## 6. Patient Privacy on Display Screens
- **Queue & Reception Displays**: Never show full plaintext patient phone numbers, government IDs, or sensitive clinical diagnoses on shared waiting room displays or reception counters.
- **Masking Rules**:
  - Mobile: `+91 XXXXX 7890`
  - ABHA ID: `XX-XXXX-XXXX-1234`
  - Aadhaar: `XXXX-XXXX-1234`

---

## 7. Component Reviews & Quality
- Run the **`ponytail-review`** skill on diffs to ensure components are clean, free of duplicate helper functions, and properly handle loading/error boundaries.
