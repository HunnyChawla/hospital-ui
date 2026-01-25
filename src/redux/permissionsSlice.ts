import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { permissionsApi } from "@/services/permissionsApi";
import {
  UserPermissions,
  RolePermissions,
  UserSpecificPermissions,
  UserPermissionSummary,
  ScreenDetail,
} from "@/types";
import { getErrorMessage } from "@/utils/errorHandler";

type PermissionsState = {
  // Current user's permissions (fetched after login)
  userPermissions: UserPermissions | null;
  allowedScreens: string[];
  screenDetails: ScreenDetail[];

  // Admin state (for managing role permissions)
  allRolePermissions: RolePermissions[];

  // Admin state (for managing user-specific permissions)
  usersWithPermissions: UserPermissionSummary[];
  selectedUserPermissions: UserSpecificPermissions | null;

  // Loading states
  loading: boolean;
  adminLoading: boolean;
  usersLoading: boolean;
  userDetailLoading: boolean;
  updating: boolean;

  // Error state
  error: string | null;

  // Indicates if permissions have been fetched
  initialized: boolean;
};

const initialState: PermissionsState = {
  userPermissions: null,
  allowedScreens: [],
  screenDetails: [],
  allRolePermissions: [],
  usersWithPermissions: [],
  selectedUserPermissions: null,
  loading: false,
  adminLoading: false,
  usersLoading: false,
  userDetailLoading: false,
  updating: false,
  error: null,
  initialized: false,
};

// Fetch current user's permissions (called after login)
export const fetchMyPermissions = createAsyncThunk<
  UserPermissions,
  void,
  { rejectValue: string }
>("permissions/fetchMy", async (_, { rejectWithValue }) => {
  try {
    return await permissionsApi.getMyPermissions();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Fetch all role permissions (admin only)
export const fetchAllRolePermissions = createAsyncThunk<
  RolePermissions[],
  string | undefined,
  { rejectValue: string }
>("permissions/fetchAllRoles", async (tenantId, { rejectWithValue }) => {
  try {
    return await permissionsApi.listRolePermissions(tenantId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Update role permissions
export const updateRolePermissions = createAsyncThunk<
  RolePermissions,
  { role: string; screenPaths: string[]; tenantId?: string; defaultScreenPath?: string },
  { rejectValue: string }
>("permissions/updateRole", async ({ role, screenPaths, tenantId, defaultScreenPath }, { rejectWithValue }) => {
  try {
    return await permissionsApi.updateRolePermissions(role, screenPaths, tenantId, defaultScreenPath);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Fetch users with custom permissions (admin only)
export const fetchUsersWithPermissions = createAsyncThunk<
  UserPermissionSummary[],
  { tenantId?: string; search?: string } | undefined,
  { rejectValue: string }
>("permissions/fetchUsersWithPermissions", async (params, { rejectWithValue }) => {
  try {
    return await permissionsApi.listUsersWithPermissions(params?.tenantId, params?.search);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Fetch specific user's permissions (admin only)
export const fetchUserPermissions = createAsyncThunk<
  UserSpecificPermissions,
  { userId: string; tenantId?: string },
  { rejectValue: string }
>("permissions/fetchUserPermissions", async ({ userId, tenantId }, { rejectWithValue }) => {
  try {
    return await permissionsApi.getUserPermissions(userId, tenantId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Update user's additional screens (admin only)
export const updateUserPermissions = createAsyncThunk<
  { user_id: string; additional_screens: string[] },
  { userId: string; additionalScreens: string[]; tenantId?: string },
  { rejectValue: string }
>(
  "permissions/updateUserPermissions",
  async ({ userId, additionalScreens, tenantId }, { rejectWithValue }) => {
    try {
      return await permissionsApi.updateUserPermissions(userId, additionalScreens, tenantId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Seed default permissions (platform owner only)
export const seedDefaultPermissions = createAsyncThunk<
  { message: string },
  string | undefined,
  { rejectValue: string }
>("permissions/seedDefaults", async (tenantId, { rejectWithValue }) => {
  try {
    return await permissionsApi.seedDefaults(tenantId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    clearPermissions(state) {
      state.userPermissions = null;
      state.allowedScreens = [];
      state.screenDetails = [];
      state.initialized = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSelectedUserPermissions(state) {
      state.selectedUserPermissions = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch my permissions
      .addCase(fetchMyPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.userPermissions = action.payload;
        // Ensure arrays are always arrays
        state.allowedScreens = Array.isArray(action.payload?.allowed_screens)
          ? action.payload.allowed_screens
          : [];
        state.screenDetails = Array.isArray(action.payload?.screen_details)
          ? action.payload.screen_details
          : [];
        state.initialized = true;
        state.error = null;
      })
      .addCase(fetchMyPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch permissions";
        state.initialized = true; // Mark as initialized even on error
      })

      // Fetch all role permissions (admin)
      .addCase(fetchAllRolePermissions.pending, (state) => {
        state.adminLoading = true;
        state.error = null;
      })
      .addCase(fetchAllRolePermissions.fulfilled, (state, action) => {
        state.adminLoading = false;
        // Ensure payload is always an array
        state.allRolePermissions = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchAllRolePermissions.rejected, (state, action) => {
        state.adminLoading = false;
        state.error = action.payload || "Failed to fetch role permissions";
      })

      // Update role permissions
      .addCase(updateRolePermissions.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateRolePermissions.fulfilled, (state, action) => {
        state.updating = false;
        // Update the role in allRolePermissions
        const index = state.allRolePermissions.findIndex(
          (rp) => rp.role === action.payload.role
        );
        if (index !== -1) {
          state.allRolePermissions[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateRolePermissions.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || "Failed to update permissions";
      })

      // Fetch users with permissions
      .addCase(fetchUsersWithPermissions.pending, (state) => {
        state.usersLoading = true;
        state.error = null;
      })
      .addCase(fetchUsersWithPermissions.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.usersWithPermissions = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchUsersWithPermissions.rejected, (state, action) => {
        state.usersLoading = false;
        state.error = action.payload || "Failed to fetch users";
      })

      // Fetch specific user's permissions
      .addCase(fetchUserPermissions.pending, (state) => {
        state.userDetailLoading = true;
        state.error = null;
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.userDetailLoading = false;
        state.selectedUserPermissions = action.payload;
        state.error = null;
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => {
        state.userDetailLoading = false;
        state.error = action.payload || "Failed to fetch user permissions";
      })

      // Update user permissions
      .addCase(updateUserPermissions.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateUserPermissions.fulfilled, (state, action) => {
        state.updating = false;
        // Update the user in usersWithPermissions
        const index = state.usersWithPermissions.findIndex(
          (u) => u.user_id === action.payload.user_id
        );
        if (index !== -1) {
          state.usersWithPermissions[index].additional_screens_count =
            action.payload.additional_screens.length;
        }
        // Update selectedUserPermissions if it's the same user
        if (state.selectedUserPermissions?.user_id === action.payload.user_id) {
          state.selectedUserPermissions.additional_screens = action.payload.additional_screens;
          state.selectedUserPermissions.all_allowed_screens = [
            ...state.selectedUserPermissions.role_screens,
            ...action.payload.additional_screens,
          ];
        }
        state.error = null;
      })
      .addCase(updateUserPermissions.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || "Failed to update user permissions";
      })

      // Seed defaults
      .addCase(seedDefaultPermissions.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(seedDefaultPermissions.fulfilled, (state) => {
        state.updating = false;
        state.error = null;
      })
      .addCase(seedDefaultPermissions.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || "Failed to seed default permissions";
      });
  },
});

export const { clearPermissions, clearError, clearSelectedUserPermissions } =
  permissionsSlice.actions;
export default permissionsSlice.reducer;
