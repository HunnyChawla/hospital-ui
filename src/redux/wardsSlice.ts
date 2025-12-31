import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { wardsApi, Ward } from "@/services/wardsApi";

type WardsState = {
  list: Ward[];
  loading: boolean;
  error: string | null;
};

const initialState: WardsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchWards = createAsyncThunk("wards/fetch", async () => {
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  const response = await wardsApi.list({
    page: 1,
    page_size: 100,
    tenant_id: tenantId || undefined,
  });
  return response.items;
});

const wardsSlice = createSlice({
  name: "wards",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWards.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchWards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch wards";
      });
  },
});

export default wardsSlice.reducer;
