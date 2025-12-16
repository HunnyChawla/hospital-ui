# HMS Platform - Frontend Integration Guide

## Table of Contents
1. [Application Overview](#application-overview)
2. [Base Configuration](#base-configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Handling](#error-handling)
7. [Multi-Tenancy](#multi-tenancy)
8. [Role-Based Access Control](#role-based-access-control)
9. [Common Workflows](#common-workflows)
10. [Integration Patterns](#integration-patterns)

---

## Application Overview

### System Architecture
- **Type**: Multi-tenant SaaS Platform
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with asyncpg
- **Authentication**: JWT (JSON Web Tokens)
- **API Style**: RESTful API
- **Data Format**: JSON

### Key Features
- Multi-tenant architecture with tenant isolation
- Role-based access control (RBAC)
- Patient management with UHID generation
- OPD visit management with appointment integration
- Lab test catalog and booking system
- Billing and payment processing
- Real-time queue management
- Platform owner cross-tenant access

---

## Base Configuration

### Base URL
```
Development: http://127.0.0.1:8000
Production: [To be configured]
```

### API Documentation
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON**: `http://127.0.0.1:8000/openapi.json`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### CORS Configuration
The backend is configured to accept requests from any origin in development. For production, configure appropriate CORS origins.

---

## Authentication & Authorization

### Authentication Flow

#### 1. Login
```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@hospital.com",
  "password": "password123",
  "tenant_id": "tenant-uuid-here"
}
```

**Response (200 OK):**
```json
{
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "admin"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `422 Unprocessable Entity`: Validation error

#### 2. Using the Access Token

Include the token in the `Authorization` header for all authenticated requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration:**
- Default: 60 minutes
- Token expires automatically; user must re-login

#### 3. Token Storage
- Store the `access_token` securely (e.g., localStorage, sessionStorage, or secure HTTP-only cookies)
- Store `user_id`, `tenant_id`, and `role` for quick access
- Handle token expiration gracefully

---

## API Endpoints Reference

### Base Paths
All endpoints are prefixed with the base URL. Common prefixes:
- `/auth` - Authentication
- `/users` - User management
- `/tenants` - Tenant management
- `/patients` - Patient management
- `/doctors` - Doctor management
- `/appointments` - Appointment management
- `/opd/visits` - OPD visit management
- `/opd/queue` - Live queue management
- `/opd/combined` - Combined views
- `/invoices` - Billing/invoices
- `/payments` - Payment processing
- `/lab-tests` - Lab test catalog
- `/lab-bookings` - Lab test bookings

---

## 1. Authentication Endpoints

### POST /auth/login
Login and get JWT access token.

**Request:**
```json
{
  "email": "user@hospital.com",
  "password": "password123",
  "tenant_id": "tenant-uuid"
}
```

**Response:**
```json
{
  "token": {
    "access_token": "jwt-token-here",
    "token_type": "bearer"
  },
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "admin"
}
```

---

## 2. User Management Endpoints

**Base Path:** `/users`

### POST /users
Create a new user (Admin/PlatformOwner only).

**Authorization:** `Bearer {token}`  
**Required Role:** `admin` or `platform_owner`

**Request:**
```json
{
  "email": "newuser@hospital.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "doctor",
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "email": "newuser@hospital.com",
  "full_name": "John Doe",
  "role": "doctor",
  "status": "active",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /users
List all users with pagination.

**Query Parameters:**
- `page` (int, default: 1): Page number
- `page_size` (int, default: 10, max: 100): Items per page
- `role` (string, optional): Filter by role
- `status` (string, optional): Filter by status
- `tenant_id` (string, optional): **PlatformOwner only** - Access different tenant

**Response:**
```json
{
  "items": [
    {
      "id": "user-uuid",
      "email": "user@hospital.com",
      "full_name": "John Doe",
      "role": "doctor",
      "status": "active"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

### GET /users/{user_id}
Get user by ID.

### PATCH /users/{user_id}
Update user details.

### DELETE /users/{user_id}
Delete user (soft delete).

---

## 3. Tenant Management Endpoints

**Base Path:** `/tenants`

### POST /tenants
Create a new tenant (PlatformOwner only).

**Authorization:** `Bearer {token}`  
**Required Role:** `platform_owner`

**Request:**
```json
{
  "name": "City Hospital",
  "subdomain": "city-hospital",
  "status": "active"
}
```

### GET /tenants
List all tenants (PlatformOwner only).

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10)

### GET /tenants/{tenant_id}
Get tenant by ID (any authenticated user can view their own tenant).

### PATCH /tenants/{tenant_id}
Update tenant (PlatformOwner only).

---

## 4. Patient Management Endpoints

**Base Path:** `/patients`

### POST /patients
Create a new patient.

**Authorization:** `Bearer {token}`  
**Required Role:** Any authenticated user

**Request:**
```json
{
  "first_name": "Rajesh",
  "last_name": "Kumar",
  "mobile": "9876543210",
  "email": "rajesh@example.com",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "abha_id": "ABHA123456789",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001"
}
```

**Mandatory Fields:**
- `first_name`
- `mobile`
- `date_of_birth`
- `gender`

**Unique Constraint:** `mobile` + `first_name` must be unique per tenant

**Response (201 Created):**
```json
{
  "id": "patient-uuid",
  "tenant_id": "tenant-uuid",
  "uhid": "UHID-2024-00001",
  "first_name": "Rajesh",
  "last_name": "Kumar",
  "mobile": "9876543210",
  "email": "rajesh@example.com",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "abha_id": "ABHA123456789",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /patients/search/global
Global patient search across mobile, UHID, and name.

**Query Parameters:**
- `q` (string, required): Search query
- `page` (int, default: 1)
- `page_size` (int, default: 10)
- `tenant_id` (string, optional): **PlatformOwner only**

**Example:**
```
GET /patients/search/global?q=9876543210&page=1&page_size=10
```

### GET /patients/search
Advanced patient search with filters.

**Query Parameters:**
- `mobile` (string, optional)
- `name` (string, optional)
- `uhid` (string, optional)
- `date_of_birth` (date, optional, format: YYYY-MM-DD)
- `page` (int, default: 1)
- `page_size` (int, default: 10)

### GET /patients/{patient_id}
Get patient by ID.

### GET /patients/uhid/{uhid}
Get patient by UHID.

### PATCH /patients/{patient_id}
Update patient details.

---

## 5. Doctor Management Endpoints

**Base Path:** `/doctors`

### POST /doctors
Create doctor profile (Admin/PlatformOwner only).

**Authorization:** `Bearer {token}`  
**Required Role:** `admin` or `platform_owner`

**Request:**
```json
{
  "user_id": "user-uuid",
  "specialization": "General Medicine",
  "qualification": "MBBS, MD",
  "registration_number": "REG123456",
  "consultation_fee": 500.00
}
```

**Note:** The `user_id` must belong to a user with role `doctor`.

### GET /doctors
List all doctors.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10)
- `tenant_id` (string, optional): **PlatformOwner only**

### GET /doctors/{doctor_id}
Get doctor by ID.

### PATCH /doctors/{doctor_id}
Update doctor profile.

---

## 6. Appointment Management Endpoints

**Base Path:** `/appointments`

### POST /appointments
Create a new appointment.

**Request:**
```json
{
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "appointment_date": "2024-12-20",
  "appointment_time": "10:00:00",
  "notes": "Regular checkup"
}
```

**Validation:**
- Appointment date cannot be in the past
- Time slot must be available (no conflicts)
- Token number is auto-generated (doctor-specific, daily reset)

**Response (201 Created):**
```json
{
  "id": "appointment-uuid",
  "tenant_id": "tenant-uuid",
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "appointment_date": "2024-12-20",
  "appointment_time": "10:00:00",
  "status": "scheduled",
  "token_number": 1,
  "notes": "Regular checkup",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /appointments/doctor/{doctor_id}
Get appointments for a doctor on a specific date.

**Query Parameters:**
- `appointment_date` (date, required, format: YYYY-MM-DD)
- `appointments_only` (boolean, default: false): Return only scheduled/confirmed appointments without visits
- `tenant_id` (string, optional): **PlatformOwner only**

### PATCH /appointments/{appointment_id}/status
Update appointment status.

**Query Parameters:**
- `new_status` (string, required): One of `scheduled`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`

---

## 7. OPD Visit Management Endpoints

**Base Path:** `/opd/visits`

### POST /opd/visits
Create an OPD visit (walk-in or from appointment).

**Request (Walk-in):**
```json
{
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "visit_type": "walk_in",
  "chief_complaint": "Fever and cough",
  "notes": "Walk-in patient",
  "payment_method": "cash",
  "consultation_fee": 500.00
}
```

**Request (From Appointment):**
```json
{
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "visit_type": "appointment",
  "appointment_id": "appointment-uuid",
  "chief_complaint": "Follow-up consultation",
  "notes": "Visit from appointment",
  "payment_method": "upi",
  "payment_reference": "UPI123456789",
  "consultation_fee": 500.00
}
```

**Payment Methods:**
- `cash`
- `upi` (requires `payment_reference`)
- `card` (requires `payment_reference`)
- `cheque` (requires `payment_reference`)

**Auto-Creation:**
- Automatically creates an appointment (for walk-ins)
- Automatically creates an invoice
- Automatically creates a payment (if payment_method provided)

**Response (201 Created):**
```json
{
  "id": "visit-uuid",
  "tenant_id": "tenant-uuid",
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "appointment_id": "appointment-uuid",
  "visit_type": "walk_in",
  "status": "checked_in",
  "token_number": 1,
  "chief_complaint": "Fever and cough",
  "notes": "Walk-in patient",
  "invoice_id": "invoice-uuid",
  "payment_id": "payment-uuid",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /opd/visits/{visit_id}
Get visit by ID.

### PATCH /opd/visits/{visit_id}/status
Update visit status.

**Query Parameters:**
- `new_status` (string, required): One of `checked_in`, `in_consultation`, `completed`, `cancelled`

**Status Flow:**
- `checked_in` → `in_consultation` → `completed`
- Can be `cancelled` at any time
- When status changes to `completed`, associated appointment status is also updated to `completed`

---

## 8. Queue Management Endpoints

**Base Path:** `/opd/queue`

### GET /opd/queue/doctor/{doctor_id}
Get live queue for a doctor (OPD visits only, current date).

**Response:**
```json
[
  {
    "id": "visit-uuid",
    "patient_id": "patient-uuid",
    "patient_name": "Rajesh Kumar",
    "token_number": 1,
    "status": "checked_in",
    "visit_type": "walk_in",
    "created_at": "2024-12-14T10:00:00Z"
  }
]
```

**Base Path:** `/opd/combined`

### GET /opd/combined/doctor/{doctor_id}
Get combined view of appointments and OPD visits.

**Query Parameters:**
- `queue_date` (date, optional, format: YYYY-MM-DD, defaults to today)
- `appointments_only` (boolean, default: false): Return only appointments (scheduled/confirmed, not checked in)
- `tenant_id` (string, optional): **PlatformOwner only**

**Response:**
```json
[
  {
    "id": "appointment-uuid",
    "type": "appointment",
    "patient_id": "patient-uuid",
    "patient_name": "Rajesh Kumar",
    "token_number": 1,
    "status": "scheduled",
    "appointment_date": "2024-12-14",
    "appointment_time": "10:00:00"
  },
  {
    "id": "visit-uuid",
    "type": "visit",
    "patient_id": "patient-uuid",
    "patient_name": "Rajesh Kumar",
    "token_number": 2,
    "status": "checked_in",
    "visit_type": "walk_in"
  }
]
```

### GET /opd/patient/{patient_id}/history
Get all appointments and OPD visits for a patient.

**Query Parameters:**
- `tenant_id` (string, optional): **PlatformOwner only**

---

## 9. Billing Endpoints

**Base Path:** `/invoices`

### POST /invoices
Create an invoice.

**Request:**
```json
{
  "patient_id": "patient-uuid",
  "visit_id": "visit-uuid",
  "line_items": [
    {
      "description": "Consultation Fee",
      "quantity": 1,
      "unit_price": 500.00
    },
    {
      "description": "Lab Test",
      "quantity": 1,
      "unit_price": 300.00
    }
  ],
  "tax_rate": 18.0,
  "notes": "Invoice for consultation and lab test"
}
```

**Response (201 Created):**
```json
{
  "id": "invoice-uuid",
  "tenant_id": "tenant-uuid",
  "patient_id": "patient-uuid",
  "visit_id": "visit-uuid",
  "invoice_number": "INV-20241214-00001",
  "invoice_date": "2024-12-14",
  "line_items": [
    {
      "description": "Consultation Fee",
      "quantity": 1,
      "unit_price": 500.00,
      "total": 500.00
    }
  ],
  "subtotal": 800.00,
  "tax_rate": 18.0,
  "tax_amount": 144.00,
  "total_amount": 944.00,
  "paid_amount": 0.00,
  "balance_amount": 944.00,
  "status": "pending",
  "notes": "Invoice for consultation and lab test",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /invoices
List all invoices with pagination.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10)
- `patient_id` (string, optional): Filter by patient
- `status` (string, optional): Filter by status
- `tenant_id` (string, optional): **PlatformOwner only**

### GET /invoices/{invoice_id}
Get invoice by ID.

---

## 10. Payment Endpoints

**Base Path:** `/payments`

### POST /payments
Create a payment.

**Request:**
```json
{
  "invoice_id": "invoice-uuid",
  "amount": 944.00,
  "payment_method": "cash",
  "payment_reference": null,
  "notes": "Full payment"
}
```

**Payment Methods:**
- `cash`
- `upi` (requires `payment_reference`)
- `card` (requires `payment_reference`)
- `cheque` (requires `payment_reference`)

**Response (201 Created):**
```json
{
  "id": "payment-uuid",
  "tenant_id": "tenant-uuid",
  "invoice_id": "invoice-uuid",
  "payment_number": "PAY-20241214-00001",
  "amount": 944.00,
  "payment_method": "cash",
  "payment_reference": null,
  "payment_date": "2024-12-14T10:00:00Z",
  "status": "completed",
  "notes": "Full payment",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

**Note:** Payment automatically updates the invoice's `paid_amount` and `balance_amount`.

### GET /payments
List all payments with pagination.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10)
- `invoice_id` (string, optional): Filter by invoice
- `tenant_id` (string, optional): **PlatformOwner only**

### GET /payments/{payment_id}
Get payment by ID.

---

## 11. Lab Test Catalog Endpoints

**Base Path:** `/lab-tests`

### POST /lab-tests
Create a lab test in catalog (Admin/PlatformOwner only).

**Authorization:** `Bearer {token}`  
**Required Role:** `admin` or `platform_owner`

**Request:**
```json
{
  "test_code": "CBC",
  "test_name": "Complete Blood Count",
  "description": "Complete blood count test including RBC, WBC, platelets, hemoglobin",
  "category": "Hematology",
  "price": 300.00
}
```

**Response (201 Created):**
```json
{
  "id": "test-uuid",
  "tenant_id": "tenant-uuid",
  "test_code": "CBC",
  "test_name": "Complete Blood Count",
  "description": "Complete blood count test including RBC, WBC, platelets, hemoglobin",
  "category": "Hematology",
  "price": 300.00,
  "is_active": true,
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /lab-tests
List lab tests with pagination and filters.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10, max: 100)
- `category` (string, optional): Filter by category
- `is_active` (boolean, optional): Filter by active status
- `search` (string, optional): Search in test_code, test_name, or description
- `tenant_id` (string, optional): **PlatformOwner only**

### GET /lab-tests/{test_id}
Get lab test by ID.

### PATCH /lab-tests/{test_id}
Update lab test (Admin/PlatformOwner only).

**Request:**
```json
{
  "test_name": "Updated Test Name",
  "price": 350.00,
  "is_active": true
}
```

---

## 12. Lab Test Booking Endpoints

**Base Path:** `/lab-bookings`

### POST /lab-bookings
Create a lab test booking with automatic invoice generation.

**Authorization:** `Bearer {token}`  
**Required Role:** `receptionist`, `admin`, or `platform_owner`

**Request:**
```json
{
  "patient_id": "patient-uuid",
  "scheduled_date": "2024-12-20",
  "scheduled_time": "10:00",
  "priority": "routine",
  "tests": [
    {
      "lab_test_id": "test-uuid",
      "price": 300.00
    },
    {
      "lab_test_id": "test-uuid-2"
    }
  ],
  "notes": "Fasting required for 12 hours",
  "payment_method": "cash",
  "payment_reference": null
}
```

**Fields:**
- `scheduled_date` (date, required, format: YYYY-MM-DD): Cannot be in the past
- `scheduled_time` (string, optional, format: HH:MM, 24-hour): Must be valid time format
- `priority` (string, default: "routine"): One of `routine`, `urgent`, `stat`
- `tests` (array, required, min: 1): List of lab tests to book
  - `lab_test_id` (string, required): Lab test ID
  - `price` (float, optional): Price override (uses test catalog price if not provided)
- `payment_method` (string, optional): One of `cash`, `upi`, `card`, `cheque`
- `payment_reference` (string, optional): Required if payment_method is `upi` or `card`

**Validation:**
- No duplicate tests in a single booking
- Scheduled date cannot be in the past
- Time format must be HH:MM (24-hour)
- Price override must be positive
- Payment reference required for UPI/card

**Auto-Creation:**
- Automatically creates an invoice
- Automatically creates a payment (if payment_method provided)

**Response (201 Created):**
```json
{
  "id": "booking-uuid",
  "tenant_id": "tenant-uuid",
  "patient_id": "patient-uuid",
  "booking_number": "LAB-20241214-00001",
  "scheduled_date": "2024-12-20",
  "scheduled_time": "10:00",
  "priority": "routine",
  "status": "scheduled",
  "invoice_id": "invoice-uuid",
  "payment_id": "payment-uuid",
  "notes": "Fasting required for 12 hours",
  "tests": [
    {
      "id": "item-uuid",
      "lab_test_id": "test-uuid",
      "test_code": "CBC",
      "test_name": "Complete Blood Count",
      "price": 300.00
    }
  ],
  "total_amount": 300.00,
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

### GET /lab-bookings
List lab test bookings with pagination and filters.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10, max: 100)
- `patient_id` (string, optional): Filter by patient ID
- `status` (string, optional): Filter by status (`scheduled`, `sample_collected`, `in_progress`, `completed`, `cancelled`)
- `scheduled_date` (date, optional, format: YYYY-MM-DD): Filter by scheduled date
- `tenant_id` (string, optional): **PlatformOwner only**

### GET /lab-bookings/{booking_id}
Get lab test booking by ID.

### PATCH /lab-bookings/{booking_id}/status
Update booking status (Receptionist/Admin/Nurse/PlatformOwner).

**Request:**
```json
{
  "status": "sample_collected"
}
```

**Valid Status Transitions:**
- `scheduled` → `sample_collected`, `cancelled`
- `sample_collected` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`
- `completed` → (no transitions allowed)
- `cancelled` → (no transitions allowed)

**Status Values:**
- `scheduled`: Test is scheduled
- `sample_collected`: Sample has been collected
- `in_progress`: Test is being processed
- `completed`: Test is completed
- `cancelled`: Booking is cancelled

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|------------|---------|----------------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Business logic validation errors |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions or role restrictions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Request validation errors (Pydantic) |
| 500 | Internal Server Error | Server-side errors |

### Error Response Format

**Standard Error Response:**
```json
{
  "detail": "Error message here"
}
```

**Validation Error Response (422):**
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "scheduled_date"],
      "msg": "Value error, Cannot create lab test bookings for past dates",
      "input": "2024-12-13"
    }
  ]
}
```

### Common Error Scenarios

#### 1. Authentication Errors
```json
// 401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

#### 2. Authorization Errors
```json
// 403 Forbidden
{
  "detail": "Access denied. Required roles: ['admin', 'platform_owner']"
}
```

#### 3. Validation Errors
```json
// 422 Unprocessable Entity
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "patient_id"],
      "msg": "Field required"
    }
  ]
}
```

#### 4. Business Logic Errors
```json
// 400 Bad Request
{
  "detail": "Cannot create appointments for past dates"
}
```

### Error Handling Best Practices

1. **Check Status Code First**: Always check the HTTP status code before parsing response body
2. **Handle 401 Gracefully**: Redirect to login page when token expires
3. **Display User-Friendly Messages**: Extract error messages from `detail` field
4. **Log Errors**: Log 500 errors for debugging
5. **Retry Logic**: Implement retry for network errors (not for 4xx errors)

---

## Multi-Tenancy

### Tenant Isolation
- All data is tenant-scoped
- Users can only access data from their own tenant
- Tenant ID is extracted from JWT token automatically

### PlatformOwner Cross-Tenant Access
**PlatformOwner** role has special privileges:
- Can access data from any tenant using `tenant_id` query parameter
- Can create and manage tenants
- Can view all tenants

**Example - PlatformOwner accessing different tenant:**
```http
GET /patients/search/global?q=test&tenant_id=other-tenant-uuid
Authorization: Bearer {platform_owner_token}
```

**Note:** Non-PlatformOwner users cannot use `tenant_id` parameter and will receive 403 Forbidden.

---

## Role-Based Access Control

### Available Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `platform_owner` | Super admin | Full access, can manage tenants, cross-tenant access |
| `admin` | Hospital admin | Manage users, doctors, patients, all operations within tenant |
| `doctor` | Doctor | View patients, appointments, OPD visits, update visit status |
| `nurse` | Nurse | View patients, update lab booking status, assist in OPD |
| `receptionist` | Receptionist | Create patients, appointments, OPD visits, lab bookings, invoices, payments |

### Role Permissions Matrix

| Operation | PlatformOwner | Admin | Doctor | Nurse | Receptionist |
|-----------|--------------|-------|--------|-------|--------------|
| Create Tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Patient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Appointment | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create OPD Visit | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create Lab Booking | ✅ | ✅ | ❌ | ❌ | ✅ |
| Create Invoice | ✅ | ✅ | ❌ | ❌ | ✅ |
| Create Payment | ✅ | ✅ | ❌ | ❌ | ✅ |
| Update Visit Status | ✅ | ✅ | ✅ | ❌ | ✅ |
| Update Lab Booking Status | ✅ | ✅ | ❌ | ✅ | ✅ |
| View All Data | ✅ | ✅ (own tenant) | ✅ (own tenant) | ✅ (own tenant) | ✅ (own tenant) |

---

## Common Workflows

### 1. Patient Registration Flow
```
1. Receptionist searches for existing patient (by mobile/name/UHID)
2. If not found, create new patient
3. System auto-generates UHID
4. Patient is ready for appointments/OPD visits
```

### 2. Appointment Booking Flow
```
1. Receptionist searches/selects patient
2. Selects doctor
3. Chooses date and time (future dates only)
4. Creates appointment
5. System auto-generates token number
6. Appointment appears in doctor's queue
```

### 3. OPD Visit Flow (Walk-in)
```
1. Receptionist searches/selects patient
2. Selects doctor
3. Creates walk-in OPD visit
4. System automatically:
   - Creates appointment (status: checked_in)
   - Creates invoice
   - Creates payment (if payment_method provided)
5. Visit appears in doctor's queue with token number
6. Doctor updates status: checked_in → in_consultation → completed
7. When completed, appointment status also updates to completed
```

### 4. OPD Visit Flow (From Appointment)
```
1. Receptionist searches/selects patient
2. Finds existing appointment
3. Creates OPD visit with appointment_id
4. System verifies:
   - Patient matches
   - Doctor matches
   - Date matches
   - Appointment status is scheduled/confirmed
5. If valid, creates visit and updates appointment to checked_in
6. If invalid, creates as walk-in
7. System automatically creates invoice and payment
```

### 5. Lab Test Booking Flow
```
1. Receptionist searches/selects patient
2. Searches/browses lab test catalog
3. Selects one or more tests
4. Sets scheduled date/time and priority
5. Provides payment method (optional)
6. Creates booking
7. System automatically:
   - Creates invoice for selected tests
   - Creates payment (if payment_method provided)
8. Booking can be tracked through status updates:
   - scheduled → sample_collected → in_progress → completed
```

### 6. Billing and Payment Flow
```
1. Invoice is auto-created (from OPD visit or lab booking)
2. Receptionist can view invoice details
3. If payment not auto-created, create payment manually
4. Payment updates invoice paid_amount and balance_amount
5. Multiple payments can be made (partial payments supported)
```

---

## Integration Patterns

### 1. Authentication Pattern

```javascript
// Login
async function login(email, password, tenantId) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenant_id: tenantId })
  });
  
  if (response.ok) {
    const data = await response.json();
    // Store token and user info
    localStorage.setItem('access_token', data.token.access_token);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('tenant_id', data.tenant_id);
    localStorage.setItem('role', data.role);
    return data;
  } else {
    throw new Error('Login failed');
  }
}

// Authenticated Request
async function authenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}
```

### 2. Pagination Pattern

```javascript
async function fetchPaginatedData(endpoint, page = 1, pageSize = 10, filters = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...filters
  });
  
  const response = await authenticatedRequest(`${BASE_URL}${endpoint}?${params}`);
  const data = await response.json();
  
  return {
    items: data.items,
    pagination: {
      page: data.page,
      pageSize: data.page_size,
      total: data.total,
      totalPages: data.total_pages
    }
  };
}
```

### 3. Error Handling Pattern

```javascript
async function handleApiRequest(requestFn) {
  try {
    const response = await requestFn();
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (response.status === 403) {
        throw new Error('Access denied');
      }
      
      if (response.status === 422) {
        // Validation errors
        const errors = error.detail;
        throw new Error(errors.map(e => e.msg).join(', '));
      }
      
      throw new Error(error.detail || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 4. PlatformOwner Cross-Tenant Access Pattern

```javascript
async function fetchDataForTenant(endpoint, tenantId, userRole) {
  const params = new URLSearchParams();
  
  // Only PlatformOwner can specify tenant_id
  if (userRole === 'platform_owner' && tenantId) {
    params.append('tenant_id', tenantId);
  }
  
  const url = `${BASE_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
  return authenticatedRequest(url);
}
```

### 5. Real-time Queue Updates Pattern

```javascript
// Polling pattern for live queue
function startQueuePolling(doctorId, callback, interval = 5000) {
  const poll = async () => {
    try {
      const response = await authenticatedRequest(
        `${BASE_URL}/opd/queue/doctor/${doctorId}`
      );
      const queue = await response.json();
      callback(queue);
    } catch (error) {
      console.error('Queue polling error:', error);
    }
  };
  
  poll(); // Initial fetch
  return setInterval(poll, interval);
}

// Stop polling
function stopQueuePolling(intervalId) {
  clearInterval(intervalId);
}
```

---

## Data Models Reference

### Date/Time Formats
- **Date**: `YYYY-MM-DD` (e.g., "2024-12-14")
- **Time**: `HH:MM:SS` or `HH:MM` (24-hour format, e.g., "10:00:00" or "10:00")
- **DateTime**: ISO 8601 format (e.g., "2024-12-14T10:00:00Z")

### Enums

**User Roles:**
- `platform_owner`
- `admin`
- `doctor`
- `nurse`
- `receptionist`

**User Status:**
- `active`
- `inactive`
- `suspended`

**Appointment Status:**
- `scheduled`
- `confirmed`
- `checked_in`
- `completed`
- `cancelled`
- `no_show`

**Visit Status:**
- `checked_in`
- `in_consultation`
- `completed`
- `cancelled`

**Visit Type:**
- `walk_in`
- `appointment`

**Payment Method:**
- `cash`
- `upi`
- `card`
- `cheque`

**Payment Status:**
- `completed`
- `pending`
- `failed`
- `refunded`

**Lab Test Priority:**
- `routine`
- `urgent`
- `stat`

**Lab Booking Status:**
- `scheduled`
- `sample_collected`
- `in_progress`
- `completed`
- `cancelled`

**Invoice Status:**
- `pending`
- `paid`
- `partial`
- `cancelled`

---

## Testing Resources

### Postman Collections
Two Postman collections are available:
1. **HMS_Platform.postman_collection.json** - Standard organization
2. **HMS_Platform_RoleBased.postman_collection.json** - Role-based organization with edge cases

### Postman Environment
**HMS_Platform.postman_environment.json** - Contains:
- `base_url`: API base URL
- `access_token`: Auto-populated from login
- `user_id`, `tenant_id`, `role`: User context
- Various IDs for testing (patient_id, doctor_id, etc.)

### Test Reports
Comprehensive test reports are available in CSV format:
- `test_report_YYYYMMDD_HHMMSS.csv`

---

## Best Practices

### 1. Token Management
- Store tokens securely
- Implement token refresh logic (if implemented)
- Handle token expiration gracefully
- Never expose tokens in URLs or logs

### 2. Error Handling
- Always check response status codes
- Display user-friendly error messages
- Log errors for debugging
- Implement retry logic for network errors

### 3. Data Validation
- Validate data on frontend before sending
- Handle validation errors from backend (422)
- Provide real-time feedback to users

### 4. Performance
- Implement pagination for large lists
- Use appropriate page sizes (10-50 items)
- Cache frequently accessed data
- Implement debouncing for search inputs

### 5. Security
- Never store passwords
- Use HTTPS in production
- Validate all user inputs
- Implement CSRF protection (if needed)

### 6. User Experience
- Show loading states during API calls
- Provide clear error messages
- Implement optimistic updates where appropriate
- Handle offline scenarios gracefully

---

## Support and Resources

### API Documentation
- **Swagger UI**: Interactive API documentation at `/docs`
- **ReDoc**: Alternative documentation at `/redoc`
- **OpenAPI Spec**: Machine-readable spec at `/openapi.json`

### Contact
For integration support, please contact the backend development team.

---

## Version Information

- **API Version**: 0.1.0
- **Last Updated**: December 2024
- **Backend Framework**: FastAPI
- **Python Version**: 3.11+

---

## Appendix: Complete Endpoint List

### Authentication
- `POST /auth/login` - Login and get JWT token

### Users
- `POST /users` - Create user (Admin/PlatformOwner)
- `GET /users` - List users
- `GET /users/{user_id}` - Get user by ID
- `PATCH /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user

### Tenants
- `POST /tenants` - Create tenant (PlatformOwner only)
- `GET /tenants` - List tenants (PlatformOwner only)
- `GET /tenants/{tenant_id}` - Get tenant by ID
- `PATCH /tenants/{tenant_id}` - Update tenant (PlatformOwner only)

### Patients
- `POST /patients` - Create patient
- `GET /patients/search/global` - Global patient search
- `GET /patients/search` - Advanced patient search
- `GET /patients/{patient_id}` - Get patient by ID
- `GET /patients/uhid/{uhid}` - Get patient by UHID
- `PATCH /patients/{patient_id}` - Update patient

### Doctors
- `POST /doctors` - Create doctor profile (Admin/PlatformOwner)
- `GET /doctors` - List doctors
- `GET /doctors/{doctor_id}` - Get doctor by ID
- `PATCH /doctors/{doctor_id}` - Update doctor

### Appointments
- `POST /appointments` - Create appointment
- `GET /appointments/doctor/{doctor_id}` - Get doctor appointments
- `PATCH /appointments/{appointment_id}/status` - Update appointment status

### OPD Visits
- `POST /opd/visits` - Create OPD visit
- `GET /opd/visits/{visit_id}` - Get visit by ID
- `PATCH /opd/visits/{visit_id}/status` - Update visit status

### Queue Management
- `GET /opd/queue/doctor/{doctor_id}` - Get doctor queue (OPD visits only)
- `GET /opd/combined/doctor/{doctor_id}` - Get combined queue (appointments + visits)
- `GET /opd/patient/{patient_id}/history` - Get patient history

### Invoices
- `POST /invoices` - Create invoice
- `GET /invoices` - List invoices
- `GET /invoices/{invoice_id}` - Get invoice by ID

### Payments
- `POST /payments` - Create payment
- `GET /payments` - List payments
- `GET /payments/{payment_id}` - Get payment by ID

### Lab Tests
- `POST /lab-tests` - Create lab test (Admin/PlatformOwner)
- `GET /lab-tests` - List lab tests
- `GET /lab-tests/{test_id}` - Get lab test by ID
- `PATCH /lab-tests/{test_id}` - Update lab test (Admin/PlatformOwner)

### Lab Bookings
- `POST /lab-bookings` - Create lab test booking
- `GET /lab-bookings` - List lab test bookings
- `GET /lab-bookings/{booking_id}` - Get lab test booking by ID
- `PATCH /lab-bookings/{booking_id}/status` - Update booking status

### Health
- `GET /health` - Health check

---

**End of Integration Guide**

