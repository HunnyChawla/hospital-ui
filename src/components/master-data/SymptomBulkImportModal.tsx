"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { bulkCreateSymptoms } from "@/redux/symptomsSlice";
import { CreateSymptomRequest } from "@/services/symptomsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { Upload, FileJson, AlertCircle } from "lucide-react";

type SymptomBulkImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId?: string;
};

export function SymptomBulkImportModal({ isOpen, onClose, onSuccess, tenantId }: SymptomBulkImportModalProps) {
    const dispatch = useAppDispatch();
    const [jsonInput, setJsonInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setValidationError(null);

        // Validate JSON
        let parsedData: CreateSymptomRequest[];
        try {
            parsedData = JSON.parse(jsonInput);

            if (!Array.isArray(parsedData)) {
                setValidationError("Input must be a JSON array");
                return;
            }

            if (parsedData.length === 0) {
                setValidationError("Array cannot be empty");
                return;
            }

            // Validate each symptom object
            for (let i = 0; i < parsedData.length; i++) {
                const item = parsedData[i];
                if (!item.symptom_name || !item.category) {
                    setValidationError(
                        `Item at index ${i} is missing required fields (symptom_name, category)`
                    );
                    return;
                }

                // Validate category
                const validCategories = ["Visual", "Pain", "Redness", "Discharge", "Neuro"];
                if (!validCategories.includes(item.category)) {
                    setValidationError(
                        `Item at index ${i} has invalid category. Must be one of: ${validCategories.join(", ")}`
                    );
                    return;
                }
            }
        } catch (error) {
            setValidationError("Invalid JSON format");
            return;
        }

        // Submit bulk import
        try {
            setIsSubmitting(true);
            await dispatch(bulkCreateSymptoms({ symptoms: parsedData, tenantId })).unwrap();
            toast.success(`Successfully imported ${parsedData.length} symptoms`);
            setJsonInput("");
            onSuccess();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const exampleJson = `[
  {
    "symptom_name": "Blurred Vision",
    "category": "Visual",
    "description": "Difficulty seeing clearly",
    "is_eye_specific": true,
    "applicable_eye": "BOTH",
    "display_order": 1
  },
  {
    "symptom_name": "Eye Pain",
    "category": "Pain",
    "description": "Aching or sharp pain in the eye",
    "is_eye_specific": true,
    "applicable_eye": "BOTH",
    "display_order": 2
  },
  {
    "symptom_name": "Headache",
    "category": "Neuro",
    "description": "Head pain",
    "is_eye_specific": false,
    "applicable_eye": "NA"
  }
]`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Symptoms" size="lg">
            <div className="space-y-4 p-1">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <div className="flex gap-2">
                        <FileJson className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">JSON Format Instructions</p>
                            <p className="text-xs">
                                Paste a JSON array of symptom objects. Each object must have{" "}
                                <code className="bg-blue-100 px-1 rounded">symptom_name</code> and{" "}
                                <code className="bg-blue-100 px-1 rounded">category</code> (Visual, Pain, Redness, Discharge, or Neuro).
                                Optional fields: description, is_eye_specific, applicable_eye (LEFT, RIGHT, BOTH, NA), display_order.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        JSON Input <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => {
                            setJsonInput(e.target.value);
                            setValidationError(null);
                        }}
                        rows={12}
                        placeholder={exampleJson}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400"
                    />
                    {validationError && (
                        <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2">
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-700">{validationError}</p>
                        </div>
                    )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Example JSON:</p>
                    <pre className="text-xs text-slate-600 overflow-x-auto">{exampleJson}</pre>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !jsonInput.trim()}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
                    >
                        <Upload className="h-4 w-4" />
                        {isSubmitting ? "Importing..." : "Import Symptoms"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
