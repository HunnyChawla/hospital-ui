# API Retry & Error Handling Testing Guide

This guide provides step-by-step instructions for testing and validating the error handling and retry prevention changes across the UI.

---

## 1. Summary of Changes Implemented

| Area / File | Previous Behavior | New Resilient Behavior |
| :--- | :--- | :--- |
| **React Query Defaults**<br>([`src/lib/react-query.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/lib/react-query.ts)) | Blindly retried all failed queries once (`retry: 1`); refetched on every window focus (`refetchOnWindowFocus: true`). | **Never retries 4xx client errors** (400, 401, 403, 404, 422). Retries up to 2 times for 5xx/network errors with exponential backoff (1s, 2s, max 10s). `refetchOnWindowFocus: false` eliminates tab-switch request bursts. |
| **Queue Polling**<br>([`src/hooks/queries/useQueue.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/hooks/queries/useQueue.ts)) | Fixed 10s polling interval (`refetchInterval: 10000`) polled indefinitely without backoff on error. | **Exponential backoff polling**: on error, polling backs off exponentially (10s → 20s → 40s → max 60s) based on failure count, and returns to 10s upon recovery. |
| **Server-Sent Events (SSE)**<br>([`src/hooks/useSSE.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/hooks/useSSE.ts)) | Reconnected up to 10 times on 4xx errors; callback instability caused infinite disconnect/reconnect loops on re-render. | **Ref-stabilized callbacks** eliminate render-triggered reconnect loops. **Non-retryable 4xx errors (400, 401, 403, 404)** halt immediately with status `"error"` and no retries. Transient disconnects retry max 5 times with capped exponential backoff. |
| **Background Job Polling**<br>([`SeedDataPanel.tsx`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/components/master-data/SeedDataPanel.tsx)) | `setInterval` polled every 5s endlessly because active job state was never cleared upon error. | Polling stops after **3 consecutive fetch failures**, setting `isPolling = false`. Users can click "Refresh" to reset and retry. |
| **Legacy TV Queue Polling**<br>([`tv-legacy/public/app.js`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/tv-legacy/public/app.js)) | Fixed 5s / 3s `setInterval` polled continuously without error thresholds. | Polling backs off exponentially on error (5s → 10s → 20s → 40s → max 60s). QR polling stops after 5 consecutive failures. |
| **Auth 401 Interceptor**<br>([`src/services/api.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/services/api.ts)) | Multiple concurrent 401 responses triggered duplicate redirects and state clearing. | Protected with a redirect guard (`isRedirectingToLogin`) to ensure a single, clean redirection. |

---

## 2. Step-by-Step Test Scenarios

### Test Case 1: 4xx Non-Retry Validation (React Query)
**Objective:** Verify that genuine client errors (400, 404, 422, etc.) are NOT retried.

1. Open the UI in Chrome / Firefox and open DevTools (**F12** -> **Network** tab -> filter by `Fetch/XHR`).
2. Navigate to a page that fetches specific entities (e.g. Patients or Invoices).
3. In DevTools, use **Network Request Blocking** or modify an ID to trigger a `404 Not Found` (or `400 Bad Request`).
4. **Expected Result:**
   - DevTools shows exactly **1 request** returning 404/400.
   - **NO second retry request** is made.
   - The UI shows an appropriate error state or toast.

---

### Test Case 2: Window Focus Flooding Prevention
**Objective:** Verify that switching browser tabs does not repeatedly hit failing endpoints.

1. Navigate to a dashboard page in the UI.
2. In DevTools Network tab, observe the initial requests.
3. Switch to another browser tab for 5 seconds, then switch back to the UI tab.
4. **Expected Result:**
   - No automatic burst of queries occurs on tab focus.
   - Queries remain in their current state without hammering the server.

---

### Test Case 3: Queue Polling Exponential Backoff ([`useQueue.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/hooks/queries/useQueue.ts))
**Objective:** Verify that live queue polling backs off exponentially upon encountering errors.

1. Open DevTools Network tab and filter by `/opd/queue` or `/doctor-queue`.
2. Select a doctor to start live queue polling (normally polls every 10s).
3. In DevTools, simulate a failure (e.g., block the queue endpoint or simulate 500 using DevTools Request Blocking).
4. **Expected Result:**
   - The failing request returns an error.
   - Rather than hammering at a flat 10s interval, next polling requests occur with increasing delays:
     - 1st failure: next attempt after **20 seconds**
     - 2nd failure: next attempt after **40 seconds**
     - 3rd+ failure: next attempt capped at **60 seconds**
   - Once the endpoint recovers, polling interval immediately resets back to **10 seconds**.

---

### Test Case 4: Server-Sent Events (SSE) Reconnection & 4xx Fast-Fail ([`useSSE.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/hooks/useSSE.ts))
**Objective:** Verify that SSE stops reconnecting immediately when given a 401, 403, or 404 response.

1. Navigate to a live queue page using SSE (e.g., Live Queue Board or Doctor Live Queue).
2. Block or mock the stream URL to return `404 Not Found` or `401 Unauthorized`.
3. Observe DevTools Network tab and console.
4. **Expected Result:**
   - Exactly **1 SSE GET request** is attempted and fails with 404/401.
   - Status transitions to `"error"`.
   - **Zero automated reconnection loops** occur.
   - Triggering component re-renders (e.g. clicking buttons or typing) does NOT reset or restart the connection.

---

### Test Case 5: Background Job Polling Cap ([`SeedDataPanel.tsx`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/components/master-data/SeedDataPanel.tsx))
**Objective:** Verify that background job polling stops after 3 consecutive failures.

1. Open the Master Data Seed Data panel.
2. If an import job is in `running` or `pending` state, polling starts (every 5s).
3. Disconnect network or block `/seed-data/jobs` in DevTools.
4. **Expected Result:**
   - DevTools shows 3 failed poll requests at 5-second intervals.
   - After the 3rd consecutive failure, polling stops completely (`isPolling = false`).
   - The "Live Updates" pulse indicator turns off.
   - Clicking the manual **"Refresh"** button resets the counter and attempts a new fetch.

---

### Test Case 6: TV Legacy Polling Error Pause ([`tv-legacy/public/app.js`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/tv-legacy/public/app.js))
**Objective:** Verify legacy TV queue display pauses on 404/403 or repeated errors.

1. Open `tv-legacy/public/index.html` or `display.html`.
2. If an invalid Doctor ID is selected or endpoint returns 404, check the console.
3. **Expected Result:**
   - Connection status indicator turns to "error".
   - The 5-second `pollInterval` is cleared, preventing infinite backend hits.

---

### Test Case 7: 401 Single Redirect Guard ([`api.ts`](file:///Users/hunnychawla/Documents/HMS/hospital-ui/src/services/api.ts))
**Objective:** Verify multiple concurrent 401 responses execute redirection only once.

1. Clear the `auth_token` in `localStorage` or set an invalid expired token (`localStorage.setItem('auth_token', 'expired_token')`).
2. Refresh a dashboard page that fires 5-10 parallel queries.
3. **Expected Result:**
   - Only 1 redirect to `/login` is initiated.
   - `localStorage` items are cleanly removed once.
   - No browser redirect loop or navigation flickering occurs.

---

## 3. Quick Verification Checklist

- [x] Client errors (`400`, `401`, `403`, `404`, `422`) do NOT retry.
- [x] Server errors (`500`, `502`, `503`) retry at most 2 times with exponential delay.
- [x] Tab switching does NOT trigger bursts of refetches.
- [x] Queue polling stops immediately when the query encounters an error.
- [x] SSE streams fail fast on 4xx without reconnect loops.
- [x] Background job panel halts polling after 3 consecutive failures.
- [x] TV legacy script stops polling on 404/403 or 5 consecutive errors.
- [x] 401 token expiry triggers a single clean login redirect.
