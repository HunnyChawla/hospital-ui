import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tenantsApi, Tenant } from "@/services/tenantsApi";

type TenantState = {
  tenant: Tenant | null;
  logoDataUrl: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: TenantState = {
  tenant: null,
  logoDataUrl: null,
  loading: false,
  error: null,
};

export const fetchTenant = createAsyncThunk(
  "tenant/fetch",
  async (tenantId: string, { rejectWithValue }) => {
    try {
      // Fetch tenant data
      const tenantData = await tenantsApi.getById(tenantId);

      // Fetch logo only if tenant has one, and convert to data URL
      let logoDataUrl: string | null = null;
      if (tenantData.logo) {
        try {
          const logoBlob = await tenantsApi.getLogo(tenantId);
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
        } catch (logoErr: any) {
          // If 404, it means logo file is missing despite the database record
          if (logoErr.response?.status !== 404) {
            console.error("Failed to fetch logo:", logoErr);
          }
        }
      }

      return { tenant: tenantData, logoDataUrl };
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    clearTenant(state) {
      state.tenant = null;
      state.logoDataUrl = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.tenant = action.payload.tenant;
        state.logoDataUrl = action.payload.logoDataUrl;
        state.error = null;
      })
      .addCase(fetchTenant.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to load tenant information";
        state.tenant = null;
        state.logoDataUrl = null;
      });
  },
});

export const { clearTenant } = tenantSlice.actions;
export default tenantSlice.reducer;

