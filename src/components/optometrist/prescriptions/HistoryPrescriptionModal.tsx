"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Loader2, Download, AlertCircle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { optometryPrescriptionApi } from "@/services/optometryPrescriptionApi";
import { prescriptionDataApi, type PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { doctorsApi } from "@/services/doctorsApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { DoctorPrescriptionPrint } from "./DoctorPrescriptionPrint";
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
                optometryPrescriptionApi.list({ visit_id: visitId, status: "finalized" }),
                prescriptionDataApi.getPrescriptionData(patientId, visitId),
                plannedSurgeriesApi.list({ patient_id: patientId, status: "scheduled" }),
            ]);

            let prescription = null;
            if (prescriptionRes.items && prescriptionRes.items.length > 0) {
                prescription = prescriptionRes.items[0];
                setPrescription(prescription);

                // Fetch doctor signature if we have a prescription
                if (prescription.doctor_id) {
                    try {
                        const docProfile = await doctorsApi.getById(prescription.doctor_id.toString());
                        if (docProfile?.signature) {
                            setDoctorSignature(docProfile.signature);
                        }
                    } catch (e) {
                        console.error("Failed to fetch doctor signature:", e);
                    }
                }
            } else {
                setPrescription(null);
            }
            setVisitData(visitDataRes);
            setPlannedSurgeries(surgeriesRes.items || []);
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Prescription History</h3>
                        <p className="text-xs text-slate-500">Visit No: {visitData?.visit_number || visitId.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {prescription && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-all shadow-md text-sm"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 grayscale opacity-50">
                            <Loader2 className="h-10 w-10 animate-spin text-sky-500 mb-4" />
                            <p className="text-slate-500 font-medium">Loading prescription details...</p>
                        </div>
                    ) : !prescription ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-slate-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-700">No Finalized Prescription</h4>
                            <p className="text-sm text-slate-500 max-w-xs mt-2">
                                No finalized prescription was found for this visit.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-[800px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden ring-1 ring-slate-200">
                            <div className="p-1 md:p-0">
                                <div ref={printRef} className="print-content">
                                    <DoctorPrescriptionPrint
                                        prescription={prescription}
                                        visitData={visitData}
                                        doctorSignature={doctorSignature}
                                        plannedSurgeries={plannedSurgeries}
                                        showHeader={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border-2 border-transparent"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
