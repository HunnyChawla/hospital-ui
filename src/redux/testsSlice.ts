import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { TestOrder } from "@/types";
import { mockTestsApi } from "@/services/mockData";

type TestsState = {
  list: TestOrder[];
  loading: boolean;
};

const initialState: TestsState = {
  list: [],
  loading: false,
};

export const fetchTests = createAsyncThunk("tests/fetch", async () => {
  const response = await mockTestsApi.list();
  return response.data;
});

export const updateTestStatus = createAsyncThunk(
  "tests/updateStatus",
  async ({ id, status }: { id: string; status: TestOrder["status"] }) => {
    const response = await mockTestsApi.updateStatus(id, status);
    return response.data as TestOrder[];
  }
);

const testsSlice = createSlice({
  name: "tests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTests.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTests.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateTestStatus.fulfilled, (state, action) => {
        state.list = action.payload;
      });
  },
});

export default testsSlice.reducer;

