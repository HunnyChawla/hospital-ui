# HMS Platform - Quick API Reference

## Base URL
```
Development: http://127.0.0.1:8000
```

## Authentication
All authenticated requests require:
```
Authorization: Bearer {access_token}
```

## Quick Endpoint Reference

### Authentication
- `POST /auth/login` - Login

### Core Operations

**Patients:**
- `POST /patients` - Create patient
- `GET /patients/search/global?q={query}` - Global search
- `GET /patients/{id}` - Get patient

**Appointments:**
- `POST /appointments` - Create appointment
- `GET /appointments/doctor/{doctor_id}?appointment_date={date}` - Get doctor appointments

**OPD Visits:**
- `POST /opd/visits` - Create visit (auto-creates appointment, invoice, payment)
- `PATCH /opd/visits/{id}/status?new_status={status}` - Update status

**Queue:**
- `GET /opd/queue/doctor/{doctor_id}` - Live queue (visits only)
- `GET /opd/combined/doctor/{doctor_id}` - Combined queue (appointments + visits)

**Lab Tests:**
- `GET /lab-tests` - List lab tests
- `POST /lab-bookings` - Create booking (auto-creates invoice, payment)
- `PATCH /lab-bookings/{id}/status` - Update booking status

**Billing:**
- `GET /invoices` - List invoices
- `POST /payments` - Create payment

## Common Request Examples

### Login
```json
POST /auth/login
{
  "email": "user@hospital.com",
  "password": "password123",
  "tenant_id": "tenant-uuid"
}
```

### Create Patient
```json
POST /patients
{
  "first_name": "Rajesh",
  "mobile": "9876543210",
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
```

### Create OPD Visit (Walk-in)
```json
POST /opd/visits
{
  "patient_id": "patient-uuid",
  "doctor_id": "doctor-uuid",
  "visit_type": "walk_in",
  "payment_method": "cash",
  "consultation_fee": 500.00
}
```

### Create Lab Booking
```json
POST /lab-bookings

{
  "patient_id": "patient-uuid",
  "scheduled_date": "2024-12-20",
  "scheduled_time": "10:00",
  "priority": "routine",
  "tests": [{"lab_test_id": "test-uuid"}],
  "payment_method": "cash"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (business logic error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Roles
- `platform_owner` - Full access, can manage tenants
- `admin` - Hospital admin
- `doctor` - Doctor
- `nurse` - Nurse
- `receptionist` - Receptionist

## PlatformOwner Cross-Tenant Access
Add `tenant_id` query parameter to access different tenant:
```
GET /patients/search/global?q=test&tenant_id=other-tenant-uuid
```

For complete documentation, see `FRONTEND_INTEGRATION_GUIDE.md`

