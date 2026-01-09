import { apiClient } from "@/services/api";

// Types
export interface QuickDiagnosis {
    id?: string;
    label: string;
    value: string;
    category: "refractive" | "surface" | "lens" | "retina" | "other";
    position?: number;
}

export interface QuickMedicine {
    id?: string;
    label: string;
    icon: "droplets" | "pill" | "eye" | "ointment" | "injection";
    color: "sky" | "purple" | "emerald" | "amber" | "rose" | "slate" | "blue" | "indigo";
    medicine_name: string;
    generic_name?: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    position?: number;
}

export interface UpdateQuickDiagnosesRequest {
    items: QuickDiagnosis[];
}

export interface UpdateQuickMedicinesRequest {
    items: QuickMedicine[];
}

// Service
export const quickPresetsApi = {
    // Diagnoses
    getDiagnoses: async (doctorId: string): Promise<QuickDiagnosis[]> => {
        try {
            const response = await apiClient.get<QuickDiagnosis[]>(`/doctors/${doctorId}/quick-presets/diagnoses`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return []; // No presets yet
            console.warn("Failed to fetch diagnoses presets, falling back to defaults", error);
            return []; // Allow UI fallback to hardcoded defaults on error
        }
    },

    updateDiagnoses: async (doctorId: string, items: QuickDiagnosis[]): Promise<QuickDiagnosis[]> => {
        const response = await apiClient.put<QuickDiagnosis[]>(`/doctors/${doctorId}/quick-presets/diagnoses`, { items });
        return response.data;
    },

    // Medicines
    getMedicines: async (doctorId: string): Promise<QuickMedicine[]> => {
        try {
            const response = await apiClient.get<QuickMedicine[]>(`/doctors/${doctorId}/quick-presets/medicines`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return [];
            console.warn("Failed to fetch medicine presets, falling back to defaults", error);
            return [];
        }
    },

    updateMedicines: async (doctorId: string, items: QuickMedicine[]): Promise<QuickMedicine[]> => {
        const response = await apiClient.put<QuickMedicine[]>(`/doctors/${doctorId}/quick-presets/medicines`, { items });
        return response.data;
    },
};
