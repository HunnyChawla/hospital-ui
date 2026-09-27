"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { bulkCreateVaccines } from "@/redux/vaccinesSlice";
import { CreateVaccineMasterRequest } from "@/services/vaccinesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { Upload, FileJson, AlertCircle, CheckCircle2, Globe, Copy, Check } from "lucide-react";
import { isPlatformOwner } from "@/utils/auth";

type VaccineBulkImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId?: string;
};

export function VaccineBulkImportModal({
    isOpen,
    onClose,
    onSuccess,
    tenantId,
}: VaccineBulkImportModalProps) {
    const dispatch = useAppDispatch();
    const [jsonInput, setJsonInput] = useState("");
    const [isGlobal, setIsGlobal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isPlatformOwnerUser = isPlatformOwner();

    const exampleJson = `[
  {
    "code": "BCG",
    "name": "Bacillus Calmette–Guérin (BCG)",
    "short_name": "BCG",
    "vaccine_type": "Live Attenuated",
    "disease": "Tuberculosis",
    "route": "Intradermal",
    "administration_site": "Left upper arm (deltoid insertion)",
    "dose_volume": 0.1,
    "dose_unit": "mL",
    "doses_required": 1,
    "minimum_age_days": 0,
    "maximum_age_days": 365,
    "storage_min_temp": 2.0,
    "storage_max_temp": 8.0,
    "schedule_hint": "At birth",
    "is_active": true
  },
  {
    "code": "OPV",
    "name": "Oral Polio Vaccine (OPV)",
    "short_name": "OPV",
    "vaccine_type": "Live Attenuated (Oral)",
    "disease": "Poliomyelitis",
    "route": "Oral",
    "administration_site": "Oral cavity",
    "dose_volume": 2.0,
    "dose_unit": "drops",
    "doses_required": 4,
    "storage_min_temp": -20.0,
    "storage_max_temp": 8.0,
    "schedule_hint": "Birth, 6, 10, 14 weeks",
    "is_active": true
  }
]`;

    const handleCopyExample = () => {
        navigator.clipboard.writeText(exampleJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Example JSON copied to clipboard");
    };

    const handleFillExample = () => {
        setJsonInput(exampleJson);
    };

    const handleSubmit = async () => {
        setValidationError(null);

        let parsedData: CreateVaccineMasterRequest[];
        try {
            parsedData = JSON.parse(jsonInput);

            if (!Array.isArray(parsedData)) {
                setValidationError("Input must be a valid JSON array of vaccine objects");
                return;
            }

            if (parsedData.length === 0) {
                setValidationError("JSON array cannot be empty");
                return;
            }

            for (let i = 0; i < parsedData.length; i++) {
                const item = parsedData[i];
                if (!item.code || !item.name) {
                    setValidationError(
                        `Item at index ${i} is missing required fields (code, name)`
                    );
                    return;
                }
            }
        } catch (error) {
            setValidationError("Invalid JSON syntax. Please check brackets, quotes, and commas.");
            return;
        }

        try {
            setIsSubmitting(true);
            await dispatch(
                bulkCreateVaccines({
                    data: { vaccines: parsedData },
                    isGlobal: isPlatformOwnerUser && isGlobal,
                    tenantId: isGlobal ? undefined : (tenantId || undefined),
                })
            ).unwrap();

            toast.success(`Successfully imported ${parsedData.length} vaccines!`);
            setJsonInput("");
            onSuccess();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Vaccines" size="lg">
            <div className="space-y-4 p-1 text-sm">
                {/* Global vs Tenant switch for Platform Owner */}
                {isPlatformOwnerUser && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-sky-600 shrink-0" />
                            <div>
                                <p className="font-semibold text-slate-800 text-xs">Import into Global Master</p>
                                <p className="text-xs text-slate-500">Available to all hospital tenants</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isGlobal}
                                onChange={(e) => setIsGlobal(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                        </label>
                    </div>
                )}

                {/* Instructions */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                            <FileJson className="h-4 w-4 text-slate-600" />
                            JSON Schema Format
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleFillExample}
                                className="text-xs text-sky-600 hover:text-sky-700 font-medium underline cursor-pointer"
                            >
                                Insert Sample
                            </button>
                            <button
                                type="button"
                                onClick={handleCopyExample}
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer"
                            >
                                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Paste a JSON array of vaccine objects. Required fields: <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">code</code> and <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">name</code>.
                    </p>
                </div>

                {/* JSON Input Area */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                        JSON Array Content
                    </label>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => {
                            setJsonInput(e.target.value);
                            setValidationError(null);
                        }}
                        rows={10}
                        placeholder='[{"code": "BCG", "name": "Bacillus Calmette–Guérin (BCG)", ...}]'
                        className="w-full font-mono text-xs rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                </div>

                {/* Error Banner */}
                {validationError && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                            <p className="font-semibold">Validation Error</p>
                            <p>{validationError}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !jsonInput.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {isSubmitting ? "Importing..." : "Start Import"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
