"use client";

import type { LucideIcon } from "lucide-react";
import {
  HeartPulse,
  MessageSquare,
  FileHeart,
  AlertTriangle,
  History,
  FlaskConical,
} from "lucide-react";
import React from "react";
import { ClinicVitalsTab } from "./examination/ClinicVitalsTab";
import { ClinicComplaintsTab } from "./examination/ClinicComplaintsTab";
import { ClinicMedicalHistoryTab } from "./examination/ClinicMedicalHistoryTab";
import { ClinicDrugAllergyTab } from "./examination/ClinicDrugAllergyTab";
import { ClinicPreviousHistoryTab } from "./examination/ClinicPreviousHistoryTab";
import { ClinicLabResultsTab } from "./examination/ClinicLabResultsTab";
import { useClinicalRecords } from "@/hooks/useClinicalRecords";

export type ClinicPanelRole = "examiner" | "doctor";

/** Props every registry component receives. */
export interface ClinicComponentProps {
  patientId: string;
  visitId: string | null;
  /** The logged-in user recording data (examiner or doctor). */
  recordedByUserId: string;
  readOnly?: boolean;
}

export interface ClinicPanelComponentDef {
  /**
   * Stable key — equals tenant_panel_config.component_key in the database.
   * NEVER rename one: it orphans every tenant's saved configuration row.
   */
  key: string;
  /** Default label; a tenant may override it per role. */
  label: string;
  icon: LucideIcon;
  defaultRoles: ClinicPanelRole[];
  defaultVisible: boolean;
  defaultOrder: number;
  Component: React.ComponentType<ClinicComponentProps>;
}

// ---- Thin adapters: registry props -> each tab's own props ----

function VitalsAdapter({ patientId, visitId, readOnly }: ClinicComponentProps) {
  return <ClinicVitalsTab patientId={patientId} visitId={visitId} readOnly={readOnly} />;
}

function ComplaintsAdapter({ patientId, visitId, recordedByUserId }: ClinicComponentProps) {
  const { complaints, loading, refresh } = useClinicalRecords(patientId, visitId);
  return (
    <ClinicComplaintsTab
      patientId={patientId}
      visitId={visitId ?? ""}
      recordedByUserId={recordedByUserId}
      complaints={complaints}
      loading={loading}
      onRefresh={refresh}
      showEyeSelector={false}
    />
  );
}

function MedicalHistoryAdapter({ patientId, visitId }: ClinicComponentProps) {
  const { medicalConditions, loading, refresh } = useClinicalRecords(patientId, visitId);
  return (
    <ClinicMedicalHistoryTab
      patientId={patientId}
      visitId={visitId ?? undefined}
      medicalConditions={medicalConditions}
      loading={loading}
      onRefresh={refresh}
    />
  );
}

function DrugAllergyAdapter({ patientId, visitId }: ClinicComponentProps) {
  const { drugAllergies, loading, refresh } = useClinicalRecords(patientId, visitId);
  return (
    <ClinicDrugAllergyTab
      patientId={patientId}
      drugAllergies={drugAllergies}
      loading={loading}
      onRefresh={refresh}
    />
  );
}

function PreviousHistoryAdapter({ patientId }: ClinicComponentProps) {
  return <ClinicPreviousHistoryTab patientId={patientId} />;
}

function LabResultsAdapter({ patientId }: ClinicComponentProps) {
  return <ClinicLabResultsTab patientId={patientId} />;
}

/**
 * THE registry. The panel's tab strip and body render from the resolved
 * version of this list (tenant config merged over these defaults) — there is
 * no hardcoded tab ladder anywhere else.
 */
export const CLINIC_PANEL_COMPONENTS: readonly ClinicPanelComponentDef[] = [
  {
    key: "vitals",
    label: "Vitals",
    icon: HeartPulse,
    defaultRoles: ["examiner", "doctor"],
    defaultVisible: true,
    defaultOrder: 10,
    Component: VitalsAdapter,
  },
  {
    key: "chief_complaint",
    label: "Chief Complaints",
    icon: MessageSquare,
    defaultRoles: ["examiner", "doctor"],
    defaultVisible: true,
    defaultOrder: 20,
    Component: ComplaintsAdapter,
  },
  {
    key: "medical_history",
    label: "Medical History",
    icon: FileHeart,
    defaultRoles: ["examiner", "doctor"],
    defaultVisible: true,
    defaultOrder: 30,
    Component: MedicalHistoryAdapter,
  },
  {
    key: "drug_allergies",
    label: "Drug Allergies",
    icon: AlertTriangle,
    defaultRoles: ["examiner", "doctor"],
    defaultVisible: true,
    defaultOrder: 40,
    Component: DrugAllergyAdapter,
  },
  {
    key: "previous_history",
    label: "Previous Visits",
    icon: History,
    defaultRoles: ["doctor"],
    defaultVisible: true,
    defaultOrder: 50,
    Component: PreviousHistoryAdapter,
  },
  {
    key: "lab_results",
    label: "Lab Results",
    icon: FlaskConical,
    defaultRoles: ["doctor"],
    defaultVisible: false,
    defaultOrder: 60,
    Component: LabResultsAdapter,
  },
] as const;
