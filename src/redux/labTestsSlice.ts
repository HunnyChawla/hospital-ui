import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  CreateLabTestRequest,
  LabTest,
  LabTestsSearchParams,
  labTestsApi,
  LabTestsSearchResponse,
  UpdateLabTestRequest,
} from "@/services/labTestsApi";
import { getErrorMessage } from "@/utils/errorHandler";

type LabTestsState = {
  items: LabTest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  loading: boolean;
  creating: boolean;
  updatingId: string | null;
  error: string | null;
  lastQuery: LabTestsSearchParams | null;
};

const initialState: LabTestsState = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  total_pages: 0,
  loading: false,
  creating: false,
  updatingId: null,
  error: null,
  lastQuery: null,
};

export const fetchLabTests = createAsyncThunk<
  { data: LabTestsSearchResponse; query: LabTestsSearchParams | undefined },
  LabTestsSearchParams | undefined
>("labTests/fetch", async (params) => {
  const data = await labTestsApi.list(params);
  return { data, query: params };
});

export const createLabTest = createAsyncThunk<
  LabTest,
  { payload: CreateLabTestRequest; tenantId?: string },
  { rejectValue: string }
>("labTests/create", async ({ payload, tenantId }, { rejectWithValue }) => {
  try {
    const created = await labTestsApi.create(payload, tenantId);
    return created;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const updateLabTest = createAsyncThunk<
  LabTest,
  { id: string; updates: UpdateLabTestRequest; tenantId?: string },
  { rejectValue: string }
>("labTests/update", async ({ id, updates, tenantId }, { rejectWithValue }) => {
  try {
    const updated = await labTestsApi.update(id, updates, tenantId);
    return updated;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const labTestsSlice = createSlice({
  name: "labTests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLabTests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLabTests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.items;
        state.total = action.payload.data.total;
        state.page = action.payload.data.page;
        state.page_size = action.payload.data.page_size;
        state.total_pages = action.payload.data.total_pages;
        state.lastQuery = action.payload.query || null;
      })
      .addCase(fetchLabTests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load lab tests";
      })
      .addCase(createLabTest.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createLabTest.fulfilled, (state, action) => {
        state.creating = false;
        // Prepend to list for quick feedback
        state.items = [action.payload, ...state.items];
        state.total += 1;
        state.error = null;
      })
      .addCase(createLabTest.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload || "Failed to create lab test";
      })
      .addCase(updateLabTest.pending, (state, action) => {
        state.updatingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateLabTest.fulfilled, (state, action) => {
        state.updatingId = null;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.error = null;
      })
      .addCase(updateLabTest.rejected, (state, action) => {
        state.updatingId = null;
        state.error = action.payload || "Failed to update lab test";
      });
  },
});

export default labTestsSlice.reducer;

