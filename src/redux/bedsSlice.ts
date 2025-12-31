import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { bedsApi, Bed } from "@/services/bedsApi";
import { getTenantIdForApi } from "@/utils/auth";

type BedsState = {
  list: Bed[];
  loading: boolean;
  error: string | null;
};

const initialState: BedsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchBeds = createAsyncThunk("beds/fetch", async () => {
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  const response = await bedsApi.list({
    page: 1,
    page_size: 100,
    tenant_id: getTenantIdForApi(tenantId),
  });
  return response.items;
});

const bedsSlice = createSlice({
  name: "beds",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBeds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeds.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchBeds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch beds";
      });
  },
});

export default bedsSlice.reducer;
