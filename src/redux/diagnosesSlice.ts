import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
    diagnosesApi,
    Diagnosis,
    CreateDiagnosisRequest,
    UpdateDiagnosisRequest,
    DiagnosesSearchParams,
} from "@/services/diagnosesApi";

interface DiagnosesState {
    items: Diagnosis[];
    loading: boolean;
    error: string | null;
    total: number;
    lastQuery: DiagnosesSearchParams | null;
    updatingId: string | null;
    deletingId: string | null;
}

const initialState: DiagnosesState = {
    items: [],
    loading: false,
    error: null,
    total: 0,
    lastQuery: null,
    updatingId: null,
    deletingId: null,
};

export const fetchDiagnoses = createAsyncThunk(
    "diagnoses/fetchDiagnoses",
    async (params: DiagnosesSearchParams) => {
        const response = await diagnosesApi.list(params);
        return { response, params };
    }
);

export const createDiagnosis = createAsyncThunk(
    "diagnoses/createDiagnosis",
    async ({
        diagnosis,
        isGlobal,
        tenantId,
    }: {
        diagnosis: CreateDiagnosisRequest;
        isGlobal?: boolean;
        tenantId?: string;
    }) => {
        return await diagnosesApi.create(diagnosis, isGlobal, tenantId);
    }
);

export const updateDiagnosis = createAsyncThunk(
    "diagnoses/updateDiagnosis",
    async ({
        id,
        updates,
        tenantId,
    }: {
        id: string;
        updates: UpdateDiagnosisRequest;
        tenantId?: string;
    }) => {
        return await diagnosesApi.update(id, updates, tenantId);
    }
);

export const deleteDiagnosis = createAsyncThunk(
    "diagnoses/deleteDiagnosis",
    async ({ id, tenantId }: { id: string; tenantId?: string }) => {
        await diagnosesApi.delete(id, tenantId);
        return id;
    }
);

export const bulkCreateDiagnoses = createAsyncThunk(
    "diagnoses/bulkCreateDiagnoses",
    async ({
        diagnoses,
        isGlobal,
        tenantId,
    }: {
        diagnoses: CreateDiagnosisRequest[];
        isGlobal?: boolean;
        tenantId?: string;
    }) => {
        return await diagnosesApi.bulkCreate(diagnoses, isGlobal, tenantId);
    }
);

const diagnosesSlice = createSlice({
    name: "diagnoses",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch diagnoses
            .addCase(fetchDiagnoses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDiagnoses.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.response.items;
                state.total = action.payload.response.total;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchDiagnoses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch diagnoses";
            })
            // Create diagnosis
            .addCase(createDiagnosis.pending, (state) => {
                state.error = null;
            })
            .addCase(createDiagnosis.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
                state.total += 1;
            })
            .addCase(createDiagnosis.rejected, (state, action) => {
                state.error = action.error.message || "Failed to create diagnosis";
            })
            // Update diagnosis
            .addCase(updateDiagnosis.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(updateDiagnosis.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((item) => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateDiagnosis.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to update diagnosis";
            })
            // Delete diagnosis
            .addCase(deleteDiagnosis.pending, (state, action) => {
                state.deletingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deleteDiagnosis.fulfilled, (state, action) => {
                state.deletingId = null;
                state.items = state.items.filter((item) => item.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteDiagnosis.rejected, (state, action) => {
                state.deletingId = null;
                state.error = action.error.message || "Failed to delete diagnosis";
            })
            // Bulk create diagnoses
            .addCase(bulkCreateDiagnoses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bulkCreateDiagnoses.fulfilled, (state, action) => {
                state.loading = false;
                state.items = [...action.payload, ...state.items];
                state.total += action.payload.length;
            })
            .addCase(bulkCreateDiagnoses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to bulk create diagnoses";
            });
    },
});

export const { clearError } = diagnosesSlice.actions;
export default diagnosesSlice.reducer;
