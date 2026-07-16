"use client";

import { Admission } from "@/services/admissionsApi";
import { PatientApiResponse, formatPatientName } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate } from "@/utils/format";

interface ConsentFormPrintProps {
  admission: Admission;
  patient: PatientApiResponse;
}

export function ConsentFormPrint({ admission, patient }: ConsentFormPrintProps) {
  const { tenant, hospitalName } = useTenant();

  const fullName = formatPatientName(patient);
  
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

  const formatDateTime = (date: string | null, time: string | null) => {
    if (!date) return "________________";
    try {
      const dateStr = formatDate(date);
      if (time) {
        const timeStr = new Date(time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${dateStr} ${timeStr}`;
      }
      return dateStr;
    } catch {
      return date;
    }
  };

  const formatAddress = () => {
    if (!tenant) return "___________________________";
    const parts = [
      tenant.address,
      tenant.city,
      tenant.state,
      tenant.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "___________________________";
  };

  const formatGender = (gender: string) => {
    if (!gender) return "";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const age = calculateAge(patient.date_of_birth);
  const ageGender = `${age} / ${formatGender(patient.gender)}`;
  const uhid = patient.uhid || patient.id || "________________";
  const ipdNo = admission.admission_number || "________________";
  const admissionDateTime = formatDateTime(admission.admission_date, admission.admission_time);
  const wardRoom = admission.ward_name && admission.bed_number 
    ? `${admission.ward_name} / ${admission.bed_number}`
    : admission.ward_name || admission.bed_number || "________________";
  
  const guardianName = admission.next_of_kin_name || "________________";
  const guardianRelation = admission.next_of_kin_relation || "________________";
  const guardianContact = admission.next_of_kin_contact || "________________";
  
  const consentName = admission.next_of_kin_name || fullName;
  const hospitalNameForConsent = hospitalName || tenant?.name || "________________ Hospital";
  
  const currentDateTime = new Date().toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hospitalNameDisplay = hospitalName || tenant?.name || "__________________________";
  const addressDisplay = formatAddress();
  const contactNo = tenant?.phone_no || "_____________________________";

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 print:p-4 print:max-w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 print:text-xl">
          IN-PATIENT (IPD) CONSENT FORM
        </h1>
      </div>

      {/* Hospital Details */}
      <div className="mb-6 space-y-2 border-b-2 border-slate-800 pb-4">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div>
            <span className="font-semibold">Hospital Name:</span>{" "}
            <span className="border-b border-slate-400 px-2">{hospitalNameDisplay}</span>
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            <span className="border-b border-slate-400 px-2">{addressDisplay}</span>
          </div>
          <div>
            <span className="font-semibold">Contact No:</span>{" "}
            <span className="border-b border-slate-400 px-2">{contactNo}</span>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-6 space-y-3">
        <h2 className="border-b border-slate-300 pb-1 text-lg font-bold text-slate-900">
          Patient Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Patient Name:</span>{" "}
            <span className="border-b border-slate-400 px-2">{fullName}</span>
          </div>
          <div>
            <span className="font-semibold">Age / Gender:</span>{" "}
            <span className="border-b border-slate-400 px-2">{ageGender}</span>
          </div>
          <div>
            <span className="font-semibold">UHID / Patient ID:</span>{" "}
            <span className="border-b border-slate-400 px-2">{uhid}</span>
          </div>
          <div>
            <span className="font-semibold">IPD No:</span>{" "}
            <span className="border-b border-slate-400 px-2">{ipdNo}</span>
          </div>
          <div>
            <span className="font-semibold">Admission Date & Time:</span>{" "}
            <span className="border-b border-slate-400 px-2">{admissionDateTime}</span>
          </div>
          <div>
            <span className="font-semibold">Ward / Room No:</span>{" "}
            <span className="border-b border-slate-400 px-2">{wardRoom}</span>
          </div>
        </div>
      </div>

      {/* Attendant / Guardian Details */}
      <div className="mb-6 space-y-3">
        <h2 className="border-b border-slate-300 pb-1 text-lg font-bold text-slate-900">
          Attendant / Guardian Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Name:</span>{" "}
            <span className="border-b border-slate-400 px-2">{guardianName}</span>
          </div>
          <div>
            <span className="font-semibold">Relationship with Patient:</span>{" "}
            <span className="border-b border-slate-400 px-2">{guardianRelation}</span>
          </div>
          <div className="col-span-2">
            <span className="font-semibold">Contact Number:</span>{" "}
            <span className="border-b border-slate-400 px-2">{guardianContact}</span>
          </div>
        </div>
      </div>

      {/* Consent Statement */}
      <div className="mb-6 space-y-3">
        <h2 className="border-b border-slate-300 pb-1 text-lg font-bold text-slate-900">
          Consent Statement
        </h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            I, <span className="border-b border-slate-400 px-2 font-semibold">{consentName}</span>, hereby give my voluntary consent for admission and treatment at{" "}
            <span className="border-b border-slate-400 px-2 font-semibold">{hospitalNameForConsent}</span>.
          </p>
          <p className="font-semibold">I understand and agree to the following:</p>
          <ol className="ml-6 list-decimal space-y-2">
            <li>I consent to medical examination, investigations, and treatment as advised by the treating doctor.</li>
            <li>I understand that diagnosis and treatment outcomes cannot be guaranteed.</li>
            <li>I authorize the hospital and doctors to perform necessary procedures in emergency situations to save life.</li>
            <li>I agree to follow hospital rules, visiting hours, and policies.</li>
            <li>I accept responsibility for payment of hospital bills, medicines, investigations, and procedures.</li>
            <li>I allow the hospital to maintain and use my medical records for treatment, billing, audit, and legal purposes.</li>
            <li>I understand that I may be required to sign separate consents for surgery, anesthesia, blood transfusion, ICU care, etc.</li>
          </ol>
        </div>
      </div>

      {/* Special Declaration */}
      <div className="mb-6 space-y-3">
        <h2 className="border-b border-slate-300 pb-1 text-lg font-bold text-slate-900">
          Special Declaration (Optional but Recommended)
        </h2>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" disabled />
            <span>I consent for blood transfusion if required</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" disabled />
            <span>I consent for ICU / Ventilator support if required</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" disabled />
            <span>I consent for sharing medical information with insurance / TPA</span>
          </label>
        </div>
      </div>

      {/* Signatures */}
      <div className="space-y-4">
        <h2 className="border-b border-slate-300 pb-1 text-lg font-bold text-slate-900">
          Signatures
        </h2>
        <div className="grid grid-cols-1 gap-6 text-sm">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Patient / Guardian Name:</span>{" "}
              <span className="border-b border-slate-400 px-2">{consentName}</span>
            </div>
            <div className="mt-4">
              <span className="font-semibold">Signature / Thumb Impression:</span>{" "}
              <span className="px-8">____________________</span>
            </div>
            <div className="mt-2">
              <span className="font-semibold">Date & Time:</span>{" "}
              <span className="border-b border-slate-400 px-2">{currentDateTime}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-semibold">Witness Name:</span>{" "}
              <span className="px-2">____________________________</span>
            </div>
            <div className="mt-4">
              <span className="font-semibold">Signature:</span>{" "}
              <span className="px-8">______________________________</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-semibold">Doctor / Admission Staff Name:</span>{" "}
              <span className="border-b border-slate-400 px-2">{admission.doctor_name || "_____________________"}</span>
            </div>
            <div className="mt-4">
              <span className="font-semibold">Signature:</span>{" "}
              <span className="px-8">______________________________</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}

