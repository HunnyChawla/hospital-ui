"use client";

import { useState, useRef } from "react";
import { medicinesApi } from "@/services/medicinesApi";
import { toast } from "sonner";
import { Modal } from "../common/Modal";
import { Upload, FileSpreadsheet, AlertCircle, Download, CheckCircle2 } from "lucide-react";

type MedicineBulkImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId?: string;
};

export function MedicineBulkImportModal({ isOpen, onClose, onSuccess, tenantId }: MedicineBulkImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValidationErrors([]);
        setImportResult(null);
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
                toast.error("Please select a valid Excel file (.xlsx or .xls)");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            setIsDownloading(true);
            const blob = await medicinesApi.exportExcel(tenantId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `medicines_export_template.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Excel template downloaded successfully");
        } catch (error) {
            console.error("Failed to download template:", error);
            toast.error("Failed to download Excel template");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            toast.error("Please select a file first");
            return;
        }

        try {
            setIsSubmitting(true);
            setValidationErrors([]);
            setImportResult(null);
            
            const response = await medicinesApi.importExcel(selectedFile, tenantId);
            
            if (response.success) {
                toast.success(`Successfully imported ${response.imported} medicines!`);
                setImportResult({ imported: response.imported });
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                onSuccess();
            } else {
                setValidationErrors(response.errors || ["Unknown error during import"]);
                toast.error("Failed to import medicines. Check file errors.");
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || error.message || "Failed to upload file";
            // Check if error contains line errors separated by newlines
            if (typeof errorMsg === "string" && errorMsg.includes("\n")) {
                setValidationErrors(errorMsg.split("\n"));
            } else {
                setValidationErrors([errorMsg]);
            }
            toast.error("Failed to import medicines");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import/Update Medicines" size="lg">
            <div className="space-y-4 p-1 text-sm">
                
                {/* Information Callout */}
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
                    <div className="flex gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                        <div className="text-sky-800 space-y-1">
                            <p className="font-semibold text-sky-900">Excel Bulk Import Instructions</p>
                            <p className="text-xs leading-relaxed">
                                Upload an Excel file containing medicine data. To prevent errors, please download the template.
                            </p>
                            <ul className="list-disc pl-4 text-xs space-y-1 leading-relaxed">
                                <li><strong>Name</strong> column is mandatory.</li>
                                <li>Leave the <strong>ID</strong> column empty to insert a new medicine.</li>
                                <li>Keep the <strong>ID</strong> intact to update an existing medicine.</li>
                                <li>Active medicines will override global ones of the same name for your tenant.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Step 1: Download Template */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-slate-800">1. Download Template / Current Data</p>
                            <p className="text-xs text-slate-500">Get the current tenant medicines as an Excel sheet to edit or use as a template.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            disabled={isDownloading}
                            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 px-3.5 py-2 font-semibold transition disabled:opacity-60"
                        >
                            <Download className="h-4 w-4" />
                            {isDownloading ? "Downloading..." : "Download Excel"}
                        </button>
                    </div>
                </div>

                {/* Step 2: Upload File */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-4 bg-white">
                    <div>
                        <p className="font-semibold text-slate-800">2. Upload Updated Excel File</p>
                        <p className="text-xs text-slate-500">Select the saved Excel file to write updates and insert new records.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            className="hidden"
                            id="excel-file-upload"
                        />
                        <label
                            htmlFor="excel-file-upload"
                            className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-slate-300 hover:border-sky-400 hover:bg-slate-50 py-5 text-slate-600 transition"
                        >
                            <Upload className="h-5 w-5 text-slate-400" />
                            <span className="font-medium text-xs">
                                {selectedFile ? selectedFile.name : "Select Excel File (.xlsx, .xls)"}
                            </span>
                        </label>
                    </div>

                    {/* Import Errors display */}
                    {validationErrors.length > 0 && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-rose-800 font-semibold">
                                <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
                                <span>Excel Import Errors ({validationErrors.length})</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto text-xs text-rose-700 font-mono space-y-1 bg-white/50 rounded-lg p-2 border border-rose-100">
                                {validationErrors.map((err, i) => (
                                    <div key={i} className="py-0.5">{err}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Display */}
                    {importResult && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex gap-3 text-emerald-800">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                                <p className="font-semibold text-emerald-900">Import Successful!</p>
                                <p className="text-xs">Successfully processed and imported {importResult.imported} medicines in the system.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
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
                        disabled={isSubmitting || !selectedFile}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
                    >
                        <Upload className="h-4 w-4" />
                        {isSubmitting ? "Importing..." : "Upload & Import"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
