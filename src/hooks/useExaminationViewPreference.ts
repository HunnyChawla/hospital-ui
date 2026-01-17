"use client";

import { useState, useCallback } from "react";

export type ExaminationViewMode = "tabs" | "single" | "compact";

export interface ExaminationViewPreferences {
  viewMode: ExaminationViewMode;
  collapsedSections: string[]; // Section IDs that are collapsed in single view
}

const DEFAULT_PREFERENCES: ExaminationViewPreferences = {
  viewMode: "tabs",
  collapsedSections: ["previous_history"], // Previous history collapsed by default
};

const STORAGE_KEY = "examination_view_preferences";

export function useExaminationViewPreference() {
  // Initialize preferences from localStorage or defaults
  const [preferences, setPreferences] = useState<ExaminationViewPreferences>(() => {
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

  const savePreferences = useCallback((newPreferences: ExaminationViewPreferences) => {
    setPreferences(newPreferences);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    }
  }, []);

  const setViewMode = useCallback((mode: ExaminationViewMode) => {
    savePreferences({ ...preferences, viewMode: mode });
  }, [preferences, savePreferences]);

  const toggleViewMode = useCallback(() => {
    const newMode = preferences.viewMode === "tabs" ? "single" : "tabs";
    savePreferences({ ...preferences, viewMode: newMode });
  }, [preferences, savePreferences]);

  const toggleSection = useCallback((sectionId: string) => {
    const isCollapsed = preferences.collapsedSections.includes(sectionId);
    const newCollapsedSections = isCollapsed
      ? preferences.collapsedSections.filter((id) => id !== sectionId)
      : [...preferences.collapsedSections, sectionId];
    savePreferences({ ...preferences, collapsedSections: newCollapsedSections });
  }, [preferences, savePreferences]);

  const isSectionCollapsed = useCallback((sectionId: string) => {
    return preferences.collapsedSections.includes(sectionId);
  }, [preferences.collapsedSections]);

  const expandAllSections = useCallback(() => {
    savePreferences({ ...preferences, collapsedSections: [] });
  }, [preferences, savePreferences]);

  const collapseAllSections = useCallback((sectionIds: string[]) => {
    savePreferences({ ...preferences, collapsedSections: sectionIds });
  }, [preferences, savePreferences]);

  return {
    viewMode: preferences.viewMode,
    collapsedSections: preferences.collapsedSections,
    setViewMode,
    toggleViewMode,
    toggleSection,
    isSectionCollapsed,
    expandAllSections,
    collapseAllSections,
  };
}
