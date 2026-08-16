"use client";

import { useState } from "react";
import type { ClinicQueueFilter } from "@/utils/clinicQueueFilters";

export interface ClinicPanelPreferences {
  queueVisible: boolean;
  queueFilter: ClinicQueueFilter;
  statsVisible: boolean;
}

const DEFAULT_PREFERENCES: ClinicPanelPreferences = {
  queueVisible: true,
  queueFilter: "pending",
  statsVisible: true,
};

const STORAGE_KEY = "clinic_panel_preferences";

export function useClinicPanelPreferences() {
  const [preferences, setPreferences] = useState<ClinicPanelPreferences>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        } catch {
          return DEFAULT_PREFERENCES;
        }
      }
    }
    return DEFAULT_PREFERENCES;
  });

  const save = (next: ClinicPanelPreferences) => {
    setPreferences(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  return {
    preferences,
    toggleQueue: () => save({ ...preferences, queueVisible: !preferences.queueVisible }),
    toggleStats: () => save({ ...preferences, statsVisible: !preferences.statsVisible }),
    setQueueFilter: (filter: ClinicQueueFilter) => save({ ...preferences, queueFilter: filter }),
  };
}
