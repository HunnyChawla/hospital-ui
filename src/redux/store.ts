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
import wardsReducer from "./wardsSlice";
import bedsReducer from "./bedsSlice";
import vitalSignsReducer from "./vitalSignsSlice";
import clinicalNotesReducer from "./clinicalNotesSlice";
import doctorPanelReducer from "./doctorPanelSlice";
import optometristPanelReducer from "./optometristPanelSlice";
import optometryDataReducer from "./optometryDataSlice";
import permissionsReducer from "./permissionsSlice";
import diagnosesReducer from "./diagnosesSlice";
import advicesReducer from "./advicesSlice";

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
    wards: wardsReducer,
    beds: bedsReducer,
    vitalSigns: vitalSignsReducer,
    clinicalNotes: clinicalNotesReducer,
    doctorPanel: doctorPanelReducer,
    optometristPanel: optometristPanelReducer,
    optometryData: optometryDataReducer,
    permissions: permissionsReducer,
    diagnoses: diagnosesReducer,
    advices: advicesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

