import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { admissionsApi, Admission, CreateAdmissionRequest, DischargeRequest } from "@/services/admissionsApi";

type AdmissionsState = {
  list: Admission[];
  loading: boolean;
  error: string | null;
};

const initialState: AdmissionsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchAdmissions = createAsyncThunk(
  "admissions/fetch",
  async (params: { patient_id?: string; status?: string; ward_id?: string } = {}, { rejectWithValue }) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await admissionsApi.list({
        page: 1,
        page_size: 100,
        patient_id: params?.patient_id,
        status: params?.status as any,
        ward_id: params?.ward_id,
        tenant_id: tenantId || undefined,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const admitPatient = createAsyncThunk(
  "admissions/admit",
  async (payload: CreateAdmissionRequest, { rejectWithValue }) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const admission = await admissionsApi.create(payload, tenantId || undefined);
      return admission;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const dischargePatient = createAsyncThunk(
  "admissions/discharge",
  async ({ admissionId, dischargeData }: { admissionId: string; dischargeData: DischargeRequest }, { rejectWithValue }) => {
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const admission = await admissionsApi.discharge(admissionId, dischargeData, tenantId || undefined);
      return admission;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

const admissionsSlice = createSlice({
  name: "admissions",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdmissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchAdmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = "Failed to fetch admissions";
      })
      .addCase(admitPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(admitPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        state.error = null;
      })
      .addCase(admitPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = "Failed to admit patient";
      })
      .addCase(dischargePatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(dischargePatient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(dischargePatient.rejected, (state, action) => {
        state.loading = false;
        state.error = "Failed to discharge patient";
      });
  },
});

export const { clearError } = admissionsSlice.actions;

export default admissionsSlice.reducer;

