import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi, LoginRequest, LoginResponse } from "@/services/authApi";

type AuthState = {
  user: LoginResponse | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", response.token.access_token);
        localStorage.setItem("user_id", response.user_id);
        // Use tenant_id from response, or fallback to default if not provided
        const tenantId = response.tenant_id || "000c5fe0-a5bc-40c5-9d8e-88d2ef811cb1";
        localStorage.setItem("tenant_id", tenantId);
        localStorage.setItem("role", response.role);
      }
      return response;
    } catch (error: any) {
      // Preserve the error structure for proper error handling
      return rejectWithValue(error);
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  // Call logout API
  await authApi.logout();
  
  // Clear local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("role");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    restoreSession(state) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        const user_id = localStorage.getItem("user_id");
        const tenant_id = localStorage.getItem("tenant_id");
        const role = localStorage.getItem("role");
        
        if (token && user_id && tenant_id && role) {
          state.token = token;
          state.isAuthenticated = true;
          state.user = {
            token: { access_token: token, token_type: "bearer" },
            user_id,
            tenant_id,
            role,
          };
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token.access_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        // When using rejectWithValue, the error is in action.payload
        // Otherwise, use action.error.message
        if (action.payload) {
          // The payload contains the error object, but we'll let the component handle parsing
          // For now, set a generic message - the component will use getErrorMessage to parse it
          state.error = "Login failed";
        } else {
          state.error = action.error.message || "Login failed";
        }
        state.isAuthenticated = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, restoreSession } = authSlice.actions;
export default authSlice.reducer;

