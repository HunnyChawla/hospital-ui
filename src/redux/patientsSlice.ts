import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Patient } from "@/types";
import { patientsApi, PatientSearchParams } from "@/services/patientsApi";

type PatientsState = {
  list: Patient[];
  selected?: Patient | null;
  loading: boolean;
  error?: string | null;
};

const initialState: PatientsState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchPatients = createAsyncThunk(
  "patients/fetch",
  async (params: PatientSearchParams = {}) => {
    const response = await patientsApi.search(params);
    return patientsApi.mapToPatients(response.items);
  }
);

export const searchPatients = createAsyncThunk(
  "patients/search",
  async (params: PatientSearchParams | string) => {
    // Support both old string format and new params format
    const searchParams: PatientSearchParams =
      typeof params === "string"
        ? { name: params, mobile: params }
        : params;
    
    const response = await patientsApi.search(searchParams);
    return patientsApi.mapToPatients(response.items);
  }
);

export const addPatient = createAsyncThunk(
  "patients/add",
  async (payload: Omit<Patient, "id" | "lastVisit" | "status">) => {
    // TODO: Implement add patient API when available
    // For now, create a temporary patient object
    const newPatient: Patient = {
      ...payload,
      id: `temp-${Date.now()}`,
      lastVisit: new Date().toISOString(),
      status: "Active",
    };
    return newPatient;
  }
);

export const updatePatient = createAsyncThunk(
  "patients/update",
  async (payload: Patient) => {
    // TODO: Implement update patient API when available
    // For now, just return the payload
    return payload;
  }
);

export const removePatient = createAsyncThunk(
  "patients/remove",
  async (id: string) => {
    // TODO: Implement delete patient API when available
    return id;
  }
);

const patientsSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    selectPatient(state, action: PayloadAction<string | null>) {
      state.selected = state.list.find((p) => p.id === action.payload) ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to fetch patients";
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(addPatient.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.selected = action.payload;
      })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.list = state.list.map((p) =>
          p.id === action.payload.id ? action.payload : p
        );
        state.selected = action.payload;
      })
      .addCase(removePatient.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
        state.selected = null;
      });
  },
});

export const { selectPatient } = patientsSlice.actions;
export default patientsSlice.reducer;

