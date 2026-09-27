import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    bodyPartsApi,
    BodyPart,
    CreateBodyPartRequest,
    UpdateBodyPartRequest,
    BodyPartsSearchParams,
} from "@/services/bodyPartsApi";

interface BodyPartsState {
    items: BodyPart[];
    loading: boolean;
    error: string | null;
    total: number;
    lastQuery: BodyPartsSearchParams | null;
    updatingId: string | null;
    deletingId: string | null;
}

const initialState: BodyPartsState = {
    items: [],
    loading: false,
    error: null,
    total: 0,
    lastQuery: null,
    updatingId: null,
    deletingId: null,
};

export const fetchBodyParts = createAsyncThunk(
    "bodyParts/fetchBodyParts",
    async (params: BodyPartsSearchParams, { rejectWithValue }) => {
        try {
            const response = await bodyPartsApi.list(params);
            return { response, params };
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const createBodyPart = createAsyncThunk(
    "bodyParts/createBodyPart",
    async (
        {
            bodyPart,
            isGlobal,
            tenantId,
        }: {
            bodyPart: CreateBodyPartRequest;
            isGlobal?: boolean;
            tenantId?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            return await bodyPartsApi.create(bodyPart, isGlobal, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const updateBodyPart = createAsyncThunk(
    "bodyParts/updateBodyPart",
    async (
        {
            id,
            updates,
            tenantId,
        }: {
            id: string;
            updates: UpdateBodyPartRequest;
            tenantId?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            return await bodyPartsApi.update(id, updates, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const deactivateBodyPart = createAsyncThunk(
    "bodyParts/deactivateBodyPart",
    async ({ id, tenantId }: { id: string; tenantId?: string }, { rejectWithValue }) => {
        try {
            return await bodyPartsApi.deactivate(id, tenantId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

export const deleteBodyPart = createAsyncThunk(
    "bodyParts/deleteBodyPart",
    async ({ id, tenantId }: { id: string; tenantId?: string }, { rejectWithValue }) => {
        try {
            await bodyPartsApi.delete(id, tenantId);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error);
        }
    }
);

const bodyPartsSlice = createSlice({
    name: "bodyParts",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch body parts
            .addCase(fetchBodyParts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBodyParts.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.response.items;
                state.total = action.payload.response.total;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchBodyParts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch body parts";
            })
            // Create body part
            .addCase(createBodyPart.pending, (state) => {
                state.error = null;
            })
            .addCase(createBodyPart.fulfilled, (state, action) => {
                const exists = state.items.some((item) => item.id === action.payload.id);
                if (!exists) {
                    state.items.unshift(action.payload);
                    state.total += 1;
                }
            })
            .addCase(createBodyPart.rejected, (state, action) => {
                state.error = action.error.message || "Failed to create body part";
            })
            // Update body part
            .addCase(updateBodyPart.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(updateBodyPart.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((item) => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateBodyPart.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to update body part";
            })
            // Deactivate body part
            .addCase(deactivateBodyPart.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deactivateBodyPart.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((item) => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(deactivateBodyPart.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to deactivate body part";
            })
            // Delete body part
            .addCase(deleteBodyPart.pending, (state, action) => {
                state.deletingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deleteBodyPart.fulfilled, (state, action) => {
                state.deletingId = null;
                state.items = state.items.filter((item) => item.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteBodyPart.rejected, (state, action) => {
                state.deletingId = null;
                state.error = action.error.message || "Failed to delete body part";
            });
    },
});

export const { clearError } = bodyPartsSlice.actions;
export default bodyPartsSlice.reducer;
