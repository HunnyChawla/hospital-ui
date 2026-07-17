import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  medicinesApi,
  Medicine,
  CreateMedicineRequest,
  UpdateMedicineRequest,
  MedicinesSearchParams,
} from "@/services/medicinesApi";

interface MedicinesState {
  items: Medicine[];
  loading: boolean;
  error: string | null;
  total: number;
  lastQuery: MedicinesSearchParams | null;
  updatingId: string | null;
  deletingId: string | null;
}

const initialState: MedicinesState = {
  items: [],
  loading: false,
  error: null,
  total: 0,
  lastQuery: null,
  updatingId: null,
  deletingId: null,
};

export const fetchMedicines = createAsyncThunk(
  "medicines/fetchMedicines",
  async (params: MedicinesSearchParams) => {
    const response = params.q
      ? await medicinesApi.search(params)
      : await medicinesApi.list(params);
    return { response, params };
  }
);

export const createMedicine = createAsyncThunk(
  "medicines/createMedicine",
  async ({
    medicine,
    tenantId,
  }: {
    medicine: CreateMedicineRequest;
    tenantId?: string;
  }) => {
    return await medicinesApi.create(medicine, tenantId);
  }
);

export const updateMedicine = createAsyncThunk(
  "medicines/updateMedicine",
  async ({
    id,
    updates,
    tenantId,
  }: {
    id: string;
    updates: UpdateMedicineRequest;
    tenantId?: string;
  }) => {
    return await medicinesApi.update(id, updates, tenantId);
  }
);

export const deleteMedicine = createAsyncThunk(
  "medicines/deleteMedicine",
  async ({ id, tenantId }: { id: string; tenantId?: string }) => {
    await medicinesApi.delete(id, tenantId);
    return id;
  }
);

const medicinesSlice = createSlice({
  name: "medicines",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medicines
      .addCase(fetchMedicines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedicines.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.response.items;
        state.total = action.payload.response.total;
        state.lastQuery = action.payload.params;
      })
      .addCase(fetchMedicines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch medicines";
      })
      // Create medicine
      .addCase(createMedicine.pending, (state) => {
        state.error = null;
      })
      .addCase(createMedicine.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) {
          state.items.unshift(action.payload);
          state.total += 1;
        }
      })
      .addCase(createMedicine.rejected, (state, action) => {
        state.error = action.error.message || "Failed to create medicine";
      })
      // Update medicine
      .addCase(updateMedicine.pending, (state, action) => {
        state.updatingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateMedicine.fulfilled, (state, action) => {
        state.updatingId = null;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateMedicine.rejected, (state, action) => {
        state.updatingId = null;
        state.error = action.error.message || "Failed to update medicine";
      })
      // Delete medicine
      .addCase(deleteMedicine.pending, (state, action) => {
        state.deletingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(deleteMedicine.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteMedicine.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.error.message || "Failed to delete medicine";
      });
  },
});

export const { clearError } = medicinesSlice.actions;
export default medicinesSlice.reducer;
