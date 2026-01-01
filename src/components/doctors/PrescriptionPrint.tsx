"use client";

import { Prescription, PrescriptionMedicine } from "@/services/prescriptionsApi";
import { PatientApiResponse, patientsApi } from "@/services/patientsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { getTenantIdForApi } from "@/utils/auth";
import { useEffect, useState } from "react";

interface PrescriptionPrintProps {
  prescription: Prescription;
  patientName?: string;
  patientMobile?: string;
}

export function PrescriptionPrint({ prescription, patientName, patientMobile }: PrescriptionPrintProps) {
  const { tenant } = useTenant();
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        
        const [patientData, doctorData] = await Promise.all([
          patientsApi.getById(prescription.patient_id, apiTenantId),
          doctorsApi.getById(prescription.doctor_id, apiTenantId),
        ]);
        
        setPatient(patientData);
        setDoctor(doctorData);
      } catch (error) {
        console.error("Failed to fetch patient/doctor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [prescription.patient_id, prescription.doctor_id]);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format full name
  const fullName = patient
    ? `${patient.first_name} ${patient.last_name || ""}`.trim()
    : patientName || "Unknown";

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
        <p className="text-center text-slate-600">Loading prescription...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader tenant={tenant} documentType="Prescription" />

      {/* Patient Details */}
      <div className="mb-4 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{fullName}</p>
          </div>
          {patient?.uhid && (
            <div>
              <p className="text-[10px] text-slate-600">UHID</p>
              <p className="font-semibold text-slate-900">{patient.uhid}</p>
            </div>
          )}
          {patient?.date_of_birth && (
            <div>
              <p className="text-[10px] text-slate-600">Age</p>
              <p className="font-semibold text-slate-900">{calculateAge(patient.date_of_birth)} years</p>
            </div>
          )}
          {patient?.gender && (
            <div>
              <p className="text-[10px] text-slate-600">Gender</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.gender}</p>
            </div>
          )}
          {(patient?.mobile || patientMobile) && (
            <div>
              <p className="text-[10px] text-slate-600">Mobile</p>
              <p className="font-semibold text-slate-900">{patient?.mobile || patientMobile}</p>
            </div>
          )}
        </div>
      </div>

      {/* Prescription Date */}
      <div className="mb-4 text-xs">
        <p className="text-slate-600">
          Date: <span className="font-semibold text-slate-900">{formatDate(prescription.created_at)}</span>
        </p>
      </div>

      {/* Diagnosis */}
      {prescription.diagnosis && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Diagnosis</h3>
          <p className="text-sm text-slate-700">{prescription.diagnosis}</p>
        </div>
      )}

      {/* Medicines */}
      <div className="mb-4">
        <h3 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Prescribed Medicines
        </h3>
        <div className="space-y-3">
          {prescription.medicines.map((medicine, index) => (
            <div key={medicine.id || index} className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {index + 1}. {medicine.medicine_name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-600">Dosage: </span>
                  <span className="font-semibold text-slate-900">{medicine.dosage}</span>
                </div>
                <div>
                  <span className="text-slate-600">Frequency: </span>
                  <span className="font-semibold text-slate-900">{medicine.frequency}</span>
                </div>
                <div>
                  <span className="text-slate-600">Duration: </span>
                  <span className="font-semibold text-slate-900">{medicine.duration}</span>
                </div>
                <div>
                  <span className="text-slate-600">Quantity: </span>
                  <span className="font-semibold text-slate-900">
                    {medicine.quantity} {medicine.unit}
                  </span>
                </div>
                {medicine.instructions && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Instructions: </span>
                    <span className="font-semibold text-slate-900">{medicine.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {prescription.notes && (
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Notes</h3>
          <p className="text-sm text-slate-700">{prescription.notes}</p>
        </div>
      )}

      {/* Doctor Information */}
      <div className="mb-4 border-t border-slate-300 pt-4">
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-slate-600">Prescribed by</p>
            <p className="text-sm font-semibold text-slate-900">
              {doctor?.name || doctor?.user?.name || "Dr. Unknown"}
            </p>
            {doctor?.specialization && (
              <p className="text-xs text-slate-600">{doctor.specialization}</p>
            )}
            {doctor?.qualification && (
              <p className="text-xs text-slate-600">{doctor.qualification}</p>
            )}
            {doctor?.registration_number && (
              <p className="text-xs text-slate-600">Reg. No: {doctor.registration_number}</p>
            )}
          </div>
          <div className="text-right">
            <div className="mt-8">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-xs font-semibold text-slate-900">Doctor's Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated prescription. Please follow the dosage instructions carefully.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}




