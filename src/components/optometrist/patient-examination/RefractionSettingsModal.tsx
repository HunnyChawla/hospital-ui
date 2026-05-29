"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { Settings, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

interface SettingRange {
    min: number;
    max: number;
    gap: number;
}

export interface RefractionSettings {
    sphere: SettingRange;
    cylinder: SettingRange;
    axis: SettingRange;
    add_power: SettingRange;
}

export const DEFAULT_REFRACTION_SETTINGS: RefractionSettings = {
    sphere: { min: -10, max: 10, gap: 0.5 },
    cylinder: { min: -6, max: 6, gap: 0.25 },
    axis: { min: 0, max: 180, gap: 10 },
    add_power: { min: 0.75, max: 4, gap: 0.25 },
};

interface RefractionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: RefractionSettings;
    onSave: (settings: RefractionSettings) => void;
}

type TabType = "sphere" | "cylinder" | "axis" | "add_power";

export function RefractionSettingsModal({
    isOpen,
    onClose,
    currentSettings,
    onSave,
}: RefractionSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("sphere");
    const [settings, setSettings] = useState<RefractionSettings>(currentSettings);

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSettings(currentSettings);
        }
    }, [isOpen, currentSettings]);

    const handleUpdate = (field: TabType, key: keyof SettingRange, value: string) => {
        const numValue = parseFloat(value);

        setSettings((prev) => ({
            ...prev,
            [field]: {
                ...prev[field],
                [key]: isNaN(numValue) ? 0 : numValue,
            },
        }));
    };

    const handleSave = () => {
        // Basic validation
        for (const key of Object.keys(settings) as TabType[]) {
            const { min, max, gap } = settings[key];
            if (min >= max) {
                toast.error(`Invalid range for ${key}: Min must be less than Max`);
                return;
            }
            if (gap <= 0) {
                toast.error(`Invalid gap for ${key}: Gap must be positive`);
                return;
            }
            // Safety check to prevent too many buttons
            const steps = (max - min) / gap;
            if (steps > 250) {
                toast.error(`Too many steps for ${key}. Please increase gap or reduce range.`);
                return;
            }
        }

        onSave(settings);
        onClose();
        toast.success("Refraction settings saved");
    };

    const handleResetDefaults = () => {
        if (confirm("Reset all settings to defaults?")) {
            setSettings(DEFAULT_REFRACTION_SETTINGS);
        }
    };

    const tabs: { id: TabType; label: string }[] = [
        { id: "sphere", label: "Sphere" },
        { id: "cylinder", label: "Cylinder" },
        { id: "axis", label: "Axis" },
        { id: "add_power", label: "Add Power" },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-slate-500" />
                    <span>Refraction Quick Button Settings</span>
                </div>
            }
            size="md"
        >
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium transition-colors relative",
                                activeTab === tab.id
                                    ? "text-sky-600"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-3 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Min Value
                        </label>
                        <input
                            type="number"
                            value={settings[activeTab].min}
                            onChange={(e) => handleUpdate(activeTab, "min", e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            step={activeTab === "axis" ? 1 : 0.25}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Max Value
                        </label>
                        <input
                            type="number"
                            value={settings[activeTab].max}
                            onChange={(e) => handleUpdate(activeTab, "max", e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            step={activeTab === "axis" ? 1 : 0.25}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Gap (Step)
                        </label>
                        <input
                            type="number"
                            value={settings[activeTab].gap}
                            onChange={(e) => handleUpdate(activeTab, "gap", e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            step={activeTab === "axis" ? 1 : 0.25}
                            min="0.01"
                        />
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Preview (First 10 buttons)</h4>
                    <div className="flex flex-wrap gap-2">
                        {(() => {
                            const { min, max, gap } = settings[activeTab];
                            if (min >= max || gap <= 0) return <span className="text-sm text-red-500">Invalid range</span>;

                            const buttons = [];
                            let current = min;
                            while (current <= max && buttons.length < 250) {
                                buttons.push(current);
                                current += gap;
                                current = Math.round(current * 100) / 100;
                            }

                            const negativeButtons = buttons.filter(b => b < 0).sort((a, b) => b - a);
                            const positiveButtons = buttons.filter(b => b >= 0).sort((a, b) => a - b);
                            const sortedButtons = [...negativeButtons, ...positiveButtons].slice(0, 10);

                            return sortedButtons.map((val, idx) => (
                                <div key={idx} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 font-medium">
                                    {val > 0 ? `+${val}` : val}
                                </div>
                            ));
                        })()}
                        {
                            (settings[activeTab].max - settings[activeTab].min) / settings[activeTab].gap > 10 && (
                                <span className="text-xs text-slate-400 self-center">... and more</span>
                            )
                        }
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset Defaults
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition"
                        >
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
