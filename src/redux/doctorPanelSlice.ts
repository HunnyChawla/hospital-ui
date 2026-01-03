import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  doctorScheduleApi,
  DoctorScheduleParams,
} from "@/services/doctorScheduleApi";
import {
  patientHistoryApi,
  PatientHistoryParams,
} from "@/services/patientHistoryApi";
import { DoctorSchedule, PatientHistoryTimeline, DoctorStats } from "@/types";

type ActiveTab = "history" | "vitals" | "labs" | "notes" | "ipd";

type DoctorPanelState = {
  selectedPatientId: string | null;
  activeTab: ActiveTab;
  todaySchedule: DoctorSchedule | null;
  patientHistory: PatientHistoryTimeline | null;
  todayStats: DoctorStats | null;
  loading: boolean;
  error: string | null;
};

const initialState: DoctorPanelState = {
  selectedPatientId: null,
  activeTab: "history",
  todaySchedule: null,
  patientHistory: null,
  todayStats: null,
  loading: false,
  error: null,
};

export const fetchTodaySchedule = createAsyncThunk(
  "doctorPanel/fetchTodaySchedule",
  async (params: DoctorScheduleParams, { rejectWithValue }) => {
    try {
      const schedule = await doctorScheduleApi.getTodaySchedule(params);
      return schedule;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchPatientHistory = createAsyncThunk(
  "doctorPanel/fetchPatientHistory",
  async (params: PatientHistoryParams, { rejectWithValue }) => {
    try {
      const history = await patientHistoryApi.get(params);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const doctorPanelSlice = createSlice({
  name: "doctorPanel",
  initialState,
  reducers: {
    selectPatient: (state, action: PayloadAction<string | null>) => {
      state.selectedPatientId = action.payload;
      // Reset tab when changing patient
      if (action.payload) {
        state.activeTab = "history";
      }
    },
    setActiveTab: (state, action: PayloadAction<ActiveTab>) => {
      state.activeTab = action.payload;
    },
    setTodayStats: (state, action: PayloadAction<DoctorStats>) => {
      state.todayStats = action.payload;
    },
    clearPatientData: (state) => {
      state.selectedPatientId = null;
      state.patientHistory = null;
      state.activeTab = "history";
    },
    resetDoctorPanel: (state) => {
      state.selectedPatientId = null;
      state.activeTab = "history";
      state.todaySchedule = null;
      state.patientHistory = null;
      state.todayStats = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch today's schedule
      .addCase(fetchTodaySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodaySchedule.fulfilled, (state, action) => {
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
      .addCase(fetchTodaySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch schedule";
      })
      // Fetch patient history
      .addCase(fetchPatientHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.patientHistory = action.payload;
        state.error = null;
      })
      .addCase(fetchPatientHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch patient history";
      });
  },
});

export const {
  selectPatient,
  setActiveTab,
  setTodayStats,
  clearPatientData,
  resetDoctorPanel,
} = doctorPanelSlice.actions;

export default doctorPanelSlice.reducer;
