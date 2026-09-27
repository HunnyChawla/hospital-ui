import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    vaccinesApi,
    VaccineMaster,
    CreateVaccineMasterRequest,
    UpdateVaccineMasterRequest,
    VaccinesSearchParams,
    BulkVaccinesImportRequest,
} from "@/services/vaccinesApi";

interface VaccinesState {
    items: VaccineMaster[];
    loading: boolean;
    error: string | null;
    total: number;
    lastQuery: VaccinesSearchParams | null;
    updatingId: string | null;
    deletingId: string | null;
}

const initialState: VaccinesState = {
    items: [],
    loading: false,
    error: null,
    total: 0,
    lastQuery: null,
    updatingId: null,
    deletingId: null,
};

export const fetchVaccines = createAsyncThunk(
    "vaccines/fetchVaccines",
    async (params: VaccinesSearchParams, { rejectWithValue }) => {
        try {
            const response = await vaccinesApi.list(params);
            return { response, params };
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const createVaccine = createAsyncThunk(
    "vaccines/createVaccine",
    async (
        {
            vaccine,
            isGlobal,
            tenantId,
        }: {
            vaccine: CreateVaccineMasterRequest;
            isGlobal?: boolean;
            tenantId?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            return await vaccinesApi.create(vaccine, isGlobal, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const updateVaccine = createAsyncThunk(
    "vaccines/updateVaccine",
    async (
        {
            id,
            updates,
            tenantId,
        }: {
            id: string;
            updates: UpdateVaccineMasterRequest;
            tenantId?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            return await vaccinesApi.update(id, updates, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const deleteVaccine = createAsyncThunk(
    "vaccines/deleteVaccine",
    async (
        { id, tenantId }: { id: string; tenantId?: string },
        { rejectWithValue }
    ) => {
        try {
            await vaccinesApi.delete(id, tenantId);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const bulkCreateVaccines = createAsyncThunk(
    "vaccines/bulkCreateVaccines",
    async (
        {
            data,
            isGlobal,
            tenantId,
        }: {
            data: BulkVaccinesImportRequest;
            isGlobal?: boolean;
            tenantId?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            return await vaccinesApi.bulkImport(data, isGlobal, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

const vaccinesSlice = createSlice({
    name: "vaccines",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch vaccines
            .addCase(fetchVaccines.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchVaccines.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.response.items;
                state.total = action.payload.response.total;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchVaccines.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch vaccines";
            })

            // Create vaccine
            .addCase(createVaccine.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createVaccine.fulfilled, (state, action) => {
                state.loading = false;
                state.items.unshift(action.payload);
                state.total += 1;
            })
            .addCase(createVaccine.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to create vaccine";
            })

            // Update vaccine
            .addCase(updateVaccine.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(updateVaccine.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((v) => v.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateVaccine.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to update vaccine";
            })

            // Delete vaccine
            .addCase(deleteVaccine.pending, (state, action) => {
                state.deletingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deleteVaccine.fulfilled, (state, action) => {
                state.deletingId = null;
                state.items = state.items.filter((v) => v.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteVaccine.rejected, (state, action) => {
                state.deletingId = null;
                state.error = action.error.message || "Failed to delete vaccine";
            })

            // Bulk create
            .addCase(bulkCreateVaccines.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bulkCreateVaccines.fulfilled, (state, action) => {
                state.loading = false;
                state.items = [...action.payload, ...state.items];
                state.total += action.payload.length;
            })
            .addCase(bulkCreateVaccines.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to bulk import vaccines";
            });
    },
});

export const { clearError } = vaccinesSlice.actions;
export default vaccinesSlice.reducer;
