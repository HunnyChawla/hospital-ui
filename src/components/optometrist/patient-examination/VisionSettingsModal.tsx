"use client";

import { Modal } from "@/components/common/Modal";
import { Settings, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { VisionSettings, DEFAULT_VISION_SETTINGS } from "@/hooks/useVisionSettings";
import { useState, useEffect } from "react";


// I'll stick to standard inputs for now to be safe, or check for Switch.
// Let's list common components first just to be sure.
// Actually, I'll use a checkbox for simplicity and robustness if I don't want to hunt for a Switch component right now,
// but let me quickly check if there is a common Switch component. 
// I'll do a quick check in the next turn if needed, but for now I will implement with a standard styled checkbox or button toggle.

interface VisionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: VisionSettings;
    onSave: (settings: VisionSettings) => void;
}

export function VisionSettingsModal({
    isOpen,
    onClose,
    currentSettings,
    onSave,
}: VisionSettingsModalProps) {
    const [settings, setSettings] = useState<VisionSettings>(currentSettings);

    useEffect(() => {
        if (isOpen) {
            setSettings(currentSettings);
        }
    }, [isOpen, currentSettings]);

    const handleSave = () => {
        onSave(settings);
        onClose();
        toast.success("Vision settings saved");
    };

    const handleResetDefaults = () => {
        if (confirm("Reset all settings to defaults?")) {
            setSettings(DEFAULT_VISION_SETTINGS);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-slate-500" />
                    <span>Vision Tab Settings</span>
                </div>
            }
            size="md"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-slate-900">
                                Full Quick Select Mode
                            </h4>
                            <p className="text-xs text-slate-500 max-w-[280px]">
                                Show all visual acuity options as clickable buttons instead of using a dropdown.
                                This uses more screen space but allows for faster selection.
                            </p>
                        </div>
                        <div className="flex items-center h-6">
                            <input
                                id="full-quick-select"
                                type="checkbox"
                                checked={settings.useFullQuickSelect}
                                onChange={(e) =>
                                    setSettings({ ...settings, useFullQuickSelect: e.target.checked })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                        </div>
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
