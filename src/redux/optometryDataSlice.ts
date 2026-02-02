import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { refractionApi, CreateRefractionRequest, UpdateRefractionRequest } from "@/services/refractionApi";
import { iopApi, CreateIOPRequest, UpdateIOPRequest } from "@/services/iopApi";
import { arDataApi, CreateARDataRequest } from "@/services/arDataApi";
import { complaintsApi, CreateComplaintRequest } from "@/services/complaintsApi";
import { medicalHistoryApi, UpsertMedicalHistoryRequest } from "@/services/medicalHistoryApi";
import { ophthalmicHistoryApi, CreateOphthalmicSurgeryRequest } from "@/services/ophthalmicHistoryApi";
import { drugAllergyApi, CreateDrugAllergyRequest } from "@/services/drugAllergyApi";
import { optometryMedicalConditionsApi, CreateMedicalConditionRequest, UpdateMedicalConditionRequest } from "@/services/optometryMedicalConditionsApi";
import { visionApi, CreateVisionRequest } from "@/services/visionApi";
import { currentSpecsApi, CreateCurrentSpecsRequest, UpdateCurrentSpecsRequest } from "@/services/currentSpecsApi";
import type {
  RefractionRecord,
  IOPRecord,
  IOPTrend,
  ARDataRecord,
  ComplaintRecord,
  MedicalHistoryRecord,
  MedicalConditionRecord,
  OphthalmicSurgeryRecord,

  DrugAllergyRecord,
  VisionRecord,
  CurrentSpecsRecord,
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
  // Medical history (legacy)
  medicalHistory: MedicalHistoryRecord | null;
  // Medical conditions (new API - array of condition records)
  medicalConditions: MedicalConditionRecord[];
  // Ophthalmic surgery history
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  // Drug allergies
  drugAllergies: DrugAllergyRecord[];
  // Vision Records
  visionRecords: VisionRecord[];
  // Current Specs
  currentSpecsRecords: CurrentSpecsRecord[];
  // Loading states
  loading: {
    refraction: boolean;
    iop: boolean;
    arData: boolean;
    complaints: boolean;
    medicalHistory: boolean;
    medicalConditions: boolean;
    ophthalmicHistory: boolean;

    drugAllergies: boolean;
    vision: boolean;
    currentSpecs: boolean;
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
  medicalConditions: [],
  ophthalmicHistory: [],
  drugAllergies: [],
  visionRecords: [],
  currentSpecsRecords: [],
  loading: {
    refraction: false,
    iop: false,
    arData: false,
    complaints: false,
    medicalHistory: false,
    medicalConditions: false,
    ophthalmicHistory: false,
    drugAllergies: false,
    vision: false,
    currentSpecs: false,
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

export const updateRefractionRecord = createAsyncThunk(
  "optometryData/updateRefractionRecord",
  async (params: { id: string; data: UpdateRefractionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await refractionApi.update(params.id, params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateRefractionCombinedRecord = createAsyncThunk(
  "optometryData/updateRefractionCombinedRecord",
  async (params: { id: string; data: CreateRefractionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await refractionApi.updateCombined(params.id, params.data, params.tenant_id);
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

export const updateIOPRecord = createAsyncThunk(
  "optometryData/updateIOPRecord",
  async (params: { id: string; data: UpdateIOPRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await iopApi.update(params.id, params.data, params.tenant_id);
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

export const updateARData = createAsyncThunk(
  "optometryData/updateARData",
  async (params: { id: string; data: CreateARDataRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await arDataApi.update(params.id, params.data, params.tenant_id);
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
// MEDICAL CONDITIONS THUNKS (New API)
// ============================================

export const fetchMedicalConditions = createAsyncThunk(
  "optometryData/fetchMedicalConditions",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const conditions = await optometryMedicalConditionsApi.list(
        { patient_id: params.patient_id },
        params.tenant_id
      );
      return conditions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addMedicalCondition = createAsyncThunk(
  "optometryData/addMedicalCondition",
  async (params: { data: CreateMedicalConditionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const condition = await optometryMedicalConditionsApi.create(params.data, params.tenant_id);
      return condition;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateMedicalCondition = createAsyncThunk(
  "optometryData/updateMedicalCondition",
  async (params: { id: string; data: UpdateMedicalConditionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const condition = await optometryMedicalConditionsApi.update(params.id, params.data, params.tenant_id);
      return condition;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteMedicalCondition = createAsyncThunk(
  "optometryData/deleteMedicalCondition",
  async (params: { id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      await optometryMedicalConditionsApi.delete(params.id, params.tenant_id);
      return params.id;
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
// VISION THUNKS
// ============================================

export const fetchVisionData = createAsyncThunk(
  "optometryData/fetchVisionData",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await visionApi.getByPatient(params.patient_id, {
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

export const addVisionRecord = createAsyncThunk(
  "optometryData/addVisionRecord",
  async (params: { data: CreateVisionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await visionApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateVisionRecord = createAsyncThunk(
  "optometryData/updateVisionRecord",
  async (params: { id: string; data: CreateVisionRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await visionApi.update(params.id, params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================================
// CURRENT SPECS THUNKS
// ============================================

export const fetchCurrentSpecs = createAsyncThunk(
  "optometryData/fetchCurrentSpecs",
  async (params: { patient_id: string; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const response = await currentSpecsApi.getByPatient(params.patient_id, {
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

export const addCurrentSpecs = createAsyncThunk(
  "optometryData/addCurrentSpecs",
  async (params: { data: CreateCurrentSpecsRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await currentSpecsApi.create(params.data, params.tenant_id);
      return record;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateCurrentSpecs = createAsyncThunk(
  "optometryData/updateCurrentSpecs",
  async (params: { id: string; data: UpdateCurrentSpecsRequest; tenant_id?: string }, { rejectWithValue }) => {
    try {
      const record = await currentSpecsApi.update(params.id, params.data, params.tenant_id);
      return record;
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
      state.visionRecords = [];
      state.currentSpecsRecords = [];
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
        const payload: any = action.payload as any;
        // If backend returns a single per-eye record, append it; otherwise (combined response), rely on refresh
        if (payload && typeof payload === "object" && "eye" in payload) {
          state.refractionRecords.unshift(payload);
        }
      })
      .addCase(updateRefractionRecord.fulfilled, (state, action) => {
        const idx = state.refractionRecords.findIndex((r) => r.id === (action.payload as any).id);
        if (idx >= 0) {
          state.refractionRecords[idx] = action.payload as any;
        } else {
          state.refractionRecords.unshift(action.payload as any);
        }
      })
      .addCase(updateRefractionCombinedRecord.fulfilled, (state, action) => {
        const idx = state.refractionRecords.findIndex((r) => r.id === (action.payload as any).id);
        if (idx >= 0) {
          state.refractionRecords[idx] = action.payload as any;
        } else {
          state.refractionRecords.unshift(action.payload as any);
        }
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
      .addCase(updateIOPRecord.fulfilled, (state, action) => {
        const idx = state.iopRecords.findIndex((r) => r.id === (action.payload as any).id);
        if (idx >= 0) {
          state.iopRecords[idx] = action.payload as any;
        } else {
          state.iopRecords.unshift(action.payload as any);
        }
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
      .addCase(updateARData.fulfilled, (state, action) => {
        const idx = state.arDataRecords.findIndex((r) => r.id === (action.payload as any).id);
        if (idx >= 0) {
          state.arDataRecords[idx] = action.payload as any;
        } else {
          state.arDataRecords.unshift(action.payload as any);
        }
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
      // .addCase(fetchMedicalHistory.pending, (state) => {
      //   state.loading.medicalHistory = true;
      // })
      // .addCase(fetchMedicalHistory.fulfilled, (state, action) => {
      //   state.loading.medicalHistory = false;
      //   state.medicalHistory = action.payload;
      // })
      // .addCase(fetchMedicalHistory.rejected, (state, action) => {
      //   state.loading.medicalHistory = false;
      //   state.error = action.payload as string;
      // })
      // .addCase(updateMedicalHistory.fulfilled, (state, action) => {
      //   state.medicalHistory = action.payload;
      // })
      // Medical Conditions (New API)
      .addCase(fetchMedicalConditions.pending, (state) => {
        state.loading.medicalConditions = true;
      })
      .addCase(fetchMedicalConditions.fulfilled, (state, action) => {
        state.loading.medicalConditions = false;
        const payload = action.payload as any;
        if (Array.isArray(payload)) {
          state.medicalConditions = payload;
        } else if (payload && Array.isArray(payload.items)) {
          state.medicalConditions = payload.items;
        } else if (payload && Array.isArray(payload.data)) {
          state.medicalConditions = payload.data;
        } else {
          state.medicalConditions = [];
        }
      })
      .addCase(fetchMedicalConditions.rejected, (state, action) => {
        state.loading.medicalConditions = false;
        state.error = action.payload as string;
      })
      .addCase(addMedicalCondition.fulfilled, (state, action) => {
        if (Array.isArray(state.medicalConditions)) {
          state.medicalConditions.unshift(action.payload);
        } else {
          state.medicalConditions = [action.payload];
        }
      })
      .addCase(updateMedicalCondition.fulfilled, (state, action) => {
        if (Array.isArray(state.medicalConditions)) {
          const index = state.medicalConditions.findIndex((c) => c.id === action.payload.id);
          if (index !== -1) {
            state.medicalConditions[index] = action.payload;
          }
        }
      })
      .addCase(deleteMedicalCondition.fulfilled, (state, action) => {
        if (Array.isArray(state.medicalConditions)) {
          state.medicalConditions = state.medicalConditions.filter((c) => c.id !== action.payload);
        }
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
      })
      // Vision
      .addCase(fetchVisionData.pending, (state) => {
        state.loading.vision = true;
      })
      .addCase(fetchVisionData.fulfilled, (state, action) => {
        state.loading.vision = false;
        state.visionRecords = action.payload;
      })
      .addCase(fetchVisionData.rejected, (state, action) => {
        state.loading.vision = false;
        state.error = action.payload as string;
      })
      .addCase(addVisionRecord.fulfilled, (state, action) => {
        state.visionRecords.unshift(action.payload);
      })
      .addCase(updateVisionRecord.fulfilled, (state, action) => {
        const idx = state.visionRecords.findIndex((r) => r.id === action.payload.id);
        if (idx >= 0) {
          state.visionRecords[idx] = action.payload;
        } else {
          state.visionRecords.unshift(action.payload);
        }
      })
      // Current Specs
      .addCase(fetchCurrentSpecs.pending, (state) => {
        state.loading.currentSpecs = true;
      })
      .addCase(fetchCurrentSpecs.fulfilled, (state, action) => {
        state.loading.currentSpecs = false;
        state.currentSpecsRecords = action.payload;
      })
      .addCase(fetchCurrentSpecs.rejected, (state, action) => {
        state.loading.currentSpecs = false;
        state.error = action.payload as string;
      })
      .addCase(addCurrentSpecs.fulfilled, (state, action) => {
        state.currentSpecsRecords.unshift(action.payload);
      })
      .addCase(updateCurrentSpecs.fulfilled, (state, action) => {
        const idx = state.currentSpecsRecords.findIndex((r) => r.id === action.payload.id);
        if (idx >= 0) {
          state.currentSpecsRecords[idx] = action.payload;
        }
      });
  },
});

export const { clearOptometryData } = optometryDataSlice.actions;

export default optometryDataSlice.reducer;
