"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Loader2, Download, AlertCircle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { opdVisitsApi } from "@/services/opdVisitsApi";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
import { prescriptionDataApi, type PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { doctorsApi } from "@/services/doctorsApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
import { PrintPreviewModal } from "./PrintPreviewModal";
import { handleError } from "@/utils/errorHandler";
import type { OptometryPrescription, PlannedSurgery } from "@/types";

interface HistoryPrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitId: string;
    patientId: string;
}

export function HistoryPrescriptionModal({
    isOpen,
    onClose,
    visitId,
    patientId,
}: HistoryPrescriptionModalProps) {
    const [loading, setLoading] = useState(true);
    const [prescription, setPrescription] = useState<OptometryPrescription | null>(null);
    const [visitData, setVisitData] = useState<PrescriptionDataResponse | null>(null);
    const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
    const [plannedSurgeries, setPlannedSurgeries] = useState<PlannedSurgery[]>([]);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Prescription_${visitId}`,
        onBeforePrint: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
        },
    });

    useEffect(() => {
        if (isOpen && visitId && patientId) {
            fetchData();
        }
    }, [isOpen, visitId, patientId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prescriptionRes, visitDataRes, surgeriesRes] = await Promise.all([
                optometryPrescriptionApi.list({ visit_id: visitId }),
                prescriptionDataApi.getPrescriptionData(patientId, visitId),
                plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" }),
            ]);

            let prescription: OptometryPrescription | null = null;
            if (prescriptionRes.items && prescriptionRes.items.length > 0) {
                // Prefer finalized prescription over draft if both exist
                const finalized = prescriptionRes.items.find(p => p.status === "finalized");
                prescription = finalized || prescriptionRes.items[0];
            }

            // Resolve target doctor ID from prescription or OPD visit details
            let targetDoctorId = prescription?.doctor_id;
            let targetDoctorName = prescription?.doctor_name;

            if (!targetDoctorId) {
                try {
                    const visitDetails = await opdVisitsApi.getById(visitId);
                    if (visitDetails?.doctor_id) {
                        targetDoctorId = visitDetails.doctor_id;
                    }
                } catch (err) {
                    console.error("Failed to fetch visit details for doctor ID", err);
                }
            }

            if (!prescription && visitDataRes) {
                // Fallback: Check if there is clinical visit data recorded (refraction, complaints, vision, etc.)
                const hasClinicalData = !!(
                    visitDataRes.refraction ||
                    visitDataRes.vision ||
                    visitDataRes.iop ||
                    visitDataRes.ar_data ||
                    (visitDataRes.complaints && visitDataRes.complaints.length > 0)
                );
                if (hasClinicalData) {
                    prescription = {
                        id: `draft-${visitId}`,
                        tenant_id: "",
                        patient_id: patientId,
                        patient_name: "",
                        optometrist_id: "",
                        optometrist_name: "",
                        visit_id: visitId,
                        doctor_id: targetDoctorId,
                        doctor_name: targetDoctorName,
                        prescription_number: "DRAFT",
                        status: "draft",
                        diagnosis: null,
                        notes: null,
                        items: [],
                        pupillary_distance: null,
                        frame_fitting_notes: null,
                        finalized_at: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                }
            }

            setPrescription(prescription);

            // Fetch doctor signature and doctor details
            if (targetDoctorId) {
                try {
                    const [sigData, docProfile] = await Promise.all([
                        doctorsApi.getSignature(targetDoctorId.toString()).catch(() => null),
                        doctorsApi.getById(targetDoctorId.toString()).catch(() => null)
                    ]);

                    if (sigData?.signature) {
                        setDoctorSignature(sigData.signature);
                    } else if (docProfile?.signature) {
                        setDoctorSignature(docProfile.signature);
                    }

                    if (prescription && !prescription.doctor_name && docProfile) {
                        prescription.doctor_name = docProfile.user_name || docProfile.name || (docProfile.specialization ? `Dr. ${docProfile.specialization}` : undefined);
                    }
                } catch (e) {
                    console.error("Failed to fetch doctor signature/profile:", e);
                }
            }

            let surgeries = surgeriesRes.items || [];
            const rxDateStr = prescription?.created_at || (visitDataRes as any)?.created_at || (visitDataRes as any)?.visit_date;

            const getIsoDateStr = (d?: string | null) => {
                if (!d) return null;
                try {
                    if (d.length === 10 && d.includes("-")) return d;
                    return new Date(d).toISOString().slice(0, 10);
                } catch {
                    return null;
                }
            };

            if (rxDateStr) {
                const rxDateOnly = getIsoDateStr(rxDateStr);
                if (rxDateOnly) {
                    surgeries = surgeries.filter((s) => {
                        const sDateOnly = getIsoDateStr(s.advised_date) || getIsoDateStr(s.created_at);
                        return sDateOnly === rxDateOnly;
                    });
                }
            }

            setVisitData(visitDataRes);
            setPlannedSurgeries(surgeries);
        } catch (error) {
            handleError(error, {
                defaultMessage: "Failed to load prescription history",
                logError: true,
            });
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                    <p className="text-slate-600 font-semibold italic">Opening Prescription Preview...</p>
                </div>
            </div>
        );
    }

    if (!prescription) {
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                    <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-amber-500" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">No Prescription Found</h4>
                    <p className="text-sm text-slate-500 mt-2">
                        There is no finalized prescription record for this visit.
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <PrintPreviewModal
            isOpen={true}
            onClose={onClose}
            prescription={prescription}
            visitData={visitData}
            doctorSignature={doctorSignature}
            plannedSurgeries={plannedSurgeries}
            showHeader={true}
        />
    );
}
