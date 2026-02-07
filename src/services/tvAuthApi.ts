import { apiClient } from "./api";

export interface TVAuthorizeResponse {
    success: boolean;
    message: string;
}

export interface TVSessionInfo {
    session_code: string;
    status: string;
    hospital_name: string;
    expires_at: string;
    can_authorize: boolean;
}

export const tvAuthApi = {
    async getSessionInfo(sessionCode: string): Promise<TVSessionInfo> {
        const response = await apiClient.get<TVSessionInfo>(
            `/auth/tv/session/${sessionCode}`
        );
        return response.data;
    },

    async authorizeSession(sessionCode: string): Promise<TVAuthorizeResponse> {
        const response = await apiClient.post<TVAuthorizeResponse>(
            "/auth/tv/authorize",
            { session_code: sessionCode }
        );
        return response.data;
    },
};
