"use client";

import React, { useState } from "react";
import { Syringe, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
    const { data: history, isLoading, isFetching, refetch } = usePatientImmunisations(patientId);
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

    const handleVaccineChange = (selectedId: string) => {
        setVaccineId(selectedId);
        const v = vaccines?.find((item) => item.id === selectedId);
        if (v) {
            if (!route && v.route) {
                // Find matching route or fallback
                const match = ROUTES.find((r) => r.toLowerCase() === v.route?.toLowerCase()) || v.route;
                setRoute(match);
            }
            if (!site && v.administration_site) {
                const match = SITES.find((s) => s.toLowerCase() === v.administration_site?.toLowerCase()) || v.administration_site;
                setSite(match);
            }
        }
    };

    const selected = vaccines?.find((v) => v.id === vaccineId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Syringe className="h-4 w-4 text-slate-500" />
                    Immunisations
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={async () => {
                            await refetch();
                            toast.success("Immunisation records refreshed");
                        }}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        title="Refresh Immunisations"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Record a dose
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm sm:col-span-2">
                            <span className="mb-1 block font-medium text-slate-700">Select Vaccine</span>
                            <select
                                value={vaccineId}
                                onChange={(e) => handleVaccineChange(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white"
                            >
                                <option value="">Select a vaccine from master...</option>
                                {(vaccines ?? []).map((vaccine) => (
                                    <option key={vaccine.id} value={vaccine.id}>
                                        {vaccine.code ? `[${vaccine.code}] ` : ""}{vaccine.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Selected Vaccine Clinical Highlights Card */}
                        {selected && (
                            <div className="sm:col-span-2 rounded-lg bg-sky-50/70 border border-sky-200 p-3 text-xs space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    {selected.disease && (
                                        <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                                            Protects against: {selected.disease}
                                        </span>
                                    )}
                                    {selected.vaccine_type && (
                                        <span className="text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-200 font-medium">
                                            Type: {selected.vaccine_type}
                                        </span>
                                    )}
                                    {selected.dose_volume !== null && selected.dose_volume !== undefined && (
                                        <span className="text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                                            Std Dose: {selected.dose_volume} {selected.dose_unit || "mL"}
                                        </span>
                                    )}
                                </div>
                                {selected.schedule_hint && (
                                    <p className="text-slate-600">
                                        <span className="font-semibold text-slate-700">Usually given:</span> {selected.schedule_hint}
                                    </p>
                                )}
                            </div>
                        )}

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
                                placeholder="e.g. 1, 2, 3"
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
                                placeholder="e.g. BATCH-98234"
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
                            <input
                                list="routes-datalist"
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                                placeholder="e.g. Intramuscular"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                            <datalist id="routes-datalist">
                                {ROUTES.map((r) => (
                                    <option key={r} value={r} />
                                ))}
                            </datalist>
                        </label>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Site</span>
                            <input
                                list="sites-datalist"
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                placeholder="e.g. Left upper arm"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                            <datalist id="sites-datalist">
                                {SITES.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </label>

                        <label className="text-sm sm:col-span-2">
                            <span className="mb-1 block font-medium text-slate-700">Notes</span>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Adverse reactions, manufacturer, specific observations..."
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={reset}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submit}
                            disabled={!vaccineId || record.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50 cursor-pointer"
                        >
                            {record.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save Dose
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
