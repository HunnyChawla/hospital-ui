# Doctor Panel - Required Backend APIs

This document lists all the backend API endpoints required to support the new Doctor Panel UI.

## Overview

The Doctor Panel redesign requires 3 new backend APIs and leverages 2 existing APIs:

**New APIs Required (3):**
1. Vital Signs API - Track patient vital signs with trends
2. Clinical Notes API - Doctor's clinical documentation
3. Patient History API - Aggregated patient timeline

**Existing APIs to Use (2):**
4. Doctor Schedule - **ALREADY EXISTS** as OPD Visits API (`/opd/visits`)
5. Lab Results - **ALREADY EXISTS** in Lab Bookings API (`/lab-bookings/{id}/results`)

---

## 1. Vital Signs API

### Base Path: `/vital-signs`

#### 1.1 Create Vital Signs
**POST** `/vital-signs`

Create a new vital signs record for a patient.

**Request Body:**
```json
{
  "patient_id": "string (required)",
  "systolic_bp": "number (optional)",
  "diastolic_bp": "number (optional)",
  "pulse_rate": "number (optional)",
  "temperature": "number (optional)",
  "spo2": "number (optional)",
  "respiratory_rate": "number (optional)",
  "weight": "number (optional)",
  "height": "number (optional)",
  "bmi": "number (optional, auto-calculated)",
  "notes": "string (optional)",
  "recorded_at": "string ISO datetime (optional, defaults to now)"
}
```

**Response:**
```json
{
  "id": "string",
  "patient_id": "string",
  "recorded_at": "2025-12-31T10:30:00Z",
  "recorded_by": "string (user_id)",
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "pulse_rate": 72,
  "temperature": 98.6,
  "spo2": 98,
  "respiratory_rate": 16,
  "weight": 70.5,
  "height": 170,
  "bmi": 24.4,
  "notes": "Patient appears healthy",
  "tenant_id": "string",
  "created_at": "2025-12-31T10:30:00Z",
  "updated_at": "2025-12-31T10:30:00Z"
}
```

#### 1.2 List Vital Signs
**GET** `/vital-signs`

Get paginated list of vital signs for a patient.

**Query Parameters:**
- `patient_id` (required): Patient ID
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 10)
- `tenant_id` (optional): Platform owner only

**Response:**
```json
{
  "items": [/* VitalSigns objects */],
  "total": 45,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

#### 1.3 Get Single Vital Signs Record
**GET** `/vital-signs/{id}`

Retrieve a specific vital signs record.

**Response:** Single VitalSigns object (same as Create response)

#### 1.4 Update Vital Signs
**PUT** `/vital-signs/{id}`

Update an existing vital signs record.

**Request Body:** Same as Create (all fields optional)

**Response:** Updated VitalSigns object

#### 1.5 Delete Vital Signs
**DELETE** `/vital-signs/{id}`

Delete a vital signs record.

**Response:** 204 No Content

#### 1.6 Get Vital Signs Trends
**GET** `/vital-signs/trends`

Get aggregated trend data for charting.

**Query Parameters:**
- `patient_id` (required): Patient ID
- `days` (optional): Number of days to include (default: 7, max: 90)
- `tenant_id` (optional): Platform owner only

**Response:**
```json
[
  {
    "date": "2025-12-31",
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "pulse_rate": 72,
    "temperature": 98.6,
    "spo2": 98,
    "weight": 70.5
  },
  // ... more daily averages
]
```

---

## 2. Clinical Notes API

### Base Path: `/clinical-notes`

#### 2.1 Create Clinical Note
**POST** `/clinical-notes`

Create a new clinical note.

**Request Body:**
```json
{
  "patient_id": "string (required)",
  "doctor_id": "string (required)",
  "visit_id": "string (optional)",
  "appointment_id": "string (optional)",
  "note_type": "soap | quick | voice | follow_up (required)",
  "content": "string (required)",
  "voice_recording_url": "string (optional)",
  "is_private": "boolean (optional, default: false)"
}
```

**Response:**
```json
{
  "id": "string",
  "patient_id": "string",
  "doctor_id": "string",
  "visit_id": "string",
  "appointment_id": "string",
  "note_type": "soap",
  "content": "Subjective: Patient complains of...",
  "voice_recording_url": null,
  "is_private": false,
  "created_at": "2025-12-31T10:30:00Z",
  "updated_at": "2025-12-31T10:30:00Z",
  "tenant_id": "string"
}
```

#### 2.2 List Clinical Notes
**GET** `/clinical-notes`

Get paginated list of clinical notes.

**Query Parameters:**
- `patient_id` (optional): Filter by patient
- `doctor_id` (optional): Filter by doctor
- `visit_id` (optional): Filter by visit
- `appointment_id` (optional): Filter by appointment
- `note_type` (optional): Filter by type
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `page` (optional): Page number
- `page_size` (optional): Items per page
- `tenant_id` (optional): Platform owner only

**Response:**
```json
{
  "items": [/* ClinicalNote objects */],
  "total": 23,
  "page": 1,
  "page_size": 20,
  "total_pages": 2
}
```

#### 2.3 Get Single Note
**GET** `/clinical-notes/{id}`

**Response:** Single ClinicalNote object

#### 2.4 Update Note
**PUT** `/clinical-notes/{id}`

**Request Body:** Same as Create (all fields optional except patient_id, doctor_id)

**Response:** Updated ClinicalNote object

#### 2.5 Delete Note
**DELETE** `/clinical-notes/{id}`

**Response:** 204 No Content

#### 2.6 Voice to Text (Optional)
**POST** `/clinical-notes/voice-to-text`

Convert audio recording to text (optional feature).

**Request:** multipart/form-data with audio file

**Response:**
```json
{
  "text": "Transcribed text from audio recording"
}
```

---

## 3. Patient History API

### Base Path: `/patients/{patient_id}/history`

#### 3.1 Get Patient History Timeline
**GET** `/patients/{patient_id}/history`

Get aggregated patient history from all sources.

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `type` (optional): all | visits | labs | prescriptions | admissions | vitals
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 50)
- `tenant_id` (optional): Platform owner only

**Response:**
```json
{
  "events": [
    {
      "event_type": "opd_visit",
      "event_id": "visit-123",
      "event_date": "2025-12-31T10:30:00Z",
      "title": "OPD Visit - General Checkup",
      "summary": "Chief complaint: Routine checkup",
      "data": {
        "visit_number": "OPD-251231-001",
        "doctor_name": "Dr. Smith",
        "diagnosis": "Healthy",
        "status": "completed"
      }
    },
    {
      "event_type": "prescription",
      "event_id": "rx-456",
      "event_date": "2025-12-31T10:45:00Z",
      "title": "Prescription",
      "summary": "3 medicines prescribed",
      "data": {
        "medicines_count": 3,
        "diagnosis": "Viral infection",
        "status": "finalized"
      }
    },
    {
      "event_type": "lab_booking",
      "event_id": "lab-789",
      "event_date": "2025-12-30T09:00:00Z",
      "title": "Lab Tests - CBC, Blood Sugar",
      "summary": "2 tests ordered",
      "data": {
        "booking_number": "LAB-251230-001",
        "tests": ["CBC", "Blood Sugar"],
        "status": "completed"
      }
    },
    {
      "event_type": "admission",
      "event_id": "adm-101",
      "event_date": "2025-12-25T14:00:00Z",
      "title": "Hospital Admission",
      "summary": "Admitted to ICU",
      "data": {
        "admission_number": "ADM-251225-001",
        "ward": "ICU",
        "reason": "Emergency",
        "status": "discharged"
      }
    },
    {
      "event_type": "vital_signs",
      "event_id": "vital-202",
      "event_date": "2025-12-31T10:15:00Z",
      "title": "Vital Signs Recorded",
      "summary": "BP: 120/80, Pulse: 72 bpm",
      "data": {
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "pulse_rate": 72,
        "temperature": 98.6
      }
    }
  ],
  "total": 124,
  "page": 1,
  "page_size": 50,
  "total_pages": 3
}
```

**Notes:**
- Backend should aggregate data from: opd_visits, prescriptions, lab_bookings, admissions, vital_signs tables
- Sort by `event_date` descending (most recent first)
- Each event type should have a consistent structure with `event_type`, `event_id`, `event_date`, `title`, `summary`, and `data`

---

## 4. Doctor Schedule API ✅ ALREADY EXISTS

### Use Existing OPD Visits API

**Base Path**: `/opd/visits`

The doctor's schedule can be built using the **existing OPD Visits API** with appropriate filters:

#### 4.1 Get Today's Schedule
**GET** `/opd/visits`

**Query Parameters:**
- `doctor_id` (required): Filter by doctor
- `start_date` (required): YYYY-MM-DD - Start of date range
- `end_date` (required): YYYY-MM-DD - End of date range (same as start_date for single day)
- `status` (optional): Filter by visit status
- `sort_by` (optional): `checked_in_at` or `token_number`
- `sort_order` (optional): `asc` or `desc`
- `tenant_id` (optional): Platform owner only

**Existing Response Format:**
```json
{
  "items": [
    {
      "id": "visit-123",
      "patient_id": "pat-456",
      "patient_name": "John Doe",
      "doctor_id": "doc-789",
      "visit_type": "walk_in",
      "visit_number": "OPD-251231-001",
      "status": "checked_in",
      "token_number": 15,
      "chief_complaint": "Fever",
      "checked_in_at": "2025-12-31T09:00:00Z",
      "consultation_started_at": null,
      "consultation_ended_at": null,
      "appointment_id": null,
      "created_at": "2025-12-31T08:55:00Z"
    }
    // ... more visits
  ],
  "total": 23,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

**Frontend Integration:**
The `doctorScheduleApi.getTodaySchedule()` service should map the OPD visits response to the `DoctorSchedule` type format used in the UI.

**Status Mapping:**
- `checked_in` → Patient waiting
- `in_consultation` → Currently consulting
- `completed` → Consultation finished
- `cancelled` → Visit cancelled

**Note:** Appointments can be fetched separately via `/appointments` API if needed and merged with OPD visits.

---

## 5. Lab Results with Normal Ranges ✅ ALREADY EXISTS

### Existing Lab Bookings API

**Base Path**: `/lab-bookings`

The lab results functionality **already exists** in the Lab Bookings API and is currently used for downloading lab reports.

#### 5.1 Get Lab Results
**GET** `/lab-bookings/{booking_id}/results`

**Query Parameters:**
- `tenant_id` (optional): Platform owner only

**Expected Response Format:**
```json
{
  "booking_id": "lab-123",
  "booking_number": "LAB-251231-001",
  "scheduled_date": "2025-12-31",
  "status": "completed",
  "results": [
    {
      "test_id": "test-1",
      "test_name": "Hemoglobin",
      "result_value": 14.5,
      "unit": "g/dL",
      "normal_range_min": 12.0,
      "normal_range_max": 16.0,
      "is_abnormal": false,
      "reference_text": "Normal range for adult males: 13.5-17.5 g/dL"
    },
    {
      "test_id": "test-2",
      "test_name": "Blood Sugar (Fasting)",
      "result_value": 125,
      "unit": "mg/dL",
      "normal_range_min": 70,
      "normal_range_max": 100,
      "is_abnormal": true,
      "reference_text": "Elevated - indicates pre-diabetes"
    }
  ]
}
```

**Frontend Integration:**
The `labBookingsApi.getResults()` service is **already implemented** in [src/services/labBookingsApi.ts](src/services/labBookingsApi.ts:131).

**Enhancement Needed (if not present):**
If the backend response doesn't include `normal_range_min`, `normal_range_max`, and `is_abnormal` fields, these should be added to support the visual indicators in the Doctor Panel UI.

**Notes:**
- Only available when booking status is `completed`
- `is_abnormal` flag calculated based on normal ranges
- Normal ranges can be null for tests without standard ranges
- Supports string values for qualitative tests (e.g., "Positive", "Negative")

---

## Multi-Tenancy Support

All endpoints support multi-tenancy via optional `tenant_id` query parameter:

- **Regular users**: Cannot specify `tenant_id` (automatically uses their tenant)
- **Platform owners**: Can specify `tenant_id` to access data from any hospital

The frontend uses `getTenantIdForApi()` utility to handle this automatically.

---

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <auth_token>
```

The frontend automatically adds this header via the axios interceptor in `services/api.ts`.

---

## Error Responses

Standard error format:

```json
{
  "detail": "Error message here"
}
```

Or:

```json
{
  "message": "Error message here"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `204`: No Content (for DELETE)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Implementation Priority

Recommended implementation order:

### Phase 1: Use Existing APIs (Immediate)
1. ✅ **Doctor Schedule** - Use existing `/opd/visits` API with filters
2. ✅ **Lab Results** - Use existing `/lab-bookings/{id}/results` API
   - Verify response includes `normal_range_min`, `normal_range_max`, `is_abnormal`
   - If missing, add these fields to backend response

### Phase 2: Implement New APIs (Priority Order)
3. **Vital Signs API** - HIGH PRIORITY - Frequently used medical data
4. **Clinical Notes API** - HIGH PRIORITY - Essential for documentation
5. **Patient History API** - MEDIUM PRIORITY - Aggregated timeline view

---

## Mock Data (Frontend Development)

Until backend APIs are ready, the frontend will gracefully handle missing data:

- Empty arrays for lists
- Null for optional objects
- Loading states with skeleton UI
- Error messages for failed API calls

All components are designed to work with partial data availability.

---

## Testing

When implementing these APIs, test with:

1. **Different user roles**: doctor, admin, platform_owner
2. **Multi-tenant scenarios**: Multiple hospitals, cross-tenant access
3. **Edge cases**: Empty results, large datasets, concurrent updates
4. **Date ranges**: Today, past week, custom ranges
5. **Pagination**: First page, last page, page size variations

---

## Questions or Issues?

For any clarifications or issues with these API specifications, please contact the development team.
