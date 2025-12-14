import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { usersApi } from "@/services/usersApi";

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
  
  // Try to fetch user names for doctors that don't have names
  const doctorsWithNames = await Promise.all(
    doctors.map(async (doctor) => {
      // If doctor already has name, return as is
      if (doctor.name || doctor.user?.name) {
        return doctor;
      }
      
      // Try to fetch user details
      try {
        const user = await usersApi.getById(doctor.user_id);
        return {
          ...doctor,
          name: user.full_name,
          user: {
            name: user.full_name,
            email: user.email,
          },
        };
      } catch {
        // If user fetch fails, return doctor without name
        return doctor;
      }
    })
  );
  
  return doctorsWithNames;
});

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
      });
  },
});

export default doctorsSlice.reducer;

