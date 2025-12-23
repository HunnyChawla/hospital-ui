import { configureStore } from "@reduxjs/toolkit";
import patientsReducer from "./patientsSlice";
import queueReducer from "./queueSlice";
import admissionsReducer from "./admissionsSlice";
import billingReducer from "./billingSlice";
import testsReducer from "./testsSlice";
import labTestsReducer from "./labTestsSlice";
import servicesReducer from "./servicesSlice";
import authReducer from "./authSlice";
import doctorsReducer from "./doctorsSlice";
import tenantReducer from "./tenantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    patients: patientsReducer,
    queue: queueReducer,
    admissions: admissionsReducer,
    billing: billingReducer,
    tests: testsReducer,
    labTests: labTestsReducer,
    services: servicesReducer,
    doctors: doctorsReducer,
    tenant: tenantReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

