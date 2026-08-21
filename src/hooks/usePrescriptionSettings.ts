import { useState, useEffect, useCallback } from "react";
import type { FrequencyDisplayFormat } from "@/utils/frequencyDisplay";

const STORAGE_KEY = "hms_prescription_frequency_format";
const EVENT_KEY = "hms-frequency-format-changed";

export function usePrescriptionSettings(doctorId?: string) {
  const [frequencyFormat, setFrequencyFormatState] = useState<FrequencyDisplayFormat>("numeric");

  // Load from localStorage
  useEffect(() => {
    try {
      const savedKey = doctorId ? `${STORAGE_KEY}_${doctorId}` : STORAGE_KEY;
      const saved = localStorage.getItem(savedKey) || localStorage.getItem(STORAGE_KEY);
      if (saved === "numeric" || saved === "descriptive" || saved === "both") {
        setFrequencyFormatState(saved);
      }
    } catch (e) {
      console.error("Failed to load frequency format setting", e);
    }
  }, [doctorId]);

  // Listen for changes from other components/modals
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent<FrequencyDisplayFormat>) => {
      if (e.detail && (e.detail === "numeric" || e.detail === "descriptive" || e.detail === "both")) {
        setFrequencyFormatState(e.detail);
      }
    };

    window.addEventListener(EVENT_KEY as any, handleStorageChange as EventListener);
    return () => {
      window.removeEventListener(EVENT_KEY as any, handleStorageChange as EventListener);
    };
  }, []);

  const setFrequencyFormat = useCallback((format: FrequencyDisplayFormat) => {
    setFrequencyFormatState(format);
    try {
      const savedKey = doctorId ? `${STORAGE_KEY}_${doctorId}` : STORAGE_KEY;
      localStorage.setItem(savedKey, format);
      localStorage.setItem(STORAGE_KEY, format);
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: format }));
    } catch (e) {
      console.error("Failed to save frequency format setting", e);
    }
  }, [doctorId]);

  return {
    frequencyFormat,
    setFrequencyFormat,
  };
}
