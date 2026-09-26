import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi, LoginRequest, LoginResponse } from "@/services/authApi";
import { usersApi } from "@/services/usersApi";
import { fetchTenant, clearTenant } from "./tenantSlice";
import { fetchMyPermissions, clearPermissions } from "./permissionsSlice";
import { UserPermissions } from "@/types";
import { getAllFeatureFlags } from "@/services/featureFlagsApi";

type AuthState = {
  user: LoginResponse | null;
  userDetails: {
    full_name: string;
    email: string;
  } | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  consentRequired: boolean;
  pendingConsents: any[];
};

const initialState: AuthState = {
  user: null,
  userDetails: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  mustChangePassword: false,
  consentRequired: false,
  pendingConsents: [],
};

// Fetch user details (full name, email, etc.)
export const fetchUserDetails = createAsyncThunk(
  "auth/fetchUserDetails",
  async (userId: string) => {
    const userDetails = await usersApi.getById(userId);
    return {
      full_name: userDetails.full_name,
      email: userDetails.email,
    };
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await authApi.login(credentials);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", response.token.access_token);
        localStorage.setItem("user_id", response.user_id);
        // Use tenant_id from response, or fallback to default if not provided
        const tenantId = response.tenant_id || "000c5fe0-a5bc-40c5-9d8e-88d2ef811cb1";
        localStorage.setItem("tenant_id", tenantId);
        localStorage.setItem("role", response.role);

        // Store must_change_password flag if set
        if (response.must_change_password) {
          localStorage.setItem("must_change_password", "true");
        } else {
          localStorage.removeItem("must_change_password");
        }

        // Store consent_required flag if set
        if (response.consent_required) {
          localStorage.setItem("consent_required", "true");
        } else {
          localStorage.removeItem("consent_required");
        }

        // Only fetch post-login domain data if consent is NOT required.
        // If consent is required, making protected API calls will trigger 403 Forbidden.
        if (!response.consent_required) {
          // Fetch tenant data and user details (fire and forget - not critical for navigation)
          dispatch(fetchTenant(tenantId));
          dispatch(fetchUserDetails(response.user_id));

          // Fetch feature flags on login and save to localStorage
          try {
            const featureFlags = await getAllFeatureFlags();
            localStorage.setItem("feature_flags", JSON.stringify(featureFlags));
          } catch (err) {
            console.error("Failed to pre-fetch feature flags on login:", err);
          }

          // Await permissions fetch - needed to determine where to navigate after login
          const permissionsResult = await dispatch(fetchMyPermissions());

          return {
            ...response,
            permissions: permissionsResult.payload as UserPermissions | undefined,
          };
        }

        return { ...response, permissions: undefined };
      }
      return { ...response, permissions: undefined };
    } catch (error: any) {
      // Preserve the error structure for proper error handling
      return rejectWithValue(error);
    }
  }
);

export const postConsentBootstrap = createAsyncThunk(
  "auth/postConsentBootstrap",
  async (_, { dispatch }) => {
    if (typeof window === "undefined") return;
    const tenantId = localStorage.getItem("tenant_id") || "000c5fe0-a5bc-40c5-9d8e-88d2ef811cb1";
    const userId = localStorage.getItem("user_id");

    dispatch(fetchTenant(tenantId));
    if (userId) {
      dispatch(fetchUserDetails(userId));
    }
    try {
      const featureFlags = await getAllFeatureFlags();
      localStorage.setItem("feature_flags", JSON.stringify(featureFlags));
    } catch (err) {
      console.error("Failed to fetch feature flags after consent:", err);
    }
    await dispatch(fetchMyPermissions());
  }
);

export const logout = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  // Call logout API
  await authApi.logout();

  // Clear local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("role");
    localStorage.removeItem("must_change_password");
    localStorage.removeItem("consent_required");
    localStorage.removeItem("feature_flags");
  }

  // Clear tenant data and permissions
  dispatch(clearTenant());
  dispatch(clearPermissions());
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearMustChangePassword(state) {
      state.mustChangePassword = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("must_change_password");
      }
    },
    setConsentRequired(state, action: PayloadAction<boolean>) {
      state.consentRequired = action.payload;
      if (typeof window !== "undefined") {
        if (action.payload) {
          localStorage.setItem("consent_required", "true");
        } else {
          localStorage.removeItem("consent_required");
        }
      }
    },
    clearConsentRequired(state) {
      state.consentRequired = false;
      state.pendingConsents = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("consent_required");
      }
    },
    updateToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      if (state.user) {
        state.user.token = {
          access_token: action.payload,
          token_type: "bearer",
        };
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", action.payload);
      }
    },
    // Note: restoreSession doesn't fetch user details - that's done by a separate effect
    restoreSession(state) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        const user_id = localStorage.getItem("user_id");
        const tenant_id = localStorage.getItem("tenant_id");
        const role = localStorage.getItem("role");
        const mustChangePassword = localStorage.getItem("must_change_password") === "true";
        const consentRequired = localStorage.getItem("consent_required") === "true";

        if (token && user_id && tenant_id && role) {
          state.token = token;
          state.isAuthenticated = true;
          state.mustChangePassword = mustChangePassword;
          state.consentRequired = consentRequired;
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
        state.mustChangePassword = action.payload.must_change_password || false;
        state.consentRequired = action.payload.consent_required || false;
        state.pendingConsents = action.payload.pending_consents || [];
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.error = "Login failed";
        } else {
          state.error = action.error.message || "Login failed";
        }
        state.isAuthenticated = false;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.userDetails = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.userDetails = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.mustChangePassword = false;
        state.consentRequired = false;
        state.pendingConsents = [];
      });
  },
});

export const {
  clearError,
  restoreSession,
  clearMustChangePassword,
  setConsentRequired,
  clearConsentRequired,
  updateToken,
} = authSlice.actions;
export default authSlice.reducer;

