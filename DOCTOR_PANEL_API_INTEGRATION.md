# Doctor Panel API Integration Update

## Summary

Based on user clarification, **2 of the 5 proposed APIs already exist** in the system. This document outlines the integration approach.

---

## API Status Overview

| # | API Name | Status | Implementation |
|---|----------|--------|----------------|
| 1 | Vital Signs API | ⏳ **NEW** | Needs backend implementation |
| 2 | Clinical Notes API | ⏳ **NEW** | Needs backend implementation |
| 3 | Patient History API | ⏳ **NEW** | Needs backend implementation |
| 4 | Doctor Schedule API | ✅ **EXISTS** | Use `/opd/visits` API |
| 5 | Lab Results API | ✅ **EXISTS** | Use `/lab-bookings/{id}/results` |

---

## Existing API Integration

### 1. Doctor Schedule API ✅

**User Clarification**: "Instead of schedule we have visit list api"

**Solution**: Updated [src/services/doctorScheduleApi.ts](src/services/doctorScheduleApi.ts) to use existing OPD Visits API.

**Implementation Details**:
```typescript
// Before (proposed new endpoint):
GET /doctors/{doctor_id}/schedule?date=YYYY-MM-DD

// After (using existing endpoint):
GET /opd/visits?doctor_id={id}&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&sort_by=checked_in_at
```

**Mapping Logic**:
- Fetch visits via `opdVisitsApi.list()` with doctor and date filters
- Map `Visit` objects to `DoctorScheduleSlot` format
- Extract time from `checked_in_at` or `created_at` field
- Count appointments vs walk-in visits
- Return as `DoctorSchedule` type

**Files Updated**:
- ✅ [src/services/doctorScheduleApi.ts](src/services/doctorScheduleApi.ts) - Implemented mapping from OPD visits

**No Changes Needed**:
- Redux slice uses `doctorScheduleApi.getTodaySchedule()` - works transparently
- UI components receive `DoctorSchedule` type - no changes required

---

### 2. Lab Results API ✅

**User Clarification**: "Lab results api is used in Lab Booking tab when we download lab reports"

**Solution**: API service already exists at [src/services/labBookingsApi.ts:131](src/services/labBookingsApi.ts:131).

**Implementation Details**:
```typescript
// Existing endpoint (already in use):
GET /lab-bookings/{booking_id}/results

// Already implemented service:
labBookingsApi.getResults(bookingId, tenantId)
```

**Current Usage**:
- ✅ Service method: `labBookingsApi.getResults()` - **already exists**
- ✅ Used in Lab Booking tab for downloading reports
- ⚠️ May need enhancement for normal range fields

**Potential Backend Enhancement Needed**:

If the backend response doesn't currently include these fields, they should be added:
```typescript
{
  "result_value": 14.5,
  "unit": "g/dL",
  "normal_range_min": 12.0,    // ← Add if missing
  "normal_range_max": 16.0,    // ← Add if missing
  "is_abnormal": false,        // ← Add if missing
  "reference_text": "..."      // ← Optional
}
```

**Files Already in Place**:
- ✅ [src/services/labBookingsApi.ts](src/services/labBookingsApi.ts) - Service exists
- ✅ [src/components/doctors/patient-details/LabResultsPanel.tsx](src/components/doctors/patient-details/LabResultsPanel.tsx) - UI component ready
- ✅ [src/components/doctors/shared/NormalRangeIndicator.tsx](src/components/doctors/shared/NormalRangeIndicator.tsx) - Visual indicator ready

**Action Required**:
1. Verify backend response includes `normal_range_min`, `normal_range_max`, `is_abnormal`
2. If missing, ask backend team to add these fields
3. Test with LabResultsPanel component to ensure visual indicators work

---

## New APIs Still Required

The following 3 APIs need backend implementation:

### 1. Vital Signs API ⏳ HIGH PRIORITY

**Endpoints Required**:
```
POST   /vital-signs
GET    /vital-signs?patient_id={id}
GET    /vital-signs/{id}
PUT    /vital-signs/{id}
DELETE /vital-signs/{id}
GET    /vital-signs/trends?patient_id={id}&days=7
```

**Frontend Ready**:
- ✅ Service: [src/services/vitalSignsApi.ts](src/services/vitalSignsApi.ts)
- ✅ Redux: [src/redux/vitalSignsSlice.ts](src/redux/vitalSignsSlice.ts)
- ✅ UI: [src/components/doctors/patient-details/VitalSignsPanel.tsx](src/components/doctors/patient-details/VitalSignsPanel.tsx)
- ✅ Charts: [src/components/doctors/patient-details/VitalSignsChart.tsx](src/components/doctors/patient-details/VitalSignsChart.tsx)

**See**: [DOCTOR_PANEL_API.md#1-vital-signs-api](DOCTOR_PANEL_API.md#1-vital-signs-api)

---

### 2. Clinical Notes API ⏳ HIGH PRIORITY

**Endpoints Required**:
```
POST   /clinical-notes
GET    /clinical-notes?patient_id={id}
GET    /clinical-notes/{id}
PUT    /clinical-notes/{id}
DELETE /clinical-notes/{id}
POST   /clinical-notes/voice-to-text (optional)
```

**Frontend Ready**:
- ✅ Service: [src/services/clinicalNotesApi.ts](src/services/clinicalNotesApi.ts)
- ✅ Redux: [src/redux/clinicalNotesSlice.ts](src/redux/clinicalNotesSlice.ts)
- ✅ UI: [src/components/doctors/patient-details/QuickNotesPanel.tsx](src/components/doctors/patient-details/QuickNotesPanel.tsx)
- ✅ Voice: [src/components/doctors/patient-details/VoiceNoteRecorder.tsx](src/components/doctors/patient-details/VoiceNoteRecorder.tsx)

**See**: [DOCTOR_PANEL_API.md#2-clinical-notes-api](DOCTOR_PANEL_API.md#2-clinical-notes-api)

---

### 3. Patient History API ⏳ MEDIUM PRIORITY

**Endpoints Required**:
```
GET /patients/{patient_id}/history?type=all|visits|labs|prescriptions|admissions|vitals
```

**Frontend Ready**:
- ✅ Service: [src/services/patientHistoryApi.ts](src/services/patientHistoryApi.ts)
- ✅ Redux: [src/redux/doctorPanelSlice.ts](src/redux/doctorPanelSlice.ts) (includes fetchPatientHistory thunk)
- ✅ UI: [src/components/doctors/patient-details/PatientHistoryTimeline.tsx](src/components/doctors/patient-details/PatientHistoryTimeline.tsx)

**Backend Logic Required**:
This endpoint needs to aggregate events from multiple tables:
- `opd_visits` → Visit events
- `prescriptions` → Prescription events
- `lab_bookings` → Lab test events
- `admissions` → Admission/discharge events
- `vital_signs` → Vital signs records

**See**: [DOCTOR_PANEL_API.md#3-patient-history-api](DOCTOR_PANEL_API.md#3-patient-history-api)

---

## Testing Checklist

### Phase 1: Test Existing API Integration ✅

- [ ] **Doctor Schedule**:
  - [ ] Open Doctor Panel
  - [ ] Verify today's schedule loads from `/opd/visits` API
  - [ ] Check token numbers display correctly
  - [ ] Verify status badges (checked_in, in_consultation, completed)
  - [ ] Test patient selection from schedule timeline

- [ ] **Lab Results**:
  - [ ] Select patient with completed lab bookings
  - [ ] Open "Labs" tab
  - [ ] Expand lab booking to view results
  - [ ] Verify normal range indicators work (if backend has the fields)
  - [ ] Test download report functionality

### Phase 2: Test After New APIs Implemented ⏳

- [ ] **Vital Signs**:
  - [ ] Record new vital signs for patient
  - [ ] View vital signs history
  - [ ] Check trend charts display correctly
  - [ ] Verify auto-calculated BMI
  - [ ] Test abnormal value highlighting

- [ ] **Clinical Notes**:
  - [ ] Add SOAP note
  - [ ] Add quick note
  - [ ] Test voice recording (Chrome/Edge only)
  - [ ] Edit existing note
  - [ ] Delete note
  - [ ] Filter by note type

- [ ] **Patient History**:
  - [ ] View complete patient timeline
  - [ ] Filter by event type (visits, labs, prescriptions, etc.)
  - [ ] Verify chronological ordering
  - [ ] Test expandable event details

---

## Deployment Checklist

### Frontend (Ready Now) ✅
- [x] All components created and tested for compilation
- [x] TypeScript types defined
- [x] Redux slices implemented
- [x] API services created
- [x] Doctor Schedule integrated with existing OPD visits API
- [x] Lab Results service already exists
- [x] Documentation updated

### Backend (Action Required)

#### Immediate Actions:
1. **Verify Lab Results Response** (Quick Win)
   - Check if `/lab-bookings/{id}/results` includes:
     - `normal_range_min`
     - `normal_range_max`
     - `is_abnormal`
   - If missing, add these fields to response

#### Implementation Queue:
2. **Implement Vital Signs API** (HIGH PRIORITY)
   - Database table: `vital_signs`
   - 6 endpoints (CRUD + trends + latest)
   - Est. time: 2-3 days

3. **Implement Clinical Notes API** (HIGH PRIORITY)
   - Database table: `clinical_notes`
   - 5 endpoints (CRUD)
   - Optional: Voice-to-text endpoint
   - Est. time: 2-3 days

4. **Implement Patient History API** (MEDIUM PRIORITY)
   - Aggregation logic from 5 tables
   - Single GET endpoint with filters
   - Est. time: 3-4 days (complex aggregation)

---

## Files Updated in This Integration

### Modified Files:

1. **[src/services/doctorScheduleApi.ts](src/services/doctorScheduleApi.ts)**
   - **Change**: Replaced direct API call with OPD visits integration
   - **Impact**: Transparent to Redux and UI layers
   - **Lines**: Complete rewrite (32 lines → 68 lines)

2. **[DOCTOR_PANEL_API.md](DOCTOR_PANEL_API.md)**
   - **Change**: Marked existing APIs with ✅, updated sections for Schedule and Lab Results
   - **Impact**: Documentation now accurate
   - **Sections**: Overview, Section 4, Section 5, Implementation Priority

3. **[DOCTOR_PANEL_IMPLEMENTATION_SUMMARY.md](DOCTOR_PANEL_IMPLEMENTATION_SUMMARY.md)**
   - **Change**: Updated "Backend APIs Required" section to "Backend APIs Status"
   - **Impact**: Clarifies which APIs exist vs need implementation
   - **Section**: Backend APIs Status (lines 250-281)

### No Changes Required:

- ✅ [src/redux/doctorPanelSlice.ts](src/redux/doctorPanelSlice.ts) - Uses doctorScheduleApi transparently
- ✅ [src/hooks/useDoctorPanel.ts](src/hooks/useDoctorPanel.ts) - No changes needed
- ✅ [src/components/doctors/DoctorPanel.tsx](src/components/doctors/DoctorPanel.tsx) - Works as-is
- ✅ All UI components - Already implemented correctly

---

## Summary

**Immediate Benefits**:
- Doctor Panel can **partially function today** using existing APIs
- Schedule timeline will work with real OPD visit data
- Lab results panel will work if backend has normal range fields

**Remaining Work**:
- Backend team needs to implement 3 new APIs (Vital Signs, Clinical Notes, Patient History)
- Estimated total backend work: 7-10 days
- Frontend is 100% ready and waiting

**Updated Priority**:
1. ✅ Integrate existing APIs (DONE)
2. Verify lab results response format (1 hour)
3. Implement Vital Signs API (2-3 days)
4. Implement Clinical Notes API (2-3 days)
5. Implement Patient History API (3-4 days)

---

**Last Updated**: December 31, 2025
**Status**: Frontend Complete, 2/5 APIs Integrated, 3/5 APIs Pending Backend Implementation
