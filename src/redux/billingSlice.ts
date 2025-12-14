import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BillingItem, BillingRecord } from "@/types";
import { mockBillingApi } from "@/services/mockData";

type BillingState = {
  records: BillingRecord[];
  loading: boolean;
  error?: string | null;
};

const initialState: BillingState = {
  records: [],
  loading: false,
  error: null,
};

export const fetchBilling = createAsyncThunk("billing/fetch", async () => {
  const response = await mockBillingApi.list();
  return response.data;
});

export const addCharge = createAsyncThunk(
  "billing/addCharge",
  async ({ recordId, item }: { recordId: string; item: BillingItem }) => {
    const response = await mockBillingApi.addCharge(recordId, item);
    return response.data as BillingRecord | undefined;
  }
);

export const createBillingRecord = createAsyncThunk(
  "billing/create",
  async ({ patientId, items }: { patientId: string; items: BillingItem[] }) => {
    const response = await mockBillingApi.create(patientId, items);
    return response.data as BillingRecord;
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    selectRecord(state, action: PayloadAction<string | null>) {
      state.records = state.records.map((rec) => ({
        ...rec,
        status: action.payload === rec.id ? rec.status : rec.status,
      }));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBilling.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBilling.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
      })
      .addCase(fetchBilling.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to fetch billing data";
      })
      .addCase(addCharge.fulfilled, (state, action) => {
        if (!action.payload) return;
        state.records = state.records.map((rec) =>
          rec.id === action.payload?.id ? action.payload : rec
        );
      })
      .addCase(createBillingRecord.fulfilled, (state, action) => {
        state.records.unshift(action.payload);
      });
  },
});

export const { selectRecord } = billingSlice.actions;
export default billingSlice.reducer;

