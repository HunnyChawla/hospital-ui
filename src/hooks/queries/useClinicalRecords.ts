"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { complaintsApi } from "@/services/complaintsApi";
import { drugAllergyApi } from "@/services/drugAllergyApi";
import { optometryMedicalConditionsApi } from "@/services/optometryMedicalConditionsApi";
import type { ComplaintRecord, DrugAllergyRecord, MedicalConditionRecord } from "@/types";

/**
 * Complaints, medical conditions and drug allergies for one patient.
 *
 * These three are patient-level clinical facts that every speciality records —
 * `/complaints`, `/medical-conditions` and `/drug-allergies` are all plain
 * top-level endpoints, not eye ones. They were only ever surfaced on the
 * optometrist panel, so a general hospital's doctor had nowhere to write down
 * that a patient is diabetic or allergic to penicillin.
 *
 * Read through React Query rather than `optometryDataSlice`, which is where the
 * eye panel gets them: that slice also holds refraction, IOP, AR data and
 * vision, and pulling the general panel into it would make every general
 * doctor's screen depend on eye state it never uses.
 */
export const clinicalRecordKeys = {
    all: ["clinical-records"] as const,
    forPatient: (patientId: string) => ["clinical-records", patientId] as const,
};

interface ClinicalRecords {
    complaints: ComplaintRecord[];
    medicalConditions: MedicalConditionRecord[];
    drugAllergies: DrugAllergyRecord[];
    loading: boolean;
    refresh: () => void;
}

export function useClinicalRecords(
    patientId: string | null,
    visitId?: string | null
): ClinicalRecords {
    const queryClient = useQueryClient();
    const enabled = !!patientId;

    // Scoped to the visit when there is one: a doctor writing up today's
    // consultation wants today's complaints, not every complaint the patient
    // has ever had. Conditions and allergies are deliberately NOT scoped —
    // being diabetic does not stop applying between visits.
    const complaints = useQuery({
        queryKey: [...clinicalRecordKeys.forPatient(patientId ?? ""), "complaints", visitId],
        queryFn: () =>
            visitId
                ? complaintsApi.getByVisit(visitId)
                : complaintsApi.list({ patient_id: patientId! }),
        enabled,
    });

    const medicalConditions = useQuery({
        // Returns a bare array, unlike the other two, which return {items}.
        queryKey: [...clinicalRecordKeys.forPatient(patientId ?? ""), "conditions"],
        queryFn: () => optometryMedicalConditionsApi.getByPatientId(patientId!),
        enabled,
    });

    const drugAllergies = useQuery({
        queryKey: [...clinicalRecordKeys.forPatient(patientId ?? ""), "allergies"],
        queryFn: () => drugAllergyApi.list({ patient_id: patientId! }),
        enabled,
    });

    const refresh = useCallback(() => {
        if (!patientId) return;
        queryClient.invalidateQueries({ queryKey: clinicalRecordKeys.forPatient(patientId) });
    }, [queryClient, patientId]);

    return {
        complaints: complaints.data?.items ?? [],
        medicalConditions: medicalConditions.data ?? [],
        drugAllergies: drugAllergies.data?.items ?? [],
        loading: complaints.isLoading || medicalConditions.isLoading || drugAllergies.isLoading,
        refresh,
    };
}
