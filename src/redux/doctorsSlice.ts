import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { doctorsApi, Doctor, CreateDoctorRequest, UpdateDoctorRequest } from "@/services/doctorsApi";

type DoctorsState = {
  list: Doctor[];
  loading: boolean;
  error: string | null;
};

const initialState: DoctorsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchDoctors = createAsyncThunk("doctors/fetch", async () => {
  const doctors = await doctorsApi.list();

  return doctors.map((doctor) => {
    const doctorDisplayName = doctor.name || doctor.user_name || doctor.user?.name || "Doctor";
    return {
      ...doctor,
      name: doctorDisplayName,
      user: doctor.user || {
        name: doctorDisplayName,
        email: "",
      },
      is_active: doctor.is_active !== undefined ? doctor.is_active : doctor.status === "active",
      status: doctor.status || "active",
    };
  });
});

export const createDoctor = createAsyncThunk(
  "doctors/create",
  async (doctor: CreateDoctorRequest, { rejectWithValue }) => {
    try {
      const createdDoctor = await doctorsApi.create(doctor);
      return createdDoctor;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateDoctor = createAsyncThunk(
  "doctors/update",
  async (
    payload: { doctorId: string; updates: UpdateDoctorRequest },
    { rejectWithValue }
  ) => {
    try {
      const updatedDoctor = await doctorsApi.update(payload.doctorId, payload.updates);
      return updatedDoctor;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const doctorsSlice = createSlice({
  name: "doctors",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch doctors";
      })
      .addCase(createDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDoctor.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
        state.error = null;
      })
      .addCase(createDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string || "Failed to create doctor";
      })
      .addCase(updateDoctor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDoctor.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateDoctor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string || "Failed to update doctor";
      });
  },
});

export default doctorsSlice.reducer;

