import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { refractionApi, CreateRefractionRequest } from "@/services/refractionApi";
import { iopApi, CreateIOPRequest } from "@/services/iopApi";
import { arDataApi, CreateARDataRequest } from "@/services/arDataApi";
import { complaintsApi, CreateComplaintRequest } from "@/services/complaintsApi";
import { medicalHistoryApi, UpsertMedicalHistoryRequest } from "@/services/medicalHistoryApi";
import { ophthalmicHistoryApi, CreateOphthalmicSurgeryRequest } from "@/services/ophthalmicHistoryApi";
import { drugAllergyApi, CreateDrugAllergyRequest } from "@/services/drugAllergyApi";
import type {
  RefractionRecord,
  IOPRecord,
  IOPTrend,
  ARDataRecord,
  ComplaintRecord,
  MedicalHistoryRecord,
  OphthalmicSurgeryRecord,
  DrugAllergyRecord,
} from "@/types";

type OptometryDataState = {
  // Refraction data
  refractionRecords: RefractionRecord[];
  // IOP data
  iopRecords: IOPRecord[];
  iopTrends: IOPTrend[];
  // AR data
  arDataRecords: ARDataRecord[];
  // Complaints
  complaints: ComplaintRecord[];
  // Medical history
  medicalHistory: MedicalHistoryRecord | null;
  // Ophthalmic surgery history
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  // Drug allergies
  drugAllergies: DrugAllergyRecord[];
  // Loading states
  loading: {
    refraction: boolean;
    iop: boolean;
    arData: boolean;
    complaints: boolean;
    medicalHistory: boolean;
    ophthalmicHistory: boolean;
    drugAllergies: boolean;
  };
  error: string | null;
};

const initialState: OptometryDataState = {
  refractionRecords: [],
  iopRecords: [],
  iopTrends: [],
  arDataRecords: [],
  complaints: [],
  medicalHistory: null,
  ophthalmicHistory: [],
  drugAllergies: [],
  loading: {
    refraction: false,
    iop: false,
    arData: false,
    complaints: false,
    medicalHistory: false,
    ophthalmicHistory: false,
    drugAllergies: false,
  },
  error: null,
};

// ============================================
// REFRACTION THUNKS
// ============================================

export const fetchRefractionData = createAsyncThunk(
  "optometryData/fetchRefractionData",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await refractionApi.getByPatient(params.patient_id, {
        page: 1,
        page_size: 100,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addRefractionRecord = createAsyncThunk(
  "optometryData/addRefractionRecord",
  async (params: { data: CreateRefractionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await refractionApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// IOP THUNKS
// ============================================

export const fetchIOPRecords = createAsyncThunk(
  "optometryData/fetchIOPRecords",
  async (params: { patient_id: string; days?: number; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await iopApi.getByPatient(params.patient_id, {
        days: params.days,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addIOPRecord = createAsyncThunk(
  "optometryData/addIOPRecord",
  async (params: { data: CreateIOPRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await iopApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchIOPTrends = createAsyncThunk(
  "optometryData/fetchIOPTrends",
  async (params: { patient_id: string; days?: number; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const trends = await iopApi.getTrends(params.patient_id, params.days || 180, params.tenant_id);
      return trends;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// AR DATA THUNKS
// ============================================

export const fetchARData = createAsyncThunk(
  "optometryData/fetchARData",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await arDataApi.getByPatient(params.patient_id, {
        page: 1,
        page_size: 100,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addARData = createAsyncThunk(
  "optometryData/addARData",
  async (params: { data: CreateARDataRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await arDataApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// COMPLAINTS THUNKS
// ============================================

export const fetchComplaints = createAsyncThunk(
  "optometryData/fetchComplaints",
  async (params: { patient_id?: string; visit_id?: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      // Use visit-specific endpoint if visit_id is provided
      if (params.visit_id) {
        const response = await complaintsApi.getByVisit(params.visit_id, params.tenant_id);
        return response.items;
      }

      // Otherwise use general list endpoint
      const response = await complaintsApi.list({
        patient_id: params.patient_id,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addComplaint = createAsyncThunk(
  "optometryData/addComplaint",
  async (params: { data: CreateComplaintRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await complaintsApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteComplaint = createAsyncThunk(
  "optometryData/deleteComplaint",
  async (params: { id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      await complaintsApi.delete(params.id, params.tenant_id);
      return params.id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// MEDICAL HISTORY THUNKS
// ============================================

export const fetchMedicalHistory = createAsyncThunk(
  "optometryData/fetchMedicalHistory",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const history = await medicalHistoryApi.get(params.patient_id, params.tenant_id);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateMedicalHistory = createAsyncThunk(
  "optometryData/updateMedicalHistory",
  async (params: { data: UpsertMedicalHistoryRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const history = await medicalHistoryApi.upsert(params.data, params.tenant_id);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// OPHTHALMIC HISTORY THUNKS
// ============================================

export const fetchOphthalmicHistory = createAsyncThunk(
  "optometryData/fetchOphthalmicHistory",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await ophthalmicHistoryApi.list({
        patient_id: params.patient_id,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addOphthalmicSurgery = createAsyncThunk(
  "optometryData/addOphthalmicSurgery",
  async (params: { data: CreateOphthalmicSurgeryRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await ophthalmicHistoryApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteOphthalmicSurgery = createAsyncThunk(
  "optometryData/deleteOphthalmicSurgery",
  async (params: { id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      await ophthalmicHistoryApi.delete(params.id, params.tenant_id);
      return params.id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// DRUG ALLERGIES THUNKS
// ============================================

export const fetchDrugAllergies = createAsyncThunk(
  "optometryData/fetchDrugAllergies",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await drugAllergyApi.list({
        patient_id: params.patient_id,
        tenant_id: params.tenant_id,
      });
      return response.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addDrugAllergy = createAsyncThunk(
  "optometryData/addDrugAllergy",
  async (params: { data: CreateDrugAllergyRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await drugAllergyApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteDrugAllergy = createAsyncThunk(
  "optometryData/deleteDrugAllergy",
  async (params: { id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      await drugAllergyApi.delete(params.id, params.tenant_id);
      return params.id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// SLICE
// ============================================

const optometryDataSlice = createSlice({
  name: "optometryData",
  initialState,
  reducers: {
    clearOptometryData: (state) => {
      state.refractionRecords = [];
      state.iopRecords = [];
      state.iopTrends = [];
      state.arDataRecords = [];
      state.complaints = [];
      state.medicalHistory = null;
      state.ophthalmicHistory = [];
      state.drugAllergies = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Refraction
      .addCase(fetchRefractionData.pending, (state) => {
        state.loading.refraction = true;
      })
      .addCase(fetchRefractionData.fulfilled, (state, action) => {
        state.loading.refraction = false;
        state.refractionRecords = action.payload;
      })
      .addCase(fetchRefractionData.rejected, (state, action) => {
        state.loading.refraction = false;
        state.error = action.payload as string;
      })
      .addCase(addRefractionRecord.fulfilled, (state, action) => {
        state.refractionRecords.unshift(action.payload);
      })
      // IOP
      .addCase(fetchIOPRecords.pending, (state) => {
        state.loading.iop = true;
      })
      .addCase(fetchIOPRecords.fulfilled, (state, action) => {
        state.loading.iop = false;
        state.iopRecords = action.payload;
      })
      .addCase(fetchIOPRecords.rejected, (state, action) => {
        state.loading.iop = false;
        state.error = action.payload as string;
      })
      .addCase(addIOPRecord.fulfilled, (state, action) => {
        state.iopRecords.unshift(action.payload);
      })
      .addCase(fetchIOPTrends.fulfilled, (state, action) => {
        state.iopTrends = action.payload;
      })
      // AR Data
      .addCase(fetchARData.pending, (state) => {
        state.loading.arData = true;
      })
      .addCase(fetchARData.fulfilled, (state, action) => {
        state.loading.arData = false;
        state.arDataRecords = action.payload;
      })
      .addCase(fetchARData.rejected, (state, action) => {
        state.loading.arData = false;
        state.error = action.payload as string;
      })
      .addCase(addARData.fulfilled, (state, action) => {
        state.arDataRecords.unshift(action.payload);
      })
      // Complaints
      .addCase(fetchComplaints.pending, (state) => {
        state.loading.complaints = true;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading.complaints = false;
        state.complaints = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading.complaints = false;
        state.error = action.payload as string;
      })
      .addCase(addComplaint.fulfilled, (state, action) => {
        state.complaints.unshift(action.payload);
      })
      .addCase(deleteComplaint.fulfilled, (state, action) => {
        state.complaints = state.complaints.filter((c) => c.id !== action.payload);
      })
      // Medical History
      .addCase(fetchMedicalHistory.pending, (state) => {
        state.loading.medicalHistory = true;
      })
      .addCase(fetchMedicalHistory.fulfilled, (state, action) => {
        state.loading.medicalHistory = false;
        state.medicalHistory = action.payload;
      })
      .addCase(fetchMedicalHistory.rejected, (state, action) => {
        state.loading.medicalHistory = false;
        state.error = action.payload as string;
      })
      .addCase(updateMedicalHistory.fulfilled, (state, action) => {
        state.medicalHistory = action.payload;
      })
      // Ophthalmic History
      .addCase(fetchOphthalmicHistory.pending, (state) => {
        state.loading.ophthalmicHistory = true;
      })
      .addCase(fetchOphthalmicHistory.fulfilled, (state, action) => {
        state.loading.ophthalmicHistory = false;
        state.ophthalmicHistory = action.payload;
      })
      .addCase(fetchOphthalmicHistory.rejected, (state, action) => {
        state.loading.ophthalmicHistory = false;
        state.error = action.payload as string;
      })
      .addCase(addOphthalmicSurgery.fulfilled, (state, action) => {
        state.ophthalmicHistory.unshift(action.payload);
      })
      .addCase(deleteOphthalmicSurgery.fulfilled, (state, action) => {
        state.ophthalmicHistory = state.ophthalmicHistory.filter((s) => s.id !== action.payload);
      })
      // Drug Allergies
      .addCase(fetchDrugAllergies.pending, (state) => {
        state.loading.drugAllergies = true;
      })
      .addCase(fetchDrugAllergies.fulfilled, (state, action) => {
        state.loading.drugAllergies = false;
        state.drugAllergies = action.payload;
      })
      .addCase(fetchDrugAllergies.rejected, (state, action) => {
        state.loading.drugAllergies = false;
        state.error = action.payload as string;
      })
      .addCase(addDrugAllergy.fulfilled, (state, action) => {
        state.drugAllergies.unshift(action.payload);
      })
      .addCase(deleteDrugAllergy.fulfilled, (state, action) => {
        state.drugAllergies = state.drugAllergies.filter((a) => a.id !== action.payload);
      });
  },
});

export const { clearOptometryData } = optometryDataSlice.actions;

export default optometryDataSlice.reducer;
