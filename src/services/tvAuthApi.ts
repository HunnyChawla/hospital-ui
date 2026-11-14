import { apiClient } from "./api";

export interface TVDisplayConfig {
    showExaminer: boolean;
    doctorIds: string[];
    layout: "split" | "columns" | "auto";
    theme: "dark" | "light";
    showHealthTips?: boolean;
    privacyMode?: "full" | "initials" | "token_only";
    voiceAlerts?: boolean;
}

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
    last_config?: TVDisplayConfig | null;
}

export const tvAuthApi = {
    async getSessionInfo(sessionCode: string): Promise<TVSessionInfo> {
        const response = await apiClient.get<TVSessionInfo>(
            `/auth/tv/session/${sessionCode}`
        );
        return response.data;
    },

    async authorizeSession(
        sessionCode: string,
        displayConfig?: TVDisplayConfig
    ): Promise<TVAuthorizeResponse> {
        const response = await apiClient.post<TVAuthorizeResponse>(
            "/auth/tv/authorize",
            {
                session_code: sessionCode,
                display_config: displayConfig,
            }
        );
        return response.data;
    },
};
