# Optometry Schedule API - Date Range Support

## Summary of Changes

Updated the optometry schedule API to use **start_date and end_date** parameters exclusively, matching the backend OPD visits API.

---

## ✅ Updated Files

### 1. **src/services/optometryScheduleApi.ts**

**What Changed:**
- Uses `start_date` and `end_date` parameters (required)
- Removed optional `date` parameter
- Matches backend OPD visits API requirements

**Interface:**
```typescript
export interface OptometryScheduleParams {
  optometrist_id: string;
  start_date: string;  // YYYY-MM-DD (required)
  end_date: string;    // YYYY-MM-DD (required)
  tenant_id?: string;
}
```

**Usage Examples:**

```typescript
// Single day (pass same date for both)
await optometryScheduleApi.getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2025-01-02",
  end_date: "2025-01-02"
});

// Week view
await optometryScheduleApi.getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2025-01-01",
  end_date: "2025-01-07"
});

// Month view
await optometryScheduleApi.getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2025-01-01",
  end_date: "2025-01-31"
});
```

### 2. **src/hooks/useOptometristPanel.ts**

**Updated to pass same date for both parameters (today's schedule):**

```typescript
// Before (would not work with backend)
fetchTodayOptometrySchedule({
  optometrist_id: currentOptometrist.id,
  date: today
});

// After (matches backend API)
fetchTodayOptometrySchedule({
  optometrist_id: currentOptometrist.id,
  start_date: today,
  end_date: today  // Same date for single day
});
```

---

## 📊 Backend API Requirements

### OPD Visits Endpoint

**Single Day:**
```
GET /opd-visits?doctor_id={uuid}&start_date=2025-01-02&end_date=2025-01-02
```

**Date Range:**
```
GET /opd-visits?doctor_id={uuid}&start_date=2025-01-01&end_date=2025-01-07
```

**Required Parameters:**
- `doctor_id` - Optometrist's ID
- `start_date` - Start of date range (YYYY-MM-DD)
- `end_date` - End of date range (YYYY-MM-DD)

**Optional Parameters:**
- `page`, `page_size` - Pagination
- `tenant_id` - Multi-tenant support

---

## 🎯 Use Cases

### 1. **Today's Schedule**
```typescript
const today = getTodayDateLocal();
getTodaySchedule({
  optometrist_id: "uuid",
  start_date: today,
  end_date: today
});
```

### 2. **Week View**
```typescript
getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2025-01-01",  // Monday
  end_date: "2025-01-05"     // Friday
});
```

### 3. **Month View**
```typescript
getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2025-01-01",
  end_date: "2025-01-31"
});
```

### 4. **Custom Range**
```typescript
getTodaySchedule({
  optometrist_id: "uuid",
  start_date: "2024-12-01",
  end_date: "2025-01-15"
});
```

---

## 📝 Implementation Notes

1. **Single Day Schedule**: Pass the same date for both `start_date` and `end_date`
2. **Date Range**: Pass different dates for `start_date` and `end_date`
3. **Both Parameters Required**: Backend requires both parameters
4. **No Backward Compatibility Needed**: This is a new feature, no existing production code

---

## ✅ Summary

- ✅ **Updated**: `optometryScheduleApi.ts` to use start_date/end_date
- ✅ **Updated**: `useOptometristPanel.ts` to pass both parameters
- ✅ **Updated**: `OPTOMETRY_BACKEND_API_REQUIREMENTS.md` documentation
- ✅ **Matches Backend**: Aligns with OPD visits API requirements
- ✅ **Future-Proof**: Supports day/week/month views
