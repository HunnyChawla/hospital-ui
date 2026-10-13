"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { labTestsApi, type LabTest } from "@/services/labTestsApi";
import type { QuickLabTest } from "@/services/quickPresetsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Loader2, Plus, FlaskConical } from "lucide-react";

interface CreateLabTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialName?: string;
    initialCategory?: QuickLabTest["category"];
    onSuccess: (createdTest: LabTest) => void;
}

const CATEGORIES: QuickLabTest["category"][] = [
    "Hematology",
    "Biochemistry",
    "Microbiology",
    "Pathology",
    "Serology",
    "Other",
];

export function CreateLabTestModal({
    isOpen,
    onClose,
    initialName = "",
    initialCategory = "Other",
    onSuccess,
}: CreateLabTestModalProps) {
    const [testName, setTestName] = useState("");
    const [testCode, setTestCode] = useState("");
    const [category, setCategory] = useState<QuickLabTest["category"]>("Other");
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    // Derive acronym/code from test name if possible
    const deriveTestCode = (name: string): string => {
        const cleaned = name.trim();
        if (!cleaned) return "";

        // If it's already short (<= 6 chars without spaces), just uppercase it
        if (!cleaned.includes(" ") && cleaned.length <= 6) {
            return cleaned.toUpperCase();
        }

        // Check if there is an acronym in parentheses e.g. "Humphrey Visual Field (HVF)"
        const parenMatch = cleaned.match(/\(([^)]+)\)/);
        if (parenMatch && parenMatch[1]) {
            return parenMatch[1].trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
        }

        // Otherwise generate acronym from words
        const words = cleaned.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
            return words.map(w => w[0]).join("").toUpperCase();
        }

        return cleaned.slice(0, 6).toUpperCase();
    };

    useEffect(() => {
        if (isOpen) {
            const name = initialName.trim();
            setTestName(name);
            setTestCode(deriveTestCode(name));
            setCategory(initialCategory || "Other");
            setPrice(0);
            setDescription("");
        }
    }, [isOpen, initialName, initialCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!testName.trim()) {
            toast.error("Test name is required");
            return;
        }

        if (!testCode.trim()) {
            toast.error("Test code is required");
            return;
        }

        setSaving(true);
        try {
            const created = await labTestsApi.create({
                test_name: testName.trim(),
                test_code: testCode.trim().toUpperCase(),
                category: category || "Other",
                price: Number(price) >= 0 ? Number(price) : 0,
                description: description.trim() || undefined,
            });

            toast.success(`Lab test "${created.test_name}" added to database`);
            onSuccess(created);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                        <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Add Lab Test to Database</h3>
                        <p className="text-xs text-slate-500">Create a new test catalog entry</p>
                    </div>
                </div>
            }
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Test Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => {
                                const newName = e.target.value;
                                setTestName(newName);
                                if (!testCode || testCode === deriveTestCode(testName)) {
                                    setTestCode(deriveTestCode(newName));
                                }
                            }}
                            placeholder="e.g. Humphrey Visual Field (HVF)"
                            required
                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Test Code <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={testCode}
                            onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                            placeholder="e.g. HVF"
                            maxLength={50}
                            required
                            className="w-full text-xs font-mono uppercase rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as QuickLabTest["category"])}
                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 bg-white"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Price (₹)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the lab test..."
                            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !testName.trim() || !testCode.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm disabled:opacity-50 transition"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Plus className="h-3.5 w-3.5" />
                                Create & Select
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
