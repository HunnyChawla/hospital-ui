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
  | "vision"
  | "current_specs"
  | "medical_history"
  | "ophthalmic_history"
  | "allergies"
  | "ar_data"
  | "refraction"
  | "iop"
  | "previous_history";

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

        // Calculate today's stats from schedule with OPD status support
        const slots = action.payload.slots;
        const sentToDoctor = slots.filter(
          (s) => s.status === "optometrist_investigation_completed" || s.status === "awaiting_doctor" || s.status === "doctor_assigned" || s.status === "consultation_in_progress" || s.status === "completed"
        ).length;
        state.todayStats = {
          todayTotal: slots.length,
          todayPending: slots.filter(
            (s) => s.status === "awaiting_optometrist" || s.status === "optometrist_assigned" || s.status === "scheduled" || s.status === "checked_in" || s.status === "waiting"
          ).length,
          todayInProgress: slots.filter(
            (s) => s.status === "optometrist_investigation_in_progress" || s.status === "dilation_in_progress" || s.status === "in_consultation"
          ).length,
          sentToDoctor,
          todayCompleted: sentToDoctor,
          todayNoShow: slots.filter(
            (s) => s.status === "no_show" || s.status === "cancelled"
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
        const page = action.meta.arg.page || 1;
        if (page > 1 && state.patientOptometryHistory) {
          const currentItems = (state.patientOptometryHistory as any).items || [];
          const newItems = (action.payload as any).items || [];
          state.patientOptometryHistory = {
            ...action.payload,
            items: [...currentItems, ...newItems],
          } as any;
        } else {
          state.patientOptometryHistory = action.payload;
        }
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
