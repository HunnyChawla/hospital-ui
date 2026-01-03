"use client";

import { useState, useEffect, useCallback } from "react";
import type { OptometryPrescriptionItem } from "@/types";

export interface OptometryPrescriptionTemplate {
  id: string;
  name: string;
  description?: string;
  diagnosis?: string;
  items: OptometryPrescriptionItem[];
  pupillary_distance: number | null;
  frame_fitting_notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "optometry_prescription_templates";

const generateId = (): string => {
  return `opt_template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useOptometryPrescriptionTemplates = () => {
  const [templates, setTemplates] = useState<OptometryPrescriptionTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OptometryPrescriptionTemplate[];
        setTemplates(parsed);
      }
    } catch (error) {
      console.error("Failed to load optometry prescription templates:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save templates to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      } catch (error) {
        console.error("Failed to save optometry prescription templates:", error);
      }
    }
  }, [templates, isLoaded]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as OptometryPrescriptionTemplate[];
          setTemplates(parsed);
        } catch (error) {
          console.error("Failed to parse optometry prescription templates from storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const saveTemplate = useCallback(
    (template: Omit<OptometryPrescriptionTemplate, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newTemplate: OptometryPrescriptionTemplate = {
        ...template,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      return newTemplate;
    },
    []
  );

  const updateTemplate = useCallback(
    (id: string, updates: Partial<Omit<OptometryPrescriptionTemplate, "id" | "createdAt">>) => {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === id
            ? { ...template, ...updates, updatedAt: new Date().toISOString() }
            : template
        )
      );
    },
    []
  );

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  }, []);

  const getTemplate = useCallback(
    (id: string): OptometryPrescriptionTemplate | undefined => {
      return templates.find((template) => template.id === id);
    },
    [templates]
  );

  const duplicateTemplate = useCallback(
    (id: string, newName?: string): OptometryPrescriptionTemplate | undefined => {
      const original = templates.find((template) => template.id === id);
      if (!original) return undefined;

      const now = new Date().toISOString();
      const newTemplate: OptometryPrescriptionTemplate = {
        ...original,
        id: generateId(),
        name: newName || `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      return newTemplate;
    },
    [templates]
  );

  return {
    templates,
    isLoaded,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    duplicateTemplate,
  };
};
