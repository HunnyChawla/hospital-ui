import { apiClient } from "./api";

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

export interface PasswordResponse {
  message: string;
  success: boolean;
}

export const passwordApi = {
  /**
   * Change password for the currently authenticated user
   */
  async changePassword(data: ChangePasswordRequest): Promise<PasswordResponse> {
    const response = await apiClient.post<PasswordResponse>("/auth/change-password", data);
    return response.data;
  },

  /**
   * Reset password for another user (admin/platform_owner only)
   */
  async resetPassword(data: ResetPasswordRequest): Promise<PasswordResponse> {
    const response = await apiClient.post<PasswordResponse>("/auth/reset-password", data);
    return response.data;
  },
};
