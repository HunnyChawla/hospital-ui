"use client";

import React from "react";
import { Check, Plus, Droplets, Pill, Eye, X } from "lucide-react";
import clsx from "clsx";

// ====================
// Diagnosis Quick Select
// ====================

interface DiagnosisChipsProps {
    options: readonly { readonly label: string; readonly value: string; readonly category?: string }[];
    selected: string[];
    onToggle: (value: string) => void;
    className?: string;
}

export function DiagnosisChips({
    options,
    selected,
    onToggle,
    className,
}: DiagnosisChipsProps) {
    return (
        <div className={clsx("flex flex-wrap gap-2", className)}>
            {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onToggle(option.value)}
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
                            isSelected
                                ? "bg-sky-500 border-sky-600 text-white shadow-md shadow-sky-500/20"
                                : "bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50 hover:shadow-sm"
                        )}
                    >
                        {isSelected && <Check className="h-3 w-3 animate-in zoom-in duration-200" />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

// ====================
// Medicine Quick Select
// ====================

type MedicineColor = "sky" | "purple" | "emerald" | "amber" | "rose";
type MedicineIcon = "droplets" | "pill" | "eye";

interface MedicineQuickOption {
    id: string;
    label: string;
    icon: MedicineIcon;
    color: MedicineColor;
}

interface MedicineQuickChipsProps {
    options: readonly MedicineQuickOption[];
    addedIds?: string[];
    onAdd: (id: string) => void;
    className?: string;
}

const iconMap = {
    droplets: Droplets,
    pill: Pill,
    eye: Eye,
};

const colorMap: Record<MedicineColor, string> = {
    sky: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
    amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300",
    rose: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
};

const disabledColorMap: Record<MedicineColor, string> = {
    sky: "bg-slate-100 text-slate-400 border-slate-200",
    purple: "bg-slate-100 text-slate-400 border-slate-200",
    emerald: "bg-slate-100 text-slate-400 border-slate-200",
    amber: "bg-slate-100 text-slate-400 border-slate-200",
    rose: "bg-slate-100 text-slate-400 border-slate-200",
};

export function MedicineQuickChips({
    options,
    addedIds = [],
    onAdd,
    className,
}: MedicineQuickChipsProps) {
    return (
        <div className={clsx("flex flex-wrap gap-2", className)}>
            {options.map((option) => {
                const Icon = iconMap[option.icon];
                const isAdded = addedIds.includes(option.id);
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onAdd(option.id)}
                        disabled={isAdded}
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                            isAdded
                                ? "cursor-not-allowed opacity-60"
                                : "hover:scale-105 active:scale-95",
                            isAdded ? disabledColorMap[option.color] : colorMap[option.color]
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {option.label}
                        {isAdded ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Plus className="h-3 w-3 opacity-60" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ====================
// Follow-up Quick Select
// ====================

interface FollowupQuickOption {
    label: string;
    days: number;
    display: string;
}

interface FollowupQuickChipsProps {
    options: readonly FollowupQuickOption[];
    selectedDays: number | null;
    onSelect: (days: number) => void;
    onCustom: () => void;
    className?: string;
}

export function FollowupQuickChips({
    options,
    selectedDays,
    onSelect,
    onCustom,
    className,
}: FollowupQuickChipsProps) {
    return (
        <div className={clsx("flex flex-wrap gap-1.5", className)}>
            {options.map((option) => {
                const isSelected = selectedDays === option.days;
                return (
                    <button
                        key={option.days}
                        type="button"
                        onClick={() => onSelect(option.days)}
                        title={option.display}
                        className={clsx(
                            "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                            isSelected
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-700"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
            <button
                type="button"
                onClick={onCustom}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition"
            >
                📅 Custom
            </button>
        </div>
    );
}

// ====================
// Advice Quick Select
// ====================

interface AdviceQuickOption {
    id: string;
    label: string;
    category: string;
}

interface AdviceQuickChipsProps {
    options: readonly AdviceQuickOption[];
    addedIds: string[];
    onAdd: (id: string) => void;
    className?: string;
}

const categoryColorMap: Record<string, string> = {
    "General": "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
    "Post-Op": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    "Pre-Op": "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    "Infection": "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    "Allergy": "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    "other": "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100", // Fallback
};

export function AdviceQuickChips({
    options,
    addedIds,
    onAdd,
    className,
}: AdviceQuickChipsProps) {
    return (
        <div className={clsx("flex flex-wrap gap-1.5", className)}>
            {options.map((option) => {
                const isAdded = addedIds.includes(option.id);
                // Fallback for unknown categories
                const colorClass = categoryColorMap[option.category] || categoryColorMap.other;

                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onAdd(option.id)}
                        disabled={isAdded}
                        className={clsx(
                            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                            isAdded
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : colorClass
                        )}
                    >
                        {option.label}
                        {isAdded ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Plus className="h-3 w-3 opacity-60" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ====================
// Selected Items Display
// ====================

interface SelectedDiagnosesProps {
    diagnoses: string[];
    onRemove: (value: string) => void;
    className?: string;
}

export function SelectedDiagnoses({
    diagnoses,
    onRemove,
    className,
}: SelectedDiagnosesProps) {
    if (diagnoses.length === 0) return null;

    return (
        <div className={clsx("flex flex-wrap gap-2", className)}>
            {diagnoses.map((diagnosis) => (
                <span
                    key={diagnosis}
                    className="group inline-flex items-center gap-1.5 rounded-md bg-white border border-sky-100 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                    {diagnosis}
                    <button
                        type="button"
                        onClick={() => onRemove(diagnosis)}
                        className="ml-1 rounded p-0.5 text-sky-400 opacity-60 hover:bg-sky-50 hover:text-sky-600 hover:opacity-100 transition-all"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </span>
            ))}
        </div>
    );
}

// ====================
// Lab Test Quick Select
// ====================

interface LabTestQuickOption {
    id: string;
    label: string;
    category: string;
}

interface LabTestQuickChipsProps {
    options: readonly LabTestQuickOption[];
    addedIds: string[];
    onAdd: (id: string) => void;
    className?: string;
}

const labCategoryColorMap: Record<string, string> = {
    "Hematology": "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    "Biochemistry": "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    "Microbiology": "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    "Pathology": "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    "Serology": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    "Other": "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
};

export function LabTestQuickChips({
    options,
    addedIds,
    onAdd,
    className,
}: LabTestQuickChipsProps) {
    return (
        <div className={clsx("flex flex-wrap gap-1.5", className)}>
            {options.map((option) => {
                const isAdded = addedIds.includes(option.id);
                const colorClass = labCategoryColorMap[option.category] || labCategoryColorMap.Other;

                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onAdd(option.id)}
                        disabled={isAdded}
                        className={clsx(
                            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                            isAdded
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : colorClass
                        )}
                    >
                        {option.label}
                        {isAdded ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Plus className="h-3 w-3 opacity-60" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
