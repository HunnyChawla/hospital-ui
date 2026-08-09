"use client";

import { useState, useEffect, useCallback } from "react";

export type QueueFilter = "all" | "pending";

export interface DoctorPanelPreferences {
  statsVisible: boolean;
  queueVisible: boolean;
  queueFilter: QueueFilter;
}

const STORAGE_KEY = "doctor_panel_preferences";

const DEFAULT_PREFERENCES: DoctorPanelPreferences = {
  statsVisible: true,
  queueVisible: true,
  queueFilter: "pending",
};

export const useDoctorPanelPreferences = () => {
  const [preferences, setPreferences] = useState<DoctorPanelPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DoctorPanelPreferences;
        setPreferences(parsed);
      }
    } catch (error) {
      console.error("Failed to load doctor panel preferences:", error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save doctor panel preferences:", error);
    }
  }, [preferences]);

  // Memoized toggle functions to prevent unnecessary re-renders
  const toggleStats = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      statsVisible: !prev.statsVisible,
    }));
  }, []);

  const toggleQueue = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      queueVisible: !prev.queueVisible,
    }));
  }, []);

  const setQueueFilter = useCallback((filter: QueueFilter) => {
    setPreferences((prev) => ({
      ...prev,
      queueFilter: filter,
    }));
  }, []);

  return {
    preferences,
    toggleStats,
    toggleQueue,
    setQueueFilter,
  };
};
