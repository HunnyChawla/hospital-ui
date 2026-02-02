import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    advicesApi,
    Advice,
    CreateAdviceRequest,
    UpdateAdviceRequest,
    AdvicesSearchParams,
} from "@/services/advicesApi";

interface AdvicesState {
    items: Advice[];
    loading: boolean;
    error: string | null;
    total: number;
    lastQuery: AdvicesSearchParams | null;
    updatingId: string | null;
    deletingId: string | null;
}

const initialState: AdvicesState = {
    items: [],
    loading: false,
    error: null,
    total: 0,
    lastQuery: null,
    updatingId: null,
    deletingId: null,
};

export const fetchAdvices = createAsyncThunk(
    "advices/fetchAdvices",
    async (params: AdvicesSearchParams) => {
        const response = await advicesApi.list(params);
        return { response, params };
    }
);

export const createAdvice = createAsyncThunk(
    "advices/createAdvice",
    async ({
        advice,
        tenantId,
    }: {
        advice: CreateAdviceRequest;
        tenantId?: string;
    }) => {
        return await advicesApi.create(advice, tenantId);
    }
);

export const updateAdvice = createAsyncThunk(
    "advices/updateAdvice",
    async ({
        id,
        updates,
        tenantId,
    }: {
        id: string;
        updates: UpdateAdviceRequest;
        tenantId?: string;
    }) => {
        return await advicesApi.update(id, updates, tenantId);
    }
);

export const deleteAdvice = createAsyncThunk(
    "advices/deleteAdvice",
    async ({ id, tenantId }: { id: string; tenantId?: string }) => {
        await advicesApi.delete(id, tenantId);
        return id;
    }
);

export const bulkCreateAdvices = createAsyncThunk(
    "advices/bulkCreateAdvices",
    async ({
        advices,
        tenantId,
    }: {
        advices: CreateAdviceRequest[];
        tenantId?: string;
    }) => {
        return await advicesApi.bulkCreate(advices, tenantId);
    }
);

const advicesSlice = createSlice({
    name: "advices",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch advices
            .addCase(fetchAdvices.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAdvices.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.response.items;
                state.total = action.payload.response.total;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchAdvices.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch advices";
            })
            // Create advice
            .addCase(createAdvice.pending, (state) => {
                state.error = null;
            })
            .addCase(createAdvice.fulfilled, (state, action) => {
                // Ensure uniqueness
                const exists = state.items.some((item) => item.id === action.payload.id);
                if (!exists) {
                    state.items.unshift(action.payload);
                    state.total += 1;
                }
            })
            .addCase(createAdvice.rejected, (state, action) => {
                state.error = action.error.message || "Failed to create advice";
            })
            // Update advice
            .addCase(updateAdvice.pending, (state, action) => {
                state.updatingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(updateAdvice.fulfilled, (state, action) => {
                state.updatingId = null;
                const index = state.items.findIndex((item) => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateAdvice.rejected, (state, action) => {
                state.updatingId = null;
                state.error = action.error.message || "Failed to update advice";
            })
            // Delete advice
            .addCase(deleteAdvice.pending, (state, action) => {
                state.deletingId = action.meta.arg.id;
                state.error = null;
            })
            .addCase(deleteAdvice.fulfilled, (state, action) => {
                state.deletingId = null;
                state.items = state.items.filter((item) => item.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteAdvice.rejected, (state, action) => {
                state.deletingId = null;
                state.error = action.error.message || "Failed to delete advice";
            })
            // Bulk create advices
            .addCase(bulkCreateAdvices.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bulkCreateAdvices.fulfilled, (state, action) => {
                state.loading = false;
                // Ensure uniqueness when adding bulk items
                const newItems = action.payload.filter(
                    (newItem) => !state.items.some((item) => item.id === newItem.id)
                );
                state.items = [...newItems, ...state.items];
                state.total += newItems.length;
            })
            .addCase(bulkCreateAdvices.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to bulk create advices";
            });
    },
});

export const { clearError } = advicesSlice.actions;
export default advicesSlice.reducer;
