import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
    symptomsApi,
    Symptom,
    CreateSymptomRequest,
    UpdateSymptomRequest,
    SymptomsSearchParams,
} from "@/services/symptomsApi";

interface SymptomsState {
    items: Symptom[];
    loading: boolean;
    error: string | null;
    total: number;
    lastQuery: SymptomsSearchParams | null;
    updatingId: string | null;
    deletingId: string | null;
}

const initialState: SymptomsState = {
    items: [],
    loading: false,
    error: null,
    total: 0,
    lastQuery: null,
    updatingId: null,
    deletingId: null,
};

export const fetchSymptoms = createAsyncThunk(
    "symptoms/fetchSymptoms",
    async (params: SymptomsSearchParams) => {
        const response = await symptomsApi.list(params);
        return { response, params };
    }
);

export const createSymptom = createAsyncThunk(
    "symptoms/createSymptom",
    async ({
        symptom,
        isGlobal,
        tenantId,
    }: {
        symptom: CreateSymptomRequest;
        isGlobal?: boolean;
        tenantId?: string;
    }) => {
        return await symptomsApi.create(symptom, isGlobal, tenantId);
    }
);

export const updateSymptom = createAsyncThunk(
    "symptoms/updateSymptom",
    async ({
        id,
        updates,
        tenantId,
    }: {
        id: string;
        updates: UpdateSymptomRequest;
        tenantId?: string;
    }) => {
        return await symptomsApi.update(id, updates, tenantId);
    }
);

export const deleteSymptom = createAsyncThunk(
    "symptoms/deleteSymptom",
    async ({ id, tenantId }: { id: string; tenantId?: string }) => {
        await symptomsApi.delete(id, tenantId);
        return id;
    }
);

export const bulkCreateSymptoms = createAsyncThunk(
    "symptoms/bulkCreateSymptoms",
    async ({
        symptoms,
        isGlobal,
        tenantId,
    }: {
        symptoms: CreateSymptomRequest[];
        isGlobal?: boolean;
        tenantId?: string;
    }) => {
        return await symptomsApi.bulkCreate(symptoms, isGlobal, tenantId);
    }
);

const symptomsSlice = createSlice({
    name: "symptoms",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch symptoms
            .addCase(fetchSymptoms.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSymptoms.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.response.items;
                state.total = action.payload.response.total;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchSymptoms.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch symptoms";
            })
            // Create symptom
            .addCase(createSymptom.pending, (state) => {
                state.error = null;
            })
            .addCase(createSymptom.fulfilled, (state, action) => {
                // Ensure uniqueness
                const exists = state.items.some((item) => item.id === action.payload.id);
                if (!exists) {
                    state.items.unshift(action.payload);
                    state.total += 1;
                }
            })
            .addCase(createSymptom.rejected, (state, action) => {
                state.error = action.error.message || "Failed to create symptom";
            })
            // Update symptom
            .addCase(updateSymptom.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(updateSymptom.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((item) => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateSymptom.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to update symptom";
            })
            // Delete symptom
            .addCase(deleteSymptom.pending, (state, action) => {
                state.deletingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deleteSymptom.fulfilled, (state, action) => {
                state.deletingId = null;
                state.items = state.items.filter((item) => item.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteSymptom.rejected, (state, action) => {
                state.deletingId = null;
                state.error = action.error.message || "Failed to delete symptom";
            })
            // Bulk create symptoms
            .addCase(bulkCreateSymptoms.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bulkCreateSymptoms.fulfilled, (state, action) => {
                state.loading = false;
                // Ensure uniqueness when adding bulk items
                const newItems = action.payload.filter(
                    (newItem) => !state.items.some((item) => item.id === newItem.id)
                );
                state.items = [...newItems, ...state.items];
                state.total += newItems.length;
            })
            .addCase(bulkCreateSymptoms.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to bulk create symptoms";
            });
    },
});

export const { clearError } = symptomsSlice.actions;
export default symptomsSlice.reducer;
