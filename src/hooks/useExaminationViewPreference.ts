"use client";

import { useExaminationViewContext } from "@/context/ExaminationViewContext";

export type { ExaminationViewMode, ExaminationViewPreferences } from "@/context/ExaminationViewContext";

export function useExaminationViewPreference() {
  return useExaminationViewContext();
}
