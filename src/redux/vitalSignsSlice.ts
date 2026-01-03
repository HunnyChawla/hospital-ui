import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  vitalSignsApi,
  CreateVitalSignsRequest,
  UpdateVitalSignsRequest,
  VitalSignsListParams,
} from "@/services/vitalSignsApi";
import { VitalSigns, VitalSignsTrend } from "@/types";

type VitalSignsState = {
  currentPatientVitals: VitalSigns[];
  trends: VitalSignsTrend[];
  selectedVitalSigns: VitalSigns | null;
  loading: boolean;
  error: string | null;
};

const initialState: VitalSignsState = {
  currentPatientVitals: [],
  trends: [],
  selectedVitalSigns: null,
  loading: false,
  error: null,
};

export const fetchVitalSignsForPatient = createAsyncThunk(
  "vitalSigns/fetchForPatient",
  async (params: VitalSignsListParams, { rejectWithValue }) => {
    try {
      const result = await vitalSignsApi.list(params);
      return result.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchVitalSignsTrends = createAsyncThunk(
  "vitalSigns/fetchTrends",
  async (
    params: { patient_id: string; days?: number },
    { rejectWithValue }
  ) => {
    try {
      const trends = await vitalSignsApi.getTrends(params);
      return trends;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addVitalSigns = createAsyncThunk(
  "vitalSigns/add",
  async (data: CreateVitalSignsRequest, { rejectWithValue }) => {
    try {
      const vitalSigns = await vitalSignsApi.create(data);
      return vitalSigns;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateVitalSigns = createAsyncThunk(
  "vitalSigns/update",
  async (
    payload: { id: string; data: UpdateVitalSignsRequest },
    { rejectWithValue }
  ) => {
    try {
      const updated = await vitalSignsApi.update(payload.id, payload.data);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteVitalSigns = createAsyncThunk(
  "vitalSigns/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await vitalSignsApi.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const vitalSignsSlice = createSlice({
  name: "vitalSigns",
  initialState,
  reducers: {
    setSelectedVitalSigns: (state, action: PayloadAction<VitalSigns | null>) => {
      state.selectedVitalSigns = action.payload;
    },
    clearVitalSigns: (state) => {
      state.currentPatientVitals = [];
      state.trends = [];
      state.selectedVitalSigns = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vital signs for patient
      .addCase(fetchVitalSignsForPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVitalSignsForPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPatientVitals = action.payload;
        state.error = null;
      })
      .addCase(fetchVitalSignsForPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch vital signs";
      })
      // Fetch trends
      .addCase(fetchVitalSignsTrends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVitalSignsTrends.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure trends is always an array
        state.trends = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchVitalSignsTrends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch trends";
      })
      // Add vital signs
      .addCase(addVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addVitalSigns.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPatientVitals.unshift(action.payload);
        state.error = null;
      })
      .addCase(addVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to add vital signs";
      })
      // Update vital signs
      .addCase(updateVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVitalSigns.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.currentPatientVitals.findIndex(
          (v) => v.id === action.payload.id
        );
        if (index !== -1) {
          state.currentPatientVitals[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to update vital signs";
      })
      // Delete vital signs
      .addCase(deleteVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVitalSigns.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPatientVitals = state.currentPatientVitals.filter(
          (v) => v.id !== action.payload
        );
        state.error = null;
      })
      .addCase(deleteVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to delete vital signs";
      });
  },
});

export const { setSelectedVitalSigns, clearVitalSigns } = vitalSignsSlice.actions;
export default vitalSignsSlice.reducer;
