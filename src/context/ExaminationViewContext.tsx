"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
    MessageSquare,
    Eye,
    FileHeart,
    EyeOff,
    Activity,
    Glasses,
    Scan,
    AlertTriangle,
    History
} from "lucide-react";

export type ExaminationViewMode = "tabs" | "single" | "compact";

export interface ExaminationViewPreferences {
    viewMode: ExaminationViewMode;
    collapsedSections: string[];
    hiddenTabs: string[];
    useMergedVisionView?: boolean;
}

interface ExaminationViewContextType {
    viewMode: ExaminationViewMode;
    collapsedSections: string[];
    hiddenTabs: string[];
    useMergedVisionView: boolean;
    setViewMode: (mode: ExaminationViewMode) => void;
    toggleViewMode: () => void;
    toggleSection: (sectionId: string) => void;
    toggleTabVisibility: (tabId: string) => void;
    isSectionCollapsed: (sectionId: string) => boolean;
    expandAllSections: () => void;
    collapseAllSections: (sectionIds: string[]) => void;
    setUseMergedVisionView: (enabled: boolean) => void;
}

export const SECTION_CONFIG = [
    { id: "complaints", label: "Complaint", icon: MessageSquare },
    { id: "ophthalmic_history", label: "Eye Surgery", icon: Eye },
    { id: "medical_history", label: "Medical History", icon: FileHeart },
    { id: "vision", label: "Vision", icon: EyeOff },
    { id: "iop", label: "IOP", icon: Activity },
    { id: "refraction", label: "Refraction", icon: Glasses },
    { id: "ar_data", label: "Auto Refraction", icon: Scan },
    { id: "current_specs", label: "Current Specs", icon: Glasses },
    { id: "allergies", label: "Drug Allergy", icon: AlertTriangle },
    { id: "previous_history", label: "Previous History", icon: History },
] as const;

const DEFAULT_PREFERENCES: ExaminationViewPreferences = {
    viewMode: "tabs",
    collapsedSections: ["previous_history"],
    hiddenTabs: [],
    useMergedVisionView: false,
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
                    const parsed = JSON.parse(stored);
                    setPreferences({
                        ...DEFAULT_PREFERENCES,
                        ...parsed,
                        // Ensure hiddenTabs is initialized if it doesn't exist in stored prefs
                        hiddenTabs: parsed.hiddenTabs || [],
                        useMergedVisionView: typeof parsed.useMergedVisionView === "boolean" ? parsed.useMergedVisionView : false
                    });
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

    const toggleTabVisibility = useCallback((tabId: string) => {
        const isHidden = preferences.hiddenTabs.includes(tabId);
        const newHiddenTabs = isHidden
            ? preferences.hiddenTabs.filter((id) => id !== tabId)
            : [...preferences.hiddenTabs, tabId];
        savePreferences({ ...preferences, hiddenTabs: newHiddenTabs });
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

    const setUseMergedVisionView = useCallback((enabled: boolean) => {
        savePreferences({ ...preferences, useMergedVisionView: enabled });
    }, [preferences, savePreferences]);

    // Don't render until initialized to avoid hydration mismatch
    if (!isInitialized) {
        return null;
    }

    const value = {
        viewMode: preferences.viewMode,
        collapsedSections: preferences.collapsedSections,
        hiddenTabs: preferences.hiddenTabs,
        useMergedVisionView: preferences.useMergedVisionView ?? false,
        setViewMode,
        toggleViewMode,
        toggleSection,
        toggleTabVisibility,
        isSectionCollapsed,
        expandAllSections,
        collapseAllSections,
        setUseMergedVisionView,
    };


    return (
        <ExaminationViewContext.Provider value={value}>
            {children}
        </ExaminationViewContext.Provider>
    );
}
