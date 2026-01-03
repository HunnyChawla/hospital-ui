"use client";

import { useState } from "react";

export type OptometristQueueFilter = "all" | "pending" | "in_progress" | "completed";

export interface OptometristPanelPreferences {
  queueVisible: boolean;
  queueFilter: OptometristQueueFilter;
  statsVisible: boolean;
  autoCollapseQueueOnMobile: boolean;
}

const DEFAULT_PREFERENCES: OptometristPanelPreferences = {
  queueVisible: true,
  queueFilter: "all",
  statsVisible: true,
  autoCollapseQueueOnMobile: false, // Disabled by default
};

export function useOptometristPanelPreferences() {
  // Initialize preferences from localStorage or defaults
  const [preferences, setPreferences] = useState<OptometristPanelPreferences>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("optometrist_panel_preferences");
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

  const toggleQueue = () => {
    const newPreferences = { ...preferences, queueVisible: !preferences.queueVisible };
    setPreferences(newPreferences);
    if (typeof window !== "undefined") {
      localStorage.setItem("optometrist_panel_preferences", JSON.stringify(newPreferences));
    }
  };

  const toggleStats = () => {
    const newPreferences = { ...preferences, statsVisible: !preferences.statsVisible };
    setPreferences(newPreferences);
    if (typeof window !== "undefined") {
      localStorage.setItem("optometrist_panel_preferences", JSON.stringify(newPreferences));
    }
  };

  const setQueueFilter = (filter: OptometristQueueFilter) => {
    const newPreferences = { ...preferences, queueFilter: filter };
    setPreferences(newPreferences);
    if (typeof window !== "undefined") {
      localStorage.setItem("optometrist_panel_preferences", JSON.stringify(newPreferences));
    }
  };

  const toggleAutoCollapseQueueOnMobile = () => {
    const newPreferences = { ...preferences, autoCollapseQueueOnMobile: !preferences.autoCollapseQueueOnMobile };
    setPreferences(newPreferences);
    if (typeof window !== "undefined") {
      localStorage.setItem("optometrist_panel_preferences", JSON.stringify(newPreferences));
    }
  };

  return {
    preferences,
    toggleQueue,
    toggleStats,
    setQueueFilter,
    toggleAutoCollapseQueueOnMobile,
  };
}
