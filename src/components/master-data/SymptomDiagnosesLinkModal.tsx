"use client";

import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { symptomsApi, Symptom, DiagnosisSymptomMapRequest } from "@/services/symptomsApi";
import { diagnosesApi, Diagnosis } from "@/services/diagnosesApi";
import { Search, Loader2, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

type SymptomDiagnosesLinkModalProps = {
    isOpen: boolean;
    onClose: () => void;
    symptom: Symptom;
    tenantId?: string;
    onSuccess?: () => void;
};

interface DiagnosisWithMapping {
    id: string;
    diagnosis_name: string;
    diagnosis_code: string;
    category: string | null;
    isLinked: boolean;
    is_common?: boolean;
    is_key_symptom?: boolean;
    weight?: number;
    mappingId?: string;
}

export function SymptomDiagnosesLinkModal({
    isOpen,
    onClose,
    symptom,
    tenantId,
    onSuccess,
}: SymptomDiagnosesLinkModalProps) {
    const [diagnoses, setDiagnoses] = useState<DiagnosisWithMapping[]>([]);
    const [linkedDiagnoses, setLinkedDiagnoses] = useState<DiagnosisWithMapping[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDiagnoses, setSelectedDiagnoses] = useState<Set<string>>(new Set());
    const [linkProperties, setLinkProperties] = useState<
        Record<string, { is_common: boolean; is_key_symptom: boolean; weight: number }>
    >({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, symptom.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all diagnoses
            const diagnosesResponse = await diagnosesApi.list({
                page: 1,
                page_size: 100,
                status: "active",
                tenant_id: tenantId,
                include_global: true,
            });

            // We need to check which diagnoses have this symptom linked
            // For now, we'll load all and mark them as not linked (since we don't have the reverse API)
            // The user can still link from this side
            const diagnosesWithStatus: DiagnosisWithMapping[] = diagnosesResponse.items.map((diagnosis) => ({
                id: diagnosis.id,
                diagnosis_name: diagnosis.diagnosis_name,
                diagnosis_code: diagnosis.diagnosis_code,
                category: diagnosis.category,
                isLinked: false, // Will be updated when we load linked data
            }));

            // Load linked diagnoses by checking each diagnosis for this symptom
            const linkedDiagnoses: DiagnosisWithMapping[] = [];
            for (const diagnosis of diagnosesWithStatus) {
                try {
                    const linkedSymptoms = await symptomsApi.getSymptomsByDiagnosis(diagnosis.id, tenantId);
                    const linkInfo = linkedSymptoms.find((s) => s.symptom_id === symptom.id);
                    if (linkInfo) {
                        linkedDiagnoses.push({
                            ...diagnosis,
                            isLinked: true,
                            is_common: linkInfo.is_common,
                            is_key_symptom: linkInfo.is_key_symptom,
                            weight: linkInfo.weight || undefined,
                            mappingId: linkInfo.id,
                        });
                    }
                } catch (error) {
                    // Skip if error fetching symptoms for this diagnosis
                    continue;
                }
            }

            // Update diagnoses list with linked status
            const linkedIds = new Set(linkedDiagnoses.map((d) => d.id));
            const updatedDiagnoses = diagnosesWithStatus.map((d) => ({
                ...d,
                isLinked: linkedIds.has(d.id),
            }));

            setDiagnoses(updatedDiagnoses);
            setLinkedDiagnoses(linkedDiagnoses);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleDiagnosisToggle = (diagnosisId: string) => {
        const newSelected = new Set(selectedDiagnoses);
        if (newSelected.has(diagnosisId)) {
            newSelected.delete(diagnosisId);
            const newProps = { ...linkProperties };
            delete newProps[diagnosisId];
            setLinkProperties(newProps);
        } else {
            newSelected.add(diagnosisId);
            setLinkProperties({
                ...linkProperties,
                [diagnosisId]: {
                    is_common: false,
                    is_key_symptom: false,
                    weight: 5,
                },
            });
        }
        setSelectedDiagnoses(newSelected);
    };

    const handlePropertyChange = (
        diagnosisId: string,
        property: "is_common" | "is_key_symptom" | "weight",
        value: boolean | number
    ) => {
        setLinkProperties({
            ...linkProperties,
            [diagnosisId]: {
                ...linkProperties[diagnosisId],
                [property]: value,
            },
        });
    };

    const handleSaveLinks = async () => {
        setSaving(true);
        try {
            // Link selected diagnoses - send one request per diagnosis with symptom mapping
            for (const diagnosisId of selectedDiagnoses) {
                const props = linkProperties[diagnosisId];
                // Use bulk format even for single symptom
                await symptomsApi.linkToDiagnosis(
                    diagnosisId,
                    [{
                        symptom_id: symptom.id,
                        is_common: props.is_common,
                        is_key_symptom: props.is_key_symptom,
                        weight: props.weight,
                    }],
                    tenantId
                );
            }

            toast.success(`Successfully linked ${selectedDiagnoses.size} diagnosis/diagnoses`);
            setSelectedDiagnoses(new Set());
            setLinkProperties({});
            await loadData();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleUnlink = async (diagnosisId: string) => {
        try {
            await symptomsApi.unlinkFromDiagnosis(diagnosisId, symptom.id, tenantId);
            toast.success("Diagnosis unlinked successfully");
            await loadData();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const filteredDiagnoses = diagnoses.filter(
        (diagnosis) =>
            !diagnosis.isLinked &&
            (diagnosis.diagnosis_name.toLowerCase().includes(search.toLowerCase()) ||
                diagnosis.diagnosis_code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link Diagnoses to "${symptom.symptom_name}"`} size="lg">
            <div className="space-y-4">
                {/* Currently Linked Diagnoses */}
                {linkedDiagnoses.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <h3 className="text-sm font-semibold text-emerald-900 mb-3">
                            Currently Linked Diagnoses ({linkedDiagnoses.length})
                        </h3>
                        <div className="space-y-2">
                            {linkedDiagnoses.map((diagnosis) => (
                                <div
                                    key={diagnosis.id}
                                    className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{diagnosis.diagnosis_name}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="pill bg-sky-50 text-sky-700 text-xs">
                                                {diagnosis.diagnosis_code}
                                            </span>
                                            {diagnosis.category && (
                                                <span className="pill bg-purple-50 text-purple-700 text-xs">
                                                    {diagnosis.category}
                                                </span>
                                            )}
                                            {diagnosis.is_common && (
                                                <span className="pill bg-blue-50 text-blue-700 text-xs">Common</span>
                                            )}
                                            {diagnosis.is_key_symptom && (
                                                <span className="pill bg-rose-50 text-rose-700 text-xs">Key</span>
                                            )}
                                            {diagnosis.weight && (
                                                <span className="pill bg-slate-50 text-slate-700 text-xs">
                                                    Weight: {diagnosis.weight}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnlink(diagnosis.id)}
                                        className="flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                                    >
                                        <Unlink className="h-3 w-3" />
                                        Unlink
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search and Add Diagnoses */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Add Diagnoses</h3>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search diagnoses by name or code..."
                            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg border border-slate-200 p-3">
                            {filteredDiagnoses.length === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-4">
                                    {search ? "No diagnoses found" : "All diagnoses are already linked"}
                                </p>
                            ) : (
                                filteredDiagnoses.map((diagnosis) => (
                                    <div
                                        key={diagnosis.id}
                                        className={`rounded-lg border p-3 transition-colors ${selectedDiagnoses.has(diagnosis.id)
                                            ? "border-sky-300 bg-sky-50"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                    >
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedDiagnoses.has(diagnosis.id)}
                                                onChange={() => handleDiagnosisToggle(diagnosis.id)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900">{diagnosis.diagnosis_name}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="pill bg-sky-50 text-sky-700 text-xs">
                                                        {diagnosis.diagnosis_code}
                                                    </span>
                                                    {diagnosis.category && (
                                                        <span className="pill bg-purple-50 text-purple-700 text-xs">
                                                            {diagnosis.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </label>

                                        {selectedDiagnoses.has(diagnosis.id) && linkProperties[diagnosis.id] && (
                                            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-sky-200 pt-3">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={linkProperties[diagnosis.id].is_common}
                                                        onChange={(e) =>
                                                            handlePropertyChange(diagnosis.id, "is_common", e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                                                    />
                                                    <span className="text-xs text-slate-700">Is Common</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={linkProperties[diagnosis.id].is_key_symptom}
                                                        onChange={(e) =>
                                                            handlePropertyChange(diagnosis.id, "is_key_symptom", e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-rose-600"
                                                    />
                                                    <span className="text-xs text-slate-700">Is Key</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-700">Weight:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={linkProperties[diagnosis.id].weight}
                                                        onChange={(e) =>
                                                            handlePropertyChange(
                                                                diagnosis.id,
                                                                "weight",
                                                                parseInt(e.target.value) || 5
                                                            )
                                                        }
                                                        className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                    {selectedDiagnoses.size > 0 && (
                        <button
                            onClick={handleSaveLinks}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:shadow disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Linking...
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="h-4 w-4" />
                                    Link {selectedDiagnoses.size} Diagnosis{selectedDiagnoses.size > 1 ? "es" : ""}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
