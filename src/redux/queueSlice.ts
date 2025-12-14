import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { QueueEntry } from "@/types";
import { mockQueueApi } from "@/services/mockData";

type QueueState = {
  entries: QueueEntry[];
  loading: boolean;
};

const initialState: QueueState = {
  entries: [],
  loading: false,
};

export const fetchQueue = createAsyncThunk("queue/fetch", async () => {
  const response = await mockQueueApi.list();
  return response.data;
});

export const updateQueueStatus = createAsyncThunk(
  "queue/updateStatus",
  async ({ token, status }: { token: number; status: QueueEntry["status"] }) => {
    const response = await mockQueueApi.updateStatus(token, status);
    return response.data as QueueEntry[];
  }
);

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    reorder(state, action: PayloadAction<QueueEntry[]>) {
      state.entries = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueue.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchQueue.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateQueueStatus.fulfilled, (state, action) => {
        state.entries = action.payload;
      });
  },
});

export const { reorder } = queueSlice.actions;
export default queueSlice.reducer;

