"use client";

import { useState, useRef } from "react";
import { FileText, Printer } from "lucide-react";
import { OptometryPrescriptionModal } from "./OptometryPrescriptionModal";
import { OptometryPrescriptionPrint } from "./OptometryPrescriptionPrint";
import { useReactToPrint } from "react-to-print";
import type { RefractionRecord } from "@/types";

interface CurrentSpecs {
  id: string;
  od_sph: string;
  od_cyl: string;
  od_axis: number;
  od_add: string;
  os_sph: string;
  os_cyl: string;
  os_axis: number;
  os_add: string;
  lens_type: string;
  usage: string;
  measured_by: string;
  is_comfortable: boolean;
  remarks: string | null;
}

interface PrescriptionButtonProps {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientUhid?: string;
  visitId: string;
  optometristId: string;
  optometristName: string;
  latestRefractionOD?: RefractionRecord | null;
  latestRefractionOS?: RefractionRecord | null;
  currentSpecs?: CurrentSpecs | null;
}

export function PrescriptionButton({
  patientId,
  patientName,
  patientAge,
  patientGender,
  patientUhid,
  visitId,
  optometristId,
  optometristName,
  latestRefractionOD,
  latestRefractionOS,
  currentSpecs,
}: PrescriptionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prescription_${patientName}_${new Date().toISOString().split("T")[0]}`,
  });

  const handleSave = async (prescriptionData: any) => {
    // In production, this would call the API
    // For now, save to localStorage
    const storageKey = `prescription_${visitId}`;
    const prescriptionWithMeta = {
      ...prescriptionData,
      id: `rx_${Date.now()}`,
      prescription_number: `RX${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "draft",
    };
    localStorage.setItem(storageKey, JSON.stringify(prescriptionWithMeta));
    setCurrentPrescription(prescriptionWithMeta);
  };

  const handleFinalize = async (prescriptionData: any) => {
    // In production, this would call the API to finalize
    const storageKey = `prescription_${visitId}`;
    const prescriptionWithMeta = {
      ...prescriptionData,
      id: currentPrescription?.id || `rx_${Date.now()}`,
      prescription_number:
        currentPrescription?.prescription_number || `RX${Date.now().toString().slice(-6)}`,
      created_at: currentPrescription?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      finalized_at: new Date().toISOString(),
      status: "finalized",
    };
    localStorage.setItem(storageKey, JSON.stringify(prescriptionWithMeta));
    setCurrentPrescription(prescriptionWithMeta);
    setIsModalOpen(false);
  };

  const handlePrintPrescription = async (prescriptionData: any) => {
    const finalizedPrescription = {
      ...prescriptionData,
      id: currentPrescription?.id || `rx_${Date.now()}`,
      prescription_number:
        currentPrescription?.prescription_number || `RX${Date.now().toString().slice(-6)}`,
      created_at: currentPrescription?.created_at || new Date().toISOString(),
      status: currentPrescription?.status || "finalized",
    };
    setCurrentPrescription(finalizedPrescription);

    // Small delay to ensure state is updated before printing
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:from-sky-700 hover:to-teal-700 transition"
      >
        <FileText className="h-4 w-4" />
        Create Prescription
      </button>

      {/* Prescription Modal */}
      <OptometryPrescriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={patientId}
        patientName={patientName}
        visitId={visitId}
        optometristId={optometristId}
        latestRefractionOD={latestRefractionOD}
        latestRefractionOS={latestRefractionOS}
        existingPrescription={currentPrescription}
        onSave={handleSave}
        onFinalize={handleFinalize}
        onPrint={handlePrintPrescription}
      />

      {/* Hidden printable prescription */}
      {currentPrescription && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <OptometryPrescriptionPrint
              prescription={currentPrescription}
              patientName={patientName}
              patientAge={patientAge}
              patientGender={patientGender}
              patientUhid={patientUhid}
              optometristName={optometristName}
              refractionOD={latestRefractionOD}
              refractionOS={latestRefractionOS}
            />
          </div>
        </div>
      )}
    </>
  );
}
