"use client";

import React, { useState } from "react";
import { Plus, Trash2, FlaskConical, ClipboardList } from "lucide-react";
import type { AdviceItemRequest } from "@/services/prescriptionsApi";

interface AdviceSectionProps {
    value: AdviceItemRequest[];
    onChange: (items: AdviceItemRequest[]) => void;
    followupDate: string | null;
    onFollowupDateChange: (value: string | null) => void;
    disabled?: boolean;
}

/**
 * Advice and tests on a general prescription.
 *
 * The eye prescription has recorded both since revision 053. The general one
 * recorded a diagnosis, notes and medicines — so an eye hospital could print
 * "come back in two weeks" and "get an FBS done" and a general hospital could
 * not, despite both being the most ordinary lines on an Indian OPD slip.
 *
 * Free text rather than a picker from the lab catalogue. A doctor writing
 * "X-ray, left knee" should not be blocked because nobody has added that exact
 * test to the master — `lab_test_id` stays null and the description is what
 * prints. Linking to the catalogue is worth doing when someone asks to order
 * and bill the test in one step.
 */
export function AdviceSection({
    value,
    onChange,
    followupDate,
    onFollowupDateChange,
    disabled = false,
}: AdviceSectionProps) {
    const [draft, setDraft] = useState("");
    const [draftType, setDraftType] = useState<"instruction" | "test">("instruction");

    const add = () => {
        const description = draft.trim();
        if (!description) return;
        onChange([...value, { advice_type: draftType, description }]);
        setDraft("");
    };

    const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Advice &amp; Follow-up
                </h3>
            </div>

            <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-slate-300">
                        {(["instruction", "test"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setDraftType(type)}
                                disabled={disabled}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                                    draftType === type
                                        ? "bg-sky-500 text-white"
                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {type === "test" ? (
                                    <FlaskConical className="h-3.5 w-3.5" />
                                ) : (
                                    <ClipboardList className="h-3.5 w-3.5" />
                                )}
                                {type === "test" ? "Test" : "Advice"}
                            </button>
                        ))}
                    </div>

                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        // Enter adds the line instead of submitting the whole
                        // prescription, which is what a doctor typing a list expects.
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                add();
                            }
                        }}
                        disabled={disabled}
                        placeholder={
                            draftType === "test"
                                ? "e.g. Fasting blood sugar"
                                : "e.g. Rest for three days, plenty of fluids"
                        }
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />

                    <button
                        type="button"
                        onClick={add}
                        disabled={disabled || !draft.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </button>
                </div>

                {value.length > 0 && (
                    <ul className="space-y-1.5">
                        {value.map((item, index) => (
                            <li
                                key={`${item.advice_type}-${item.description}-${index}`}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                                <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${
                                        item.advice_type === "test"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-sky-100 text-sky-700"
                                    }`}
                                >
                                    {item.advice_type === "test" ? "Test" : "Advice"}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                    {item.description}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeAt(index)}
                                    disabled={disabled}
                                    className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                    title="Remove"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Review on <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                        type="date"
                        value={followupDate ?? ""}
                        onChange={(e) => onFollowupDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>
            </div>
        </div>
    );
}
