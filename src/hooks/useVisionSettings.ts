import { useState, useEffect } from "react";

export interface VisionSettings {
    useFullQuickSelect: boolean;
}

export const DEFAULT_VISION_SETTINGS: VisionSettings = {
    useFullQuickSelect: false,
};

export function useVisionSettings() {
    const [settings, setSettings] = useState<VisionSettings>(DEFAULT_VISION_SETTINGS);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("vision-settings");
        if (saved) {
            try {

                setSettings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse vision settings", e);
            }
        }
    }, []);

    const updateSettings = (newSettings: VisionSettings) => {
        setSettings(newSettings);
        localStorage.setItem("vision-settings", JSON.stringify(newSettings));
    };

    return {
        settings,
        updateSettings,
        isSettingsOpen,
        setIsSettingsOpen,
    };
}
