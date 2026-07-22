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

        // Calculate today's stats from schedule with detailed OPD pipeline breakdown
        const slots = action.payload.slots;
        const pendingOptometrist = slots.filter((s) =>
          s.status === "awaiting_optometrist" || s.status === "optometrist_assigned"
        ).length;
        const inProgressOptometrist = slots.filter((s) =>
          s.status === "optometrist_investigation_in_progress" || s.status === "dilation_in_progress"
        ).length;
        const pendingDoctor = slots.filter((s) =>
          s.status === "optometrist_investigation_completed" ||
          s.status === "awaiting_doctor" ||
          s.status === "doctor_assigned" ||
          s.status === "dilation_completed" ||
          s.status === "scheduled" ||
          s.status === "checked_in"
        ).length;
        const inProgressDoctor = slots.filter((s) =>
          s.status === "in_consultation" || s.status === "consultation_in_progress"
        ).length;
        const todayCompleted = slots.filter((s) =>
          s.status === "consultation_completed" || s.status === "completed"
        ).length;
        const todayNoShow = slots.filter((s) => s.status === "no_show").length;

        state.todayStats = {
          todayTotal: slots.length,
          pendingOptometrist,
          inProgressOptometrist,
          pendingDoctor,
          inProgressDoctor,
          todayCompleted,
          todayNoShow,
          todayPending: pendingDoctor + pendingOptometrist,
          todayInProgress: inProgressDoctor + inProgressOptometrist,
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
