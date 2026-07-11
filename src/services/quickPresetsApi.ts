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


export interface QuickAdvice {
    id?: string;
    label: string;
    value: string;
    category: "General" | "Post-Op" | "Pre-Op" | "Infection" | "Allergy";
    position?: number;
}

export interface QuickLabTest {
    id?: string;
    label: string;
    value: string;
    category: "Hematology" | "Biochemistry" | "Microbiology" | "Pathology" | "Serology" | "Other";
    position?: number;
    lab_test_id?: string;
}

export type PresetType = 'diagnoses' | 'medicines' | 'advices' | 'lab-tests';

export interface UpdateQuickDiagnosesRequest {
    items: QuickDiagnosis[];
}

export interface UpdateQuickMedicinesRequest {
    items: QuickMedicine[];
}

// Service
export const quickPresetsApi = {
    // Diagnoses
    getDiagnoses: async (doctorId: string, search?: string): Promise<QuickDiagnosis[]> => {
        try {
            const response = await apiClient.get<QuickDiagnosis[]>(`/doctors/${doctorId}/quick-presets/group/diagnoses`, {
                params: { search }
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return []; // No presets yet
            console.warn("Failed to fetch diagnoses presets, falling back to defaults", error);
            return []; // Allow UI fallback to hardcoded defaults on error
        }
    },

    updateDiagnoses: async (doctorId: string, items: QuickDiagnosis[]): Promise<QuickDiagnosis[]> => {
        const response = await apiClient.put<QuickDiagnosis[]>(`/doctors/${doctorId}/quick-presets/group/diagnoses`, { items });
        return response.data;
    },

    createDiagnosis: async (doctorId: string, item: QuickDiagnosis): Promise<QuickDiagnosis> => {
        const response = await apiClient.post<QuickDiagnosis>(`/doctors/${doctorId}/quick-presets/group/diagnoses`, item);
        return response.data;
    },

    updateDiagnosis: async (doctorId: string, id: string, item: QuickDiagnosis): Promise<QuickDiagnosis> => {
        const response = await apiClient.put<QuickDiagnosis>(`/doctors/${doctorId}/quick-presets/group/diagnoses/${id}`, item);
        return response.data;
    },

    deleteDiagnosis: async (doctorId: string, id: string): Promise<void> => {
        await apiClient.delete(`/doctors/${doctorId}/quick-presets/group/diagnoses/${id}`);
    },

    // Medicines
    getMedicines: async (doctorId: string): Promise<QuickMedicine[]> => {
        try {
            const response = await apiClient.get<QuickMedicine[]>(`/doctors/${doctorId}/quick-presets/group/medicines`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return [];
            console.warn("Failed to fetch medicine presets, falling back to defaults", error);
            return [];
        }
    },

    updateMedicines: async (doctorId: string, items: QuickMedicine[]): Promise<QuickMedicine[]> => {
        const response = await apiClient.put<QuickMedicine[]>(`/doctors/${doctorId}/quick-presets/group/medicines`, { items });
        return response.data;
    },

    createMedicine: async (doctorId: string, item: QuickMedicine): Promise<QuickMedicine> => {
        const response = await apiClient.post<QuickMedicine>(`/doctors/${doctorId}/quick-presets/group/medicines`, item);
        return response.data;
    },

    updateMedicine: async (doctorId: string, id: string, item: QuickMedicine): Promise<QuickMedicine> => {
        const response = await apiClient.put<QuickMedicine>(`/doctors/${doctorId}/quick-presets/group/medicines/${id}`, item);
        return response.data;
    },

    deleteMedicine: async (doctorId: string, id: string): Promise<void> => {
        await apiClient.delete(`/doctors/${doctorId}/quick-presets/group/medicines/${id}`);
    },

    // Advices
    getAdvices: async (doctorId: string, search?: string): Promise<QuickAdvice[]> => {
        try {
            const response = await apiClient.get<QuickAdvice[]>(`/doctors/${doctorId}/quick-presets/group/advices`, {
                params: { search }
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return [];
            console.warn("Failed to fetch advice presets, falling back to defaults", error);
            return [];
        }
    },

    updateAdvices: async (doctorId: string, items: QuickAdvice[]): Promise<QuickAdvice[]> => {
        const response = await apiClient.put<QuickAdvice[]>(`/doctors/${doctorId}/quick-presets/group/advices`, { items });
        return response.data;
    },

    createAdvice: async (doctorId: string, item: QuickAdvice): Promise<QuickAdvice> => {
        const response = await apiClient.post<QuickAdvice>(`/doctors/${doctorId}/quick-presets/group/advices`, item);
        return response.data;
    },

    updateAdvice: async (doctorId: string, id: string, item: QuickAdvice): Promise<QuickAdvice> => {
        const response = await apiClient.put<QuickAdvice>(`/doctors/${doctorId}/quick-presets/group/advices/${id}`, item);
        return response.data;
    },

    deleteAdvice: async (doctorId: string, id: string): Promise<void> => {
        await apiClient.delete(`/doctors/${doctorId}/quick-presets/group/advices/${id}`);
    },

    // Lab Tests
    getLabTests: async (doctorId: string, search?: string): Promise<QuickLabTest[]> => {
        try {
            const response = await apiClient.get<QuickLabTest[]>(`/doctors/${doctorId}/quick-presets/group/lab-tests`, {
                params: { search }
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return [];
            console.warn("Failed to fetch lab test presets, falling back to defaults", error);
            return [];
        }
    },

    updateLabTests: async (doctorId: string, items: QuickLabTest[]): Promise<QuickLabTest[]> => {
        const response = await apiClient.put<QuickLabTest[]>(`/doctors/${doctorId}/quick-presets/group/lab-tests`, { items });
        return response.data;
    },

    createLabTest: async (doctorId: string, item: QuickLabTest): Promise<QuickLabTest> => {
        const response = await apiClient.post<QuickLabTest>(`/doctors/${doctorId}/quick-presets/group/lab-tests`, item);
        return response.data;
    },

    updateLabTest: async (doctorId: string, id: string, item: QuickLabTest): Promise<QuickLabTest> => {
        const response = await apiClient.put<QuickLabTest>(`/doctors/${doctorId}/quick-presets/group/lab-tests/${id}`, item);
        return response.data;
    },

    deleteLabTest: async (doctorId: string, id: string): Promise<void> => {
        await apiClient.delete(`/doctors/${doctorId}/quick-presets/group/lab-tests/${id}`);
    },
};
