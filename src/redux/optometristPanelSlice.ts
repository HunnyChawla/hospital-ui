import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  optometryScheduleApi,
  OptometryScheduleParams,
} from "@/services/optometryScheduleApi";
import {
  patientOptometryHistoryApi,
  PatientOptometryHistoryParams,
} from "@/services/patientOptometryHistoryApi";
import { OptometristSchedule, PatientOptometryTimeline, OptometristStats } from "@/types";

type ActiveTab =
  | "complaints"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history"
  | "diagnosis";

type OptometristPanelState = {
  selectedPatientId: string | null;
  activeTab: ActiveTab;
  todaySchedule: OptometristSchedule | null;
  patientOptometryHistory: PatientOptometryTimeline | null;
  todayStats: OptometristStats | null;
  loading: boolean;
  error: string | null;
};

const initialState: OptometristPanelState = {
  selectedPatientId: null,
  activeTab: "complaints",
  todaySchedule: null,
  patientOptometryHistory: null,
  todayStats: null,
  loading: false,
  error: null,
};

export const fetchTodayOptometrySchedule = createAsyncThunk(
  "optometristPanel/fetchTodayOptometrySchedule",
  async (params: OptometryScheduleParams, { rejectWithValue }) => {
    try {
      const schedule = await optometryScheduleApi.getTodaySchedule(params);
      return schedule;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchPatientOptometryHistory = createAsyncThunk(
  "optometristPanel/fetchPatientOptometryHistory",
  async (params: PatientOptometryHistoryParams, { rejectWithValue }) => {
    try {
      const history = await patientOptometryHistoryApi.get(params);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const optometristPanelSlice = createSlice({
  name: "optometristPanel",
  initialState,
  reducers: {
    selectPatient: (state, action: PayloadAction<string | null>) => {
      state.selectedPatientId = action.payload;
      // Reset tab when changing patient
      if (action.payload) {
        state.activeTab = "complaints";
      }
    },
    setActiveTab: (state, action: PayloadAction<ActiveTab>) => {
      state.activeTab = action.payload;
    },
    setTodayStats: (state, action: PayloadAction<OptometristStats>) => {
      state.todayStats = action.payload;
    },
    clearPatientData: (state) => {
      state.selectedPatientId = null;
      state.patientOptometryHistory = null;
      state.activeTab = "complaints";
    },
    resetOptometristPanel: (state) => {
      state.selectedPatientId = null;
      state.activeTab = "complaints";
      state.todaySchedule = null;
      state.patientOptometryHistory = null;
      state.todayStats = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch today's schedule
      .addCase(fetchTodayOptometrySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayOptometrySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.todaySchedule = action.payload;

        // Calculate today's stats from schedule
        const slots = action.payload.slots;
        state.todayStats = {
          todayTotal: slots.length,
          todayPending: slots.filter(
            (s) => s.status === "scheduled" || s.status === "checked_in"
          ).length,
          todayInProgress: slots.filter(
            (s) => s.status === "in_consultation"
          ).length,
          todayCompleted: slots.filter(
            (s) => s.status === "completed"
          ).length,
        };
        state.error = null;
      })
      .addCase(fetchTodayOptometrySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch schedule";
      })
      // Fetch patient optometry history
      .addCase(fetchPatientOptometryHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientOptometryHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.patientOptometryHistory = action.payload;
        state.error = null;
      })
      .addCase(fetchPatientOptometryHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch patient optometry history";
      });
  },
});

export const {
  selectPatient,
  setActiveTab,
  setTodayStats,
  clearPatientData,
  resetOptometristPanel,
} = optometristPanelSlice.actions;

export default optometristPanelSlice.reducer;
