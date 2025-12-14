import { configureStore } from "@reduxjs/toolkit";
import patientsReducer from "./patientsSlice";
import queueReducer from "./queueSlice";
import admissionsReducer from "./admissionsSlice";
import billingReducer from "./billingSlice";
import testsReducer from "./testsSlice";
import authReducer from "./authSlice";
import doctorsReducer from "./doctorsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    patients: patientsReducer,
    queue: queueReducer,
    admissions: admissionsReducer,
    billing: billingReducer,
    tests: testsReducer,
    doctors: doctorsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

