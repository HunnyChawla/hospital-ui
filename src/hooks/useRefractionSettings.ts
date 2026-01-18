import { useState, useEffect, useMemo } from "react";
import { RefractionSettings, DEFAULT_REFRACTION_SETTINGS } from "../components/optometrist/patient-examination/RefractionSettingsModal";

export function useRefractionSettings() {
    const [settings, setSettings] = useState<RefractionSettings>(DEFAULT_REFRACTION_SETTINGS);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("refraction-settings");
        if (saved) {
            try {
                setSettings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse refraction settings", e);
            }
        }
    }, []);

    const updateSettings = (newSettings: RefractionSettings) => {
        setSettings(newSettings);
        localStorage.setItem("refraction-settings", JSON.stringify(newSettings));
    };

    const generatePresets = (min: number, max: number, gap: number): number[] => {
        if (min >= max || gap <= 0) return [];
        const presets = [];
        let current = min;
        // Safety break to prevent infinite loops or massive arrays
        let iterations = 0;
        while (current <= max && iterations < 200) {
            // Handle floating point precision issues
            const val = Math.round(current * 100) / 100;
            presets.push(val);
            current += gap;
            iterations++;
        }
        return presets;
    };

    const spherePresets = useMemo(() =>
        generatePresets(settings.sphere.min, settings.sphere.max, settings.sphere.gap),
        [settings.sphere]
    );

    const cylinderPresets = useMemo(() =>
        generatePresets(settings.cylinder.min, settings.cylinder.max, settings.cylinder.gap),
        [settings.cylinder]
    );

    const axisPresets = useMemo(() =>
        generatePresets(settings.axis.min, settings.axis.max, settings.axis.gap),
        [settings.axis]
    );

    const addPowerPresets = useMemo(() =>
        generatePresets(settings.add_power.min, settings.add_power.max, settings.add_power.gap),
        [settings.add_power]
    );

    return {
        settings,
        updateSettings,
        isSettingsOpen,
        setIsSettingsOpen,
        spherePresets,
        cylinderPresets,
        axisPresets,
        addPowerPresets
    };
}
