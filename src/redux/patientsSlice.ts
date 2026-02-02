import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Patient } from "@/types";
import { patientsApi, PatientSearchParams, GlobalSearchParams, CreatePatientRequest, UpdatePatientRequest } from "@/services/patientsApi";

type PatientsState = {
  list: Patient[];
  selected?: Patient | null;
  loading: boolean;
  error?: string | null;
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
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
    return {
      patients: patientsApi.mapToPatients(response.items),
      pagination: {
        total: response.total,
        page: response.page,
        page_size: response.page_size,
        total_pages: response.total_pages,
      },
    };
  }
);

export const searchPatients = createAsyncThunk(
  "patients/search",
  async (params: PatientSearchParams | string | GlobalSearchParams) => {
    // Support multiple formats: string (global search), PatientSearchParams, or GlobalSearchParams
    if (typeof params === "string") {
      // Use global search for string queries
      const response = await patientsApi.searchGlobal({ q: params });
      return {
        patients: patientsApi.mapToPatients(response.items),
        pagination: {
          total: response.total,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
        },
      };
    } else if ("q" in params) {
      // Global search with params
      const response = await patientsApi.searchGlobal(params);
      return {
        patients: patientsApi.mapToPatients(response.items),
        pagination: {
          total: response.total,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
        },
      };
    } else {
      // Advanced search
      const response = await patientsApi.search(params);
      return {
        patients: patientsApi.mapToPatients(response.items),
        pagination: {
          total: response.total,
          page: response.page,
          page_size: response.page_size,
          total_pages: response.total_pages,
        },
      };
    }
  }
);

export const addPatient = createAsyncThunk(
  "patients/add",
  async (payload: CreatePatientRequest & { tenantId?: string }, { rejectWithValue }) => {
    try {
      const { tenantId, ...patientData } = payload;
      const apiPatient = await patientsApi.create(patientData, tenantId);
      return patientsApi.mapToPatients([apiPatient])[0];
    } catch (error: any) {
      // Preserve the original error structure for proper error handling
      return rejectWithValue(error);
    }
  }
);

export const updatePatient = createAsyncThunk(
  "patients/update",
  async (payload: { patientId: string; updates: UpdatePatientRequest; tenantId?: string }, { rejectWithValue }) => {
    try {
      const apiPatient = await patientsApi.update(payload.patientId, payload.updates, payload.tenantId);
      return patientsApi.mapToPatients([apiPatient])[0];
    } catch (error: any) {
      // Preserve the original error structure for proper error handling
      return rejectWithValue(error);
    }
  }
);

export const getPatientById = createAsyncThunk(
  "patients/getById",
  async (payload: { patientId: string; tenantId?: string }, { getState }) => {
    // Check if patient is already in cache
    const state = getState() as { patients: PatientsState };
    const cachedPatient = state.patients.list.find((p) => p.id === payload.patientId);

    if (cachedPatient) {
      // Return cached patient without making API call
      return cachedPatient;
    }

    // Patient not in cache, fetch from API
    const apiPatient = await patientsApi.getById(payload.patientId, payload.tenantId);
    return patientsApi.mapToPatients([apiPatient])[0];
  }
);

export const getPatientByUhid = createAsyncThunk(
  "patients/getByUhid",
  async (payload: { uhid: string; tenantId?: string }) => {
    const apiPatient = await patientsApi.getByUhid(payload.uhid, payload.tenantId);
    return patientsApi.mapToPatients([apiPatient])[0];
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
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to fetch patients";
      })
      .addCase(searchPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(searchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Search failed";
      })
      .addCase(addPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        state.selected = action.payload;
        state.error = null;
      })
      .addCase(addPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to create patient";
      })
      .addCase(updatePatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.map((p) =>
          p.id === action.payload.id ? action.payload : p
        );
        state.selected = action.payload;
        state.error = null;
      })
      .addCase(updatePatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to update patient";
      })
      .addCase(getPatientById.fulfilled, (state, action) => {
        // Add to list if not already present
        const existingIndex = state.list.findIndex((p) => p.id === action.payload.id);
        if (existingIndex >= 0) {
          state.list[existingIndex] = action.payload;
        } else {
          state.list.push(action.payload);
        }
        state.selected = action.payload;
      })
      .addCase(getPatientByUhid.fulfilled, (state, action) => {
        // Add to list if not already present
        const existingIndex = state.list.findIndex((p) => p.id === action.payload.id);
        if (existingIndex >= 0) {
          state.list[existingIndex] = action.payload;
        } else {
          state.list.push(action.payload);
        }
        state.selected = action.payload;
      });
  },
});

export const { selectPatient } = patientsSlice.actions;
export default patientsSlice.reducer;

