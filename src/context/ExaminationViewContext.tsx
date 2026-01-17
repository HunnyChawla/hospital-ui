"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ExaminationViewMode = "tabs" | "single" | "compact";

export interface ExaminationViewPreferences {
    viewMode: ExaminationViewMode;
    collapsedSections: string[];
}

interface ExaminationViewContextType {
    viewMode: ExaminationViewMode;
    collapsedSections: string[];
    setViewMode: (mode: ExaminationViewMode) => void;
    toggleViewMode: () => void;
    toggleSection: (sectionId: string) => void;
    isSectionCollapsed: (sectionId: string) => boolean;
    expandAllSections: () => void;
    collapseAllSections: (sectionIds: string[]) => void;
}

const DEFAULT_PREFERENCES: ExaminationViewPreferences = {
    viewMode: "tabs",
    collapsedSections: ["previous_history"],
};

const STORAGE_KEY = "examination_view_preferences";

const ExaminationViewContext = createContext<ExaminationViewContextType | undefined>(undefined);

export function useExaminationViewContext() {
    const context = useContext(ExaminationViewContext);
    if (context === undefined) {
        throw new Error("useExaminationViewContext must be used within an ExaminationViewProvider");
    }
    return context;
}

export function ExaminationViewProvider({ children }: { children: React.ReactNode }) {
    // Initialize preferences from localStorage or defaults
    const [preferences, setPreferences] = useState<ExaminationViewPreferences>(DEFAULT_PREFERENCES);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
                } catch {
                    // Keep default preferences on error
                }
            }
            setIsInitialized(true);
        }
    }, []);

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

    // Don't render until initialized to avoid hydration mismatch
    if (!isInitialized) {
        return null;
    }

    const value = {
        viewMode: preferences.viewMode,
        collapsedSections: preferences.collapsedSections,
        setViewMode,
        toggleViewMode,
        toggleSection,
        isSectionCollapsed,
        expandAllSections,
        collapseAllSections,
    };

    return (
        <ExaminationViewContext.Provider value={value}>
            {children}
        </ExaminationViewContext.Provider>
    );
}
