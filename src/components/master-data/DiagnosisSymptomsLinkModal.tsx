"use client";

import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { symptomsApi, DiagnosisSymptomMapRequest } from "@/services/symptomsApi";
import { diagnosesApi, Diagnosis } from "@/services/diagnosesApi";
import { Search, Loader2, Link as LinkIcon, Unlink, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

type DiagnosisSymptomsLinkModalProps = {
    isOpen: boolean;
    onClose: () => void;
    diagnosis: Diagnosis;
    tenantId?: string;
    onSuccess?: () => void;
};

interface SymptomWithMapping {
    id: string;
    symptom_name: string;
    category: string;
    is_eye_specific: boolean;
    applicable_eye: string;
    isLinked: boolean;
    is_common?: boolean;
    is_key_symptom?: boolean;
    weight?: number;
    mappingId?: string;
}

export function DiagnosisSymptomsLinkModal({
    isOpen,
    onClose,
    diagnosis,
    tenantId,
    onSuccess,
}: DiagnosisSymptomsLinkModalProps) {
    const [symptoms, setSymptoms] = useState<SymptomWithMapping[]>([]);
    const [linkedSymptoms, setLinkedSymptoms] = useState<SymptomWithMapping[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
    const [linkProperties, setLinkProperties] = useState<
        Record<string, { is_common: boolean; is_key_symptom: boolean; weight: number }>
    >({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, diagnosis.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all symptoms
            const symptomsResponse = await symptomsApi.list({
                page: 1,
                page_size: 100,
                is_active: true,
                tenant_id: tenantId,
                include_global: true,
            });

            // Load linked symptoms for this diagnosis
            const linked = await symptomsApi.getSymptomsByDiagnosis(diagnosis.id, tenantId);
            const linkedIds = new Set(linked.map((l) => l.symptom_id));

            // Merge data
            const symptomsWithStatus: SymptomWithMapping[] = symptomsResponse.items.map((symptom) => {
                const linkedInfo = linked.find((l) => l.symptom_id === symptom.id);
                return {
                    id: symptom.id,
                    symptom_name: symptom.symptom_name,
                    category: symptom.category,
                    is_eye_specific: symptom.is_eye_specific,
                    applicable_eye: symptom.applicable_eye,
                    isLinked: linkedIds.has(symptom.id),
                    is_common: linkedInfo?.is_common || false,
                    is_key_symptom: linkedInfo?.is_key_symptom || false,
                    weight: linkedInfo?.weight || undefined,
                    mappingId: linkedInfo?.id,
                };
            });

            setSymptoms(symptomsWithStatus);
            setLinkedSymptoms(symptomsWithStatus.filter((s) => s.isLinked));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSymptomToggle = (symptomId: string) => {
        const newSelected = new Set(selectedSymptoms);
        if (newSelected.has(symptomId)) {
            newSelected.delete(symptomId);
            const newProps = { ...linkProperties };
            delete newProps[symptomId];
            setLinkProperties(newProps);
        } else {
            newSelected.add(symptomId);
            setLinkProperties({
                ...linkProperties,
                [symptomId]: {
                    is_common: false,
                    is_key_symptom: false,
                    weight: 5,
                },
            });
        }
        setSelectedSymptoms(newSelected);
    };

    const handlePropertyChange = (
        symptomId: string,
        property: "is_common" | "is_key_symptom" | "weight",
        value: boolean | number
    ) => {
        setLinkProperties({
            ...linkProperties,
            [symptomId]: {
                ...linkProperties[symptomId],
                [property]: value,
            },
        });
    };

    const handleSaveLinks = async () => {
        setSaving(true);
        try {
            // Prepare mappings array for bulk linking
            const mappings = Array.from(selectedSymptoms).map((symptomId) => {
                const props = linkProperties[symptomId];
                return {
                    symptom_id: symptomId,
                    is_common: props.is_common,
                    is_key_symptom: props.is_key_symptom,
                    weight: props.weight,
                };
            });

            // Link all selected symptoms in a single request
            await symptomsApi.linkToDiagnosis(diagnosis.id, mappings, tenantId);

            toast.success(`Successfully linked ${selectedSymptoms.size} symptom(s)`);
            setSelectedSymptoms(new Set());
            setLinkProperties({});
            await loadData();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleUnlink = async (symptomId: string) => {
        try {
            await symptomsApi.unlinkFromDiagnosis(diagnosis.id, symptomId, tenantId);
            toast.success("Symptom unlinked successfully");
            await loadData();
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const filteredSymptoms = symptoms.filter((symptom) =>
        !symptom.isLinked &&
        symptom.symptom_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link Symptoms to "${diagnosis.diagnosis_name}"`} size="lg">
            <div className="space-y-4">
                {/* Currently Linked Symptoms */}
                {linkedSymptoms.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <h3 className="text-sm font-semibold text-emerald-900 mb-3">
                            Currently Linked Symptoms ({linkedSymptoms.length})
                        </h3>
                        <div className="space-y-2">
                            {linkedSymptoms.map((symptom) => (
                                <div
                                    key={symptom.id}
                                    className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{symptom.symptom_name}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="pill bg-purple-50 text-purple-700 text-xs">
                                                {symptom.category}
                                            </span>
                                            {symptom.is_common && (
                                                <span className="pill bg-blue-50 text-blue-700 text-xs">Common</span>
                                            )}
                                            {symptom.is_key_symptom && (
                                                <span className="pill bg-rose-50 text-rose-700 text-xs">Key</span>
                                            )}
                                            {symptom.weight && (
                                                <span className="pill bg-slate-50 text-slate-700 text-xs">
                                                    Weight: {symptom.weight}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnlink(symptom.id)}
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

                {/* Search and Add Symptoms */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Add Symptoms</h3>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search symptoms..."
                            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg border border-slate-200 p-3">
                            {filteredSymptoms.length === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-4">
                                    {search ? "No symptoms found" : "All symptoms are already linked"}
                                </p>
                            ) : (
                                filteredSymptoms.map((symptom) => (
                                    <div
                                        key={symptom.id}
                                        className={`rounded-lg border p-3 transition-colors ${selectedSymptoms.has(symptom.id)
                                            ? "border-sky-300 bg-sky-50"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                    >
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedSymptoms.has(symptom.id)}
                                                onChange={() => handleSymptomToggle(symptom.id)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900">{symptom.symptom_name}</p>
                                                <span className="pill bg-purple-50 text-purple-700 text-xs mt-1">
                                                    {symptom.category}
                                                </span>
                                            </div>
                                        </label>

                                        {selectedSymptoms.has(symptom.id) && linkProperties[symptom.id] && (
                                            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-sky-200 pt-3">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={linkProperties[symptom.id].is_common}
                                                        onChange={(e) =>
                                                            handlePropertyChange(symptom.id, "is_common", e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                                                    />
                                                    <span className="text-xs text-slate-700">Is Common</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={linkProperties[symptom.id].is_key_symptom}
                                                        onChange={(e) =>
                                                            handlePropertyChange(symptom.id, "is_key_symptom", e.target.checked)
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
                                                        value={linkProperties[symptom.id].weight}
                                                        onChange={(e) =>
                                                            handlePropertyChange(
                                                                symptom.id,
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
                    {selectedSymptoms.size > 0 && (
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
                                    Link {selectedSymptoms.size} Symptom{selectedSymptoms.size > 1 ? "s" : ""}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
