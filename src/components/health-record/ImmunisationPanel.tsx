"use client";

import React, { useState } from "react";
import { Syringe, Plus, Trash2, Loader2 } from "lucide-react";
import {
    usePatientImmunisations,
    useVaccines,
    useRecordImmunisation,
    useDeleteImmunisation,
} from "@/hooks/queries/useHealthRecord";

interface ImmunisationPanelProps {
    patientId: string | null;
    /** The visit this is being given during, when there is one. Often there is not. */
    episodeId?: string | null;
}

const ROUTES = ["Intramuscular", "Subcutaneous", "Oral", "Intradermal", "Intranasal"];
const SITES = ["Left arm", "Right arm", "Left thigh", "Right thigh", "Oral", "Nasal"];

/**
 * A patient's immunisation history, and recording a new dose.
 *
 * Scoped to "record what was given" — no schedule engine, no due dates, no
 * recall. Those are a real feature in their own right, and a half-built
 * schedule that tells a parent the wrong due date is worse than none.
 */
export function ImmunisationPanel({ patientId, episodeId }: ImmunisationPanelProps) {
    const { data: vaccines } = useVaccines();
    const { data: history, isLoading } = usePatientImmunisations(patientId);
    const record = useRecordImmunisation();
    const remove = useDeleteImmunisation();

    const [showForm, setShowForm] = useState(false);
    const [vaccineId, setVaccineId] = useState("");
    const [administeredOn, setAdministeredOn] = useState(
        () => new Date().toISOString().slice(0, 10)
    );
    const [doseNumber, setDoseNumber] = useState("");
    const [batchNumber, setBatchNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [route, setRoute] = useState("");
    const [site, setSite] = useState("");
    const [notes, setNotes] = useState("");

    if (!patientId) return null;

    const reset = () => {
        setVaccineId("");
        setDoseNumber("");
        setBatchNumber("");
        setExpiryDate("");
        setRoute("");
        setSite("");
        setNotes("");
        setShowForm(false);
    };

    const submit = () => {
        if (!vaccineId) return;
        record.mutate(
            {
                patient_id: patientId,
                vaccine_id: vaccineId,
                administered_on: administeredOn,
                episode_id: episodeId ?? null,
                dose_number: doseNumber ? Number(doseNumber) : null,
                batch_number: batchNumber || null,
                expiry_date: expiryDate || null,
                route: route || null,
                site: site || null,
                notes: notes || null,
            },
            { onSuccess: reset }
        );
    };

    const selected = vaccines?.find((v) => v.id === vaccineId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Syringe className="h-4 w-4 text-slate-500" />
                    Immunisations
                </h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Record a dose
                    </button>
                )}
            </div>

            {showForm && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Vaccine</span>
                            <select
                                value={vaccineId}
                                onChange={(e) => setVaccineId(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">Select…</option>
                                {(vaccines ?? []).map((vaccine) => (
                                    <option key={vaccine.id} value={vaccine.id}>
                                        {vaccine.name}
                                    </option>
                                ))}
                            </select>
                            {/* A hint, not a rule — the schedule varies by state
                                and by the child in front of you. */}
                            {selected?.schedule_hint && (
                                <span className="mt-1 block text-xs text-slate-500">
                                    Usually given: {selected.schedule_hint}
                                </span>
                            )}
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Given on</span>
                            <input
                                type="date"
                                value={administeredOn}
                                onChange={(e) => setAdministeredOn(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">
                                Dose number <span className="font-normal text-slate-400">(optional)</span>
                            </span>
                            <input
                                type="number"
                                min={1}
                                value={doseNumber}
                                onChange={(e) => setDoseNumber(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">
                                Batch <span className="font-normal text-slate-400">(optional)</span>
                            </span>
                            <input
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">
                                Expiry <span className="font-normal text-slate-400">(optional)</span>
                            </span>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Route</span>
                            <select
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">—</option>
                                {ROUTES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Site</span>
                            <select
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">—</option>
                                {SITES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm sm:col-span-2">
                            <span className="mb-1 block font-medium text-slate-700">Notes</span>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={reset}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submit}
                            disabled={!vaccineId || record.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50"
                        >
                            {record.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex h-24 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
            ) : (history ?? []).length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No immunisations recorded for this patient.
                </p>
            ) : (
                <ul className="space-y-2">
                    {(history ?? []).map((dose) => (
                        <li
                            key={dose.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {dose.vaccine_name}
                                    {dose.dose_number ? ` · dose ${dose.dose_number}` : ""}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {new Date(dose.administered_on).toLocaleDateString()}
                                    {dose.batch_number ? ` · batch ${dose.batch_number}` : ""}
                                    {dose.site ? ` · ${dose.site}` : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => remove.mutate(dose.id)}
                                disabled={remove.isPending}
                                title="Remove a record entered in error"
                                className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
