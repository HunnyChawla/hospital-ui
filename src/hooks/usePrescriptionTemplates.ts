"use client";

import { useState, useEffect, useCallback } from "react";

import type { TaperingStep } from "../types";

export interface PrescriptionTemplateItem {
  medicine_id?: string | null;
  medicine_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  tapering_steps?: TaperingStep[];
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description?: string;
  diagnosis?: string;
  items: PrescriptionTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "prescription_templates";

const generateId = (): string => {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const usePrescriptionTemplates = () => {
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PrescriptionTemplate[];
        setTemplates(parsed);
      }
    } catch (error) {
      console.error("Failed to load prescription templates:", error);
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
        console.error("Failed to save prescription templates:", error);
      }
    }
  }, [templates, isLoaded]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PrescriptionTemplate[];
          setTemplates(parsed);
        } catch (error) {
          console.error("Failed to parse prescription templates from storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const saveTemplate = useCallback(
    (template: Omit<PrescriptionTemplate, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newTemplate: PrescriptionTemplate = {
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
    (id: string, updates: Partial<Omit<PrescriptionTemplate, "id" | "createdAt">>) => {
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
    (id: string): PrescriptionTemplate | undefined => {
      return templates.find((template) => template.id === id);
    },
    [templates]
  );

  const duplicateTemplate = useCallback(
    (id: string, newName?: string): PrescriptionTemplate | undefined => {
      const original = templates.find((template) => template.id === id);
      if (!original) return undefined;

      const now = new Date().toISOString();
      const newTemplate: PrescriptionTemplate = {
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
