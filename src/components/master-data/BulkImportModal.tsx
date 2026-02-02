"use client";

import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { bulkCreateDiagnoses } from "@/redux/diagnosesSlice";
import { CreateDiagnosisRequest } from "@/services/diagnosesApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import { Upload, FileJson, AlertCircle } from "lucide-react";

type BulkImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId?: string;
};

export function BulkImportModal({ isOpen, onClose, onSuccess, tenantId }: BulkImportModalProps) {
    const dispatch = useAppDispatch();
    const [jsonInput, setJsonInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setValidationError(null);

        // Validate JSON
        let parsedData: CreateDiagnosisRequest[];
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

            // Validate each diagnosis object
            for (let i = 0; i < parsedData.length; i++) {
                const item = parsedData[i];
                if (!item.diagnosis_code || !item.diagnosis_name) {
                    setValidationError(
                        `Item at index ${i} is missing required fields (diagnosis_code, diagnosis_name)`
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
            await dispatch(bulkCreateDiagnoses({ diagnoses: parsedData, tenantId })).unwrap();
            toast.success(`Successfully imported ${parsedData.length} diagnoses`);
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
    "diagnosis_code": "D001",
    "diagnosis_name": "Type 2 Diabetes Mellitus",
    "description": "Non-insulin-dependent diabetes mellitus",
    "category": "Endocrine",
    "status": "active",
    "icd_10_code": "E11",
    "icd_11_code": "5A14"
  },
  {
    "diagnosis_code": "D002",
    "diagnosis_name": "Essential Hypertension",
    "category": "Cardiovascular",
    "status": "active",
    "icd_10_code": "I10"
  }
]`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Diagnoses" size="lg">
            <div className="space-y-4 p-1">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <div className="flex gap-2">
                        <FileJson className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">JSON Format Instructions</p>
                            <p className="text-xs">
                                Paste a JSON array of diagnosis objects. Each object must have{" "}
                                <code className="bg-blue-100 px-1 rounded">diagnosis_code</code> and{" "}
                                <code className="bg-blue-100 px-1 rounded">diagnosis_name</code>.
                                Optional fields: description, category, status, icd_10_code, icd_11_code.
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
                        {isSubmitting ? "Importing..." : "Import Diagnoses"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
