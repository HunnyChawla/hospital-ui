import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Admission } from "@/types";
import { mockAdmissionApi } from "@/services/mockData";

type AdmissionsState = {
  list: Admission[];
  loading: boolean;
};

const initialState: AdmissionsState = {
  list: [],
  loading: false,
};

export const fetchAdmissions = createAsyncThunk(
  "admissions/fetch",
  async () => {
    const response = await mockAdmissionApi.list();
    return response.data;
  }
);

export const admitPatient = createAsyncThunk(
  "admissions/admit",
  async (payload: Admission) => {
    const response = await mockAdmissionApi.admit(payload);
    return response.data;
  }
);

export const dischargePatient = createAsyncThunk(
  "admissions/discharge",
  async ({ admissionId, summary }: { admissionId: string; summary: string }) => {
    const response = await mockAdmissionApi.discharge(admissionId, summary);
    return response.data;
  }
);

const admissionsSlice = createSlice({
  name: "admissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdmissions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAdmissions.rejected, (state) => {
        state.loading = false;
      })
      .addCase(admitPatient.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      });
  },
});

export default admissionsSlice.reducer;

