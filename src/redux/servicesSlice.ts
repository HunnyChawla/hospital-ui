import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  CreateServiceRequest,
  Service,
  ServicesSearchParams,
  servicesApi,
  ServicesSearchResponse,
  UpdateServiceRequest,
} from "@/services/servicesApi";
import { getErrorMessage } from "@/utils/errorHandler";

type ServicesState = {
  items: Service[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  loading: boolean;
  creating: boolean;
  updatingId: string | null;
  deletingId: string | null;
  error: string | null;
  lastQuery: ServicesSearchParams | null;
};

const initialState: ServicesState = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  total_pages: 0,
  loading: false,
  creating: false,
  updatingId: null,
  deletingId: null,
  error: null,
  lastQuery: null,
};

export const fetchServices = createAsyncThunk<
  { data: ServicesSearchResponse; query: ServicesSearchParams | undefined },
  ServicesSearchParams | undefined
>("services/fetch", async (params) => {
  const data = await servicesApi.list(params);
  return { data, query: params };
});

export const createService = createAsyncThunk<
  Service,
  { payload: CreateServiceRequest; tenantId?: string },
  { rejectValue: string }
>("services/create", async ({ payload, tenantId }, { rejectWithValue }) => {
  try {
    const created = await servicesApi.create(payload, tenantId);
    return created;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const updateService = createAsyncThunk<
  Service,
  { id: string; updates: UpdateServiceRequest; tenantId?: string },
  { rejectValue: string }
>("services/update", async ({ id, updates, tenantId }, { rejectWithValue }) => {
  try {
    const updated = await servicesApi.update(id, updates, tenantId);
    return updated;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const deleteService = createAsyncThunk<
  string,
  { id: string; tenantId?: string },
  { rejectValue: string }
>("services/delete", async ({ id, tenantId }, { rejectWithValue }) => {
  try {
    await servicesApi.delete(id, tenantId);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const servicesSlice = createSlice({
  name: "services",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.items;
        state.total = action.payload.data.total;
        state.page = action.payload.data.page;
        state.page_size = action.payload.data.page_size;
        state.total_pages = action.payload.data.total_pages;
        state.lastQuery = action.payload.query || null;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load services";
      })
      .addCase(createService.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.creating = false;
        // Prepend to list for quick feedback
        state.items = [action.payload, ...state.items];
        state.total += 1;
        state.error = null;
      })
      .addCase(createService.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload || "Failed to create service";
      })
      .addCase(updateService.pending, (state, action) => {
        state.updatingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.updatingId = null;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.error = null;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.updatingId = null;
        state.error = action.payload || "Failed to update service";
      })
      .addCase(deleteService.pending, (state, action) => {
        state.deletingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.total -= 1;
        state.error = null;
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload || "Failed to delete service";
      });
  },
});

export default servicesSlice.reducer;

