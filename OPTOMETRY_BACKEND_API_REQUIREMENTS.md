# Optometry Panel - Backend API Requirements

This document lists all backend API endpoints required for the Optometry Panel functionality.

---

## 📋 Summary

- **Total New Endpoints**: 26
- **Reused Existing Endpoints**: 3 (doctors, OPD visits, patients)
- **Total Database Tables**: 8 new tables

---

## ✅ Existing APIs (Reused - No Backend Changes Needed)

### 1. Doctors API
**Endpoint**: `/doctors`
**Usage**: Optometrists are stored in the doctors table with `specialization="Optometry"`

- `GET /doctors` - List all doctors (filter by specialization on frontend)
- `GET /doctors/{id}` - Get optometrist details
- `POST /doctors` - Create optometrist (if admin creates new one)

### 2. OPD Visits API
**Endpoint**: `/opd-visits`
**Usage**: Optometry visits use the same OPD infrastructure

**Get Optometrist's Schedule:**
```
GET /opd-visits?doctor_id={optometrist_id}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}
```

**For single day**: Pass same date for both start_date and end_date
```
GET /opd-visits?doctor_id={uuid}&start_date=2025-01-02&end_date=2025-01-02
```

**For date range**: Pass different dates
```
GET /opd-visits?doctor_id={uuid}&start_date=2025-01-01&end_date=2025-01-07
```

**Other operations:**
- `PATCH /opd-visits/{visit_id}/status` - Update visit status

**Query Parameters:**
- `doctor_id` (required) - Optometrist's doctor ID
- `start_date` (required) - Start of date range (YYYY-MM-DD)
- `end_date` (required) - End of date range (YYYY-MM-DD)
- `page`, `page_size` - Pagination
- `tenant_id` - Multi-tenant support

### 3. Patients API
**Endpoint**: `/patients`
**Usage**: Standard patient management

- `GET /patients/{id}` - Get patient details
- `GET /patients` - Search patients

---

## 🆕 New APIs Required

## 1. Refraction Records API

### Database Table: `refraction_records`
```sql
CREATE TABLE refraction_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    optometrist_id UUID NOT NULL REFERENCES doctors(id),
    visit_id UUID NOT NULL REFERENCES opd_visits(id),
    eye VARCHAR(2) NOT NULL CHECK (eye IN ('OD', 'OS')),  -- Right or Left eye
    sphere DECIMAL(4,2) NOT NULL,  -- -20.00 to +20.00
    cylinder DECIMAL(4,2),  -- -6.00 to +6.00
    axis INT CHECK (axis >= 0 AND axis <= 180),  -- Required if cylinder != 0
    visual_acuity_uncorrected VARCHAR(10) NOT NULL,  -- e.g., "6/60", "6/6"
    visual_acuity_corrected VARCHAR(10) NOT NULL,
    add_power DECIMAL(3,2),  -- For presbyopia/reading
    notes TEXT,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(visit_id, eye)  -- One record per eye per visit
);
```

### Endpoints:

**POST `/api/refraction`**
- Create refraction record
- Request body:
```json
{
  "patient_id": "uuid",
  "optometrist_id": "uuid",
  "visit_id": "uuid",
  "eye": "OD|OS|OU",
  "sphere": -2.00,
  "cylinder": -0.50,
  "axis": 90,
  "visual_acuity_uncorrected": "6/18",
  "visual_acuity_corrected": "6/6",
  "add_power": 2.00,
  "notes": "string"
}
```

**GET `/api/refraction?patient_id={id}`**
- Get all refraction records for a patient
- Query params: `patient_id`, `page`, `page_size`, `tenant_id`
- Returns paginated list

**GET `/api/refraction/{id}`**
- Get single refraction record

**PUT `/api/refraction/{id}`**
- Update refraction record

---

## 2. IOP (Intraocular Pressure) API

### Database Table: `iop_records`
```sql
CREATE TABLE iop_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID NOT NULL REFERENCES opd_visits(id),
    od_pressure DECIMAL(4,1) NOT NULL,  -- mmHg (5.0 to 50.0)
    os_pressure DECIMAL(4,1) NOT NULL,  -- mmHg
    measurement_time TIMESTAMP NOT NULL DEFAULT NOW(),
    measurement_method VARCHAR(50) NOT NULL,  -- NCT, Goldmann, Tonopen, iCare
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### Endpoints:

**POST `/api/iop`**
- Create IOP measurement
- Request body:
```json
{
  "patient_id": "uuid",
  "visit_id": "uuid",
  "od_pressure": 16.5,
  "os_pressure": 15.8,
  "measurement_time": "2025-01-02T10:30:00Z",
  "measurement_method": "Non-Contact Tonometry (NCT)",
  "notes": "string"
}
```

**GET `/api/iop?patient_id={id}&days={180}`**
- Get IOP records for patient (filtered by date range)
- Returns list of IOP measurements

**GET `/api/iop/trends/{patient_id}?days={180}`**
- Get IOP trend statistics
- Response:
```json
{
  "patient_id": "uuid",
  "latest_od": 16.5,
  "latest_os": 15.8,
  "average_od": 16.2,
  "average_os": 15.5,
  "max_od": 18.0,
  "max_os": 17.5,
  "min_od": 14.0,
  "min_os": 13.5,
  "measurement_count": 10,
  "date_range_days": 180
}
```

---

## 3. AR Data (Auto-Refraction) API

### Database Table: `ar_data_records`
```sql
CREATE TABLE ar_data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID NOT NULL REFERENCES opd_visits(id),
    -- OD (Right Eye)
    od_sphere DECIMAL(4,2),
    od_cylinder DECIMAL(4,2),
    od_axis INT,
    od_visual_acuity VARCHAR(10),
    -- OS (Left Eye)
    os_sphere DECIMAL(4,2),
    os_cylinder DECIMAL(4,2),
    os_axis INT,
    os_visual_acuity VARCHAR(10),
    -- Common
    pupillary_distance DECIMAL(4,1),  -- mm
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### Endpoints:

**POST `/api/ar-data`**
- Create AR data record

**GET `/api/ar-data?patient_id={id}`**
- Get AR data for patient

**GET `/api/ar-data/visit/{visit_id}`**
- Get AR data for specific visit

---

## 4. Complaints API

### Database Table: `complaint_records`
```sql
CREATE TABLE complaint_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID NOT NULL REFERENCES opd_visits(id),
    complaint TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    duration VARCHAR(100),  -- e.g., "2 days", "1 week"
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### Endpoints:

**POST `/api/complaints`**
- Create complaint

**GET `/api/complaints/visit/{visit_id}`**
- Get complaints for visit

**GET `/api/complaints?patient_id={id}`**
- Get all complaints for patient

**DELETE `/api/complaints/{id}`**
- Delete complaint

---

## 5. Medical History API

### Database Table: `medical_history`
```sql
CREATE TABLE medical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL UNIQUE REFERENCES patients(id),  -- One per patient
    -- Systemic conditions (boolean flags)
    diabetes BOOLEAN DEFAULT FALSE,
    hypertension BOOLEAN DEFAULT FALSE,
    thyroid_disorder BOOLEAN DEFAULT FALSE,
    heart_disease BOOLEAN DEFAULT FALSE,
    asthma BOOLEAN DEFAULT FALSE,
    tuberculosis BOOLEAN DEFAULT FALSE,
    kidney_disease BOOLEAN DEFAULT FALSE,
    liver_disease BOOLEAN DEFAULT FALSE,
    cancer BOOLEAN DEFAULT FALSE,
    hiv_aids BOOLEAN DEFAULT FALSE,
    -- Text fields
    other_conditions TEXT,
    current_medications TEXT,
    family_history TEXT,
    lifestyle_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### Endpoints:

**GET `/api/medical-history/{patient_id}`**
- Get medical history for patient
- Returns single record (one per patient)

**POST `/api/medical-history`**
- Create/update medical history (upsert based on patient_id)
- Request body:
```json
{
  "patient_id": "uuid",
  "diabetes": true,
  "hypertension": false,
  "other_conditions": "string",
  "current_medications": "string",
  "family_history": "string",
  "lifestyle_notes": "string"
}
```

---

## 6. Ophthalmic Surgery History API

### Database Table: `ophthalmic_surgery_history`
```sql
CREATE TABLE ophthalmic_surgery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    surgery_name VARCHAR(200) NOT NULL,
    eye VARCHAR(2) NOT NULL CHECK (eye IN ('OD', 'OS', 'OU')),  -- OU = Both eyes
    surgery_date DATE,
    surgeon_name VARCHAR(200),
    hospital_name VARCHAR(200),
    complications TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

### Endpoints:

**POST `/api/ophthalmic-history`**
- Create surgery record

**GET `/api/ophthalmic-history?patient_id={id}`**
- Get all surgeries for patient

**DELETE `/api/ophthalmic-history/{id}`**
- Delete surgery record

---

## 7. Drug Allergies API

### Database Table: `drug_allergies`
```sql
CREATE TABLE drug_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    drug_name VARCHAR(200) NOT NULL,
    reaction TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(patient_id, drug_name)  -- One allergy per drug per patient
);
```

### Endpoints:

**POST `/api/drug-allergies`**
- Create allergy record

**GET `/api/drug-allergies?patient_id={id}`**
- Get all allergies for patient

**DELETE `/api/drug-allergies/{id}`**
- Delete allergy

---

## 8. Optometry Prescriptions API

### Database Tables:

**`optometry_prescriptions`**
```sql
CREATE TABLE optometry_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    optometrist_id UUID NOT NULL REFERENCES doctors(id),
    visit_id UUID NOT NULL REFERENCES opd_visits(id),
    prescription_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    pupillary_distance DECIMAL(4,1),
    diagnosis TEXT,
    notes TEXT,
    frame_fitting_notes TEXT,
    finalized_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);
```

**`optometry_prescription_items`**
```sql
CREATE TABLE optometry_prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES optometry_prescriptions(id) ON DELETE CASCADE,
    eye VARCHAR(2) NOT NULL CHECK (eye IN ('OD', 'OS')),
    sphere DECIMAL(4,2) NOT NULL,
    cylinder DECIMAL(4,2),
    axis INT,
    add_power DECIMAL(3,2),
    prism VARCHAR(50),  -- e.g., "2∆ BI"
    lens_type VARCHAR(100),  -- Single Vision, Bifocal, Progressive, etc.
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(prescription_id, eye)
);
```

### Endpoints:

**POST `/api/optometry-prescriptions`**
- Create prescription (draft)
- Request body:
```json
{
  "patient_id": "uuid",
  "visit_id": "uuid",
  "optometrist_id": "uuid",
  "status": "draft",
  "items": [
    {
      "eye": "OD",
      "sphere": -2.00,
      "cylinder": -0.50,
      "axis": 90,
      "add_power": 2.00,
      "prism": null,
      "lens_type": "Progressive"
    },
    {
      "eye": "OS",
      "sphere": -2.25,
      "cylinder": -0.50,
      "axis": 85,
      "add_power": 2.00,
      "prism": null,
      "lens_type": "Progressive"
    }
  ],
  "pupillary_distance": 63.5,
  "diagnosis": "Myopia OU, Presbyopia",
  "notes": "string",
  "frame_fitting_notes": "string"
}
```

**GET `/api/optometry-prescriptions?patient_id={id}`**
- Get all prescriptions for patient

**GET `/api/optometry-prescriptions/{id}`**
- Get single prescription with items

**PUT `/api/optometry-prescriptions/{id}`**
- Update draft prescription

**PATCH `/api/optometry-prescriptions/{id}/finalize`**
- Finalize prescription (sets status='finalized', generates prescription_number)
- Response:
```json
{
  "id": "uuid",
  "prescription_number": "RX123456",
  "status": "finalized",
  "finalized_at": "2025-01-02T10:30:00Z"
}
```

---

## 9. Patient Optometry History Timeline API

### Endpoint:

**GET `/api/patient-optometry-history/{patient_id}?page=1&page_size=50`**
- Get comprehensive timeline of patient's optometry events
- Response:
```json
{
  "patient_id": "uuid",
  "total_events": 45,
  "total_visits": 10,
  "total_prescriptions": 5,
  "total_refraction_tests": 12,
  "total_iop_tests": 8,
  "has_more": false,
  "events": [
    {
      "event_type": "refraction",
      "date": "2025-01-02T10:30:00Z",
      "title": "Refraction Testing",
      "description": "Updated spectacle prescription",
      "optometrist_name": "Dr. Smith",
      "details": {
        "od": { "sphere": -2.00, "cylinder": -0.50, "axis": 90, "va": "6/6" },
        "os": { "sphere": -2.25, "cylinder": -0.50, "axis": 85, "va": "6/6" }
      }
    },
    {
      "event_type": "iop",
      "date": "2025-01-02T10:25:00Z",
      "title": "IOP Measurement",
      "description": "Intraocular pressure check",
      "optometrist_name": "Dr. Smith",
      "details": {
        "od_pressure": 16.5,
        "os_pressure": 15.8
      }
    },
    {
      "event_type": "prescription",
      "date": "2025-01-02T11:00:00Z",
      "title": "Optical Prescription",
      "description": "Prescription finalized",
      "optometrist_name": "Dr. Smith",
      "details": {
        "prescription_number": "RX123456",
        "diagnosis": "Myopia OU"
      }
    }
  ]
}
```

---

## 📊 API Requirements Summary

### By Category:

**Refraction (3 endpoints)**
- POST /api/refraction
- GET /api/refraction (list)
- GET /api/refraction/{id}

**IOP (3 endpoints)**
- POST /api/iop
- GET /api/iop (list)
- GET /api/iop/trends/{patient_id}

**AR Data (3 endpoints)**
- POST /api/ar-data
- GET /api/ar-data (list)
- GET /api/ar-data/visit/{visit_id}

**Complaints (4 endpoints)**
- POST /api/complaints
- GET /api/complaints (list)
- GET /api/complaints/visit/{visit_id}
- DELETE /api/complaints/{id}

**Medical History (2 endpoints)**
- GET /api/medical-history/{patient_id}
- POST /api/medical-history (upsert)

**Ophthalmic History (3 endpoints)**
- POST /api/ophthalmic-history
- GET /api/ophthalmic-history (list)
- DELETE /api/ophthalmic-history/{id}

**Drug Allergies (3 endpoints)**
- POST /api/drug-allergies
- GET /api/drug-allergies (list)
- DELETE /api/drug-allergies/{id}

**Prescriptions (5 endpoints)**
- POST /api/optometry-prescriptions
- GET /api/optometry-prescriptions (list)
- GET /api/optometry-prescriptions/{id}
- PUT /api/optometry-prescriptions/{id}
- PATCH /api/optometry-prescriptions/{id}/finalize

**Timeline (1 endpoint)**
- GET /api/patient-optometry-history/{patient_id}

---

## 🔐 Multi-Tenant Support

All endpoints must support:
- `tenant_id` query parameter (platform owners only)
- Automatic tenant filtering based on JWT token
- Tenant isolation in database queries

---

## 📝 Notes

1. **Optometrists in Doctors Table**: Create optometrists with `specialization="Optometry"` in the existing doctors table.

2. **OPD Integration**: Optometry visits use the existing OPD visits infrastructure. No separate visit management needed.

3. **Validation Rules**:
   - Sphere: -20.00 to +20.00 in 0.25 steps
   - Cylinder: -6.00 to +6.00 in 0.25 steps
   - Axis: 0-180 degrees (required if cylinder ≠ 0)
   - IOP: 5-50 mmHg (warn if outside 10-21)
   - Visual Acuity: Standard values (6/60, 6/36, 6/24, 6/18, 6/12, 6/9, 6/6, 6/5)

4. **Audit Trail**: All tables include `created_at`, `updated_at`, `created_by`, `updated_by` fields.

5. **Prescription Number**: Auto-generate unique prescription numbers when finalizing (e.g., "RX123456").
