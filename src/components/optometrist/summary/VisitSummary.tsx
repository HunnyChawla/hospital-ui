"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Eye, Activity, Pill, AlertCircle, FileText, Gauge, Glasses } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import { Footer } from "@/components/layout/Footer";

// Helper to format diopter values with explicit + and - signs
const formatDiopter = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "—";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return String(val);
  return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

// Helper component to render Prescription details in a clean UI layout
function PrescriptionSummaryView({
  prescription,
  formatDate
}: {
  prescription: any;
  formatDate: (date: string) => string;
}) {
  const medicineItems = prescription.medicine_items || [];
  const adviceItems = prescription.advice_items || [];
  const symptoms = prescription.symptoms || [];
  const specItems = prescription.items || [];
  const coatings = Array.isArray(prescription.coatings) ? prescription.coatings : [];

  const hasContent =
    prescription.diagnosis ||
    prescription.plan_of_action ||
    prescription.remarks ||
    prescription.followup_date ||
    medicineItems.length > 0 ||
    adviceItems.length > 0 ||
    symptoms.length > 0 ||
    specItems.length > 0 ||
    prescription.lens_type ||
    prescription.vision_type ||
    prescription.lens_material ||
    coatings.length > 0;

  return (
    <div className="space-y-4">
      {/* Header Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">
            {prescription.prescription_number || "Prescription"}
          </span>
          {prescription.status && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                prescription.status === "finalized"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-amber-100 text-amber-700 border border-amber-200"
              }`}
            >
              {prescription.status}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-3">
          {(prescription.doctor_name || prescription.optometrist_name) && (
            <span>
              By: <strong className="text-slate-700">{prescription.doctor_name || prescription.optometrist_name}</strong>
            </span>
          )}
          {prescription.created_at && (
            <span>{formatDate(prescription.created_at)}</span>
          )}
        </div>
      </div>

      {/* Diagnosis & Plan of Action */}
      {(prescription.diagnosis || prescription.plan_of_action || prescription.remarks || prescription.followup_date) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {prescription.diagnosis && (
            <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-100">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block mb-1">
                Diagnosis
              </span>
              <p className="text-slate-800 font-medium">{prescription.diagnosis}</p>
            </div>
          )}
          {prescription.plan_of_action && (
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Plan of Action
              </span>
              <p className="text-slate-800">{prescription.plan_of_action}</p>
            </div>
          )}
          {prescription.remarks && (
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Remarks
              </span>
              <p className="text-slate-800 italic">&quot;{prescription.remarks}&quot;</p>
            </div>
          )}
          {prescription.followup_date && (
            <div className="rounded-lg bg-indigo-50/60 p-3 border border-indigo-100">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider block mb-1">
                Follow-up Date
              </span>
              <p className="text-indigo-950 font-medium">{formatDate(prescription.followup_date)}</p>
            </div>
          )}
        </div>
      )}

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Symptoms</h4>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom: any, idx: number) => (
              <span
                key={symptom.id || idx}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs border border-slate-200 font-medium"
              >
                {symptom.symptom_name}
                {symptom.applicable_eye && symptom.applicable_eye !== "NA" && ` (${symptom.applicable_eye})`}
                {symptom.severity && ` • ${symptom.severity}`}
                {symptom.duration && ` • ${symptom.duration}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Medicines Table */}
      {medicineItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prescribed Medicines</h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Eye</th>
                  <th className="p-2.5">Dosage</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {medicineItems.map((med: any, idx: number) => (
                  <tr key={med.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-medium text-slate-900">
                      {med.medicine_name}
                      {med.generic_name && (
                        <span className="block text-[11px] text-slate-400 font-normal">{med.generic_name}</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {med.applicable_eye && med.applicable_eye !== "NA" ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {med.applicable_eye}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2.5 font-medium">{med.dosage || "—"}</td>
                    <td className="p-2.5">{med.frequency || "—"}</td>
                    <td className="p-2.5">{med.duration || "—"}</td>
                    <td className="p-2.5 text-slate-600">{med.instructions || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advice Items */}
      {adviceItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Advice & Lab Tests</h4>
          <div className="space-y-2">
            {adviceItems.map((item: any, idx: number) => (
              <div key={item.id || idx} className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">{item.description || item.advice_type}</span>
                  {item.advice_type && (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-medium uppercase">
                      {item.advice_type}
                    </span>
                  )}
                </div>
                {item.notes && <p className="text-slate-600 italic">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eyewear & Lens Details */}
      {(prescription.lens_type || prescription.vision_type || prescription.lens_material || coatings.length > 0 || specItems.length > 0) && (
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-2">
          <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">Optical / Frame Specifications</h4>
          <div className="flex flex-wrap gap-2">
            {prescription.lens_type && (
              <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                Type: {prescription.lens_type}
              </span>
            )}
            {prescription.vision_type && (
              <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                Vision: {prescription.vision_type}
              </span>
            )}
            {prescription.lens_material && (
              <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                Material: {prescription.lens_material}
              </span>
            )}
            {coatings.map((c: string, idx: number) => (
              <span key={idx} className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                Coating: {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {!hasContent && (
        <div className="text-center py-4 text-xs text-slate-500 italic bg-slate-50 rounded-lg border border-slate-200">
          No detailed items recorded in this prescription draft yet.
        </div>
      )}
    </div>
  );
}

// Dynamic layout component that balances content across columns
function VisitSummaryLayout({
  data,
  formatDate,
  formatDateTime
}: {
  data: PrescriptionDataResponse;
  formatDate: (date: string) => string;
  formatDateTime: (date: string) => string;
}) {
  // Define all available sections with their content
  const allSections = [
    {
      id: 'complaints',
      title: 'Chief Complaints',
      icon: <AlertCircle className="h-5 w-5 text-rose-600" />,
      hasData: data.complaints && data.complaints.length > 0,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.complaints?.map((complaint) => (
            <div key={complaint.id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{complaint.complaint}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Severity: <span className="font-medium capitalize">{complaint.severity}</span></span>
                    <span>Duration: <span className="font-medium">{complaint.duration}</span></span>
                  </div>
                  {complaint.notes && (
                    <p className="mt-2 text-sm text-slate-600">Notes: {complaint.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'medical_conditions',
      title: 'Medical History',
      icon: <Activity className="h-5 w-5 text-amber-600" />,
      hasData: data.medical_conditions && data.medical_conditions.length > 0,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.medical_conditions?.map((condition) => (
            <div key={condition.id} className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900 capitalize">
                {condition.condition_name.replace(/_/g, " ")}
              </p>
              {condition.remarks && (
                <p className="mt-1 text-sm text-slate-600">{condition.remarks}</p>
              )}
              {condition.duration && (
                <p className="mt-1 text-sm text-slate-600">Duration: {condition.duration}</p>
              )}
              {condition.is_controlled !== null && (
                <p className="mt-1 text-sm text-slate-600">
                  Controlled: {condition.is_controlled ? "Yes" : "No"}
                </p>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'drug_allergies',
      title: 'Drug Allergies',
      icon: <Pill className="h-5 w-5 text-red-600" />,
      hasData: data.drug_allergies && data.drug_allergies.length > 0,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.drug_allergies?.map((allergy) => (
            <div key={allergy.id} className="rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{allergy.drug_name}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Reaction: <span className="font-medium">{allergy.reaction}</span></span>
                    <span>Severity: <span className="font-medium capitalize">{allergy.severity}</span></span>
                  </div>
                  {allergy.notes && (
                    <p className="mt-2 text-sm text-slate-600">Notes: {allergy.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'current_specs',
      title: 'Current Specs / Glasses',
      icon: <Glasses className="h-5 w-5 text-violet-600" />,
      hasData: data.current_specs && data.current_specs.length > 0,
      content: data.current_specs?.map((spec) => (
        <div key={spec.id} className="rounded-lg bg-slate-50 p-4 mb-4 last:mb-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {spec.lens_type && (
              <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                {spec.lens_type.replace(/_/g, " ")}
              </span>
            )}
            {spec.usage && (
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                {spec.usage.replace(/_/g, " ")}
              </span>
            )}
            {spec.measured_by && (
              <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                Via: {spec.measured_by.replace(/_/g, " ")}
              </span>
            )}
            {spec.is_comfortable !== null && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${spec.is_comfortable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {spec.is_comfortable ? 'Comfortable' : 'Issues Reported'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <h4 className="font-semibold text-slate-900 mb-2 text-sm border-b border-slate-100 pb-1">Right Eye (OD)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500 text-xs">SPH:</span> <span className="font-medium">{formatDiopter(spec.od_sph)}</span></div>
                <div><span className="text-slate-500 text-xs">CYL:</span> <span className="font-medium">{formatDiopter(spec.od_cyl)}</span></div>
                <div><span className="text-slate-500 text-xs">AXIS:</span> <span className="font-medium">{spec.od_axis ? spec.od_axis + "°" : "—"}</span></div>
                <div><span className="text-slate-500 text-xs">ADD:</span> <span className="font-medium">{formatDiopter(spec.od_add)}</span></div>
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <h4 className="font-semibold text-slate-900 mb-2 text-sm border-b border-slate-100 pb-1">Left Eye (OS)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500 text-xs">SPH:</span> <span className="font-medium">{formatDiopter(spec.os_sph)}</span></div>
                <div><span className="text-slate-500 text-xs">CYL:</span> <span className="font-medium">{formatDiopter(spec.os_cyl)}</span></div>
                <div><span className="text-slate-500 text-xs">AXIS:</span> <span className="font-medium">{spec.os_axis ? spec.os_axis + "°" : "—"}</span></div>
                <div><span className="text-slate-500 text-xs">ADD:</span> <span className="font-medium">{formatDiopter(spec.os_add)}</span></div>
              </div>
            </div>
          </div>

          {spec.remarks && (
            <p className="mt-3 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
              &quot;{spec.remarks}&quot;
            </p>
          )}
        </div>
      ))
    },
    {
      id: 'ophthalmic_history',
      title: 'Ophthalmic History',
      icon: <Eye className="h-5 w-5 text-sky-600" />,
      hasData: data.ophthalmic_history && data.ophthalmic_history.length > 0,
      content: data.ophthalmic_history?.map((history) => (
        <div key={history.id} className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{history.surgery_name}</p>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <span>Eye: <span className="font-medium">{history.eye}</span></span>
                <span>Date: <span className="font-medium">{formatDate(history.surgery_date)}</span></span>
                <span>Surgeon: <span className="font-medium">{history.surgeon_name}</span></span>
                <span>Hospital: <span className="font-medium">{history.hospital_name}</span></span>
                <span className="col-span-2">Complications: <span className="font-medium">{history.complications}</span></span>
              </div>
              {history.notes && (
                <p className="mt-2 text-sm text-slate-600">Notes: {history.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))
    },
    {
      id: 'ar_data',
      title: 'Auto Refraction (AR) Data',
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      hasData: !!data.ar_data,
      content: data.ar_data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-1">Right Eye (OD)</h4>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Dry AR</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sphere:</span>
                    <span className="font-medium">{formatDiopter(data.ar_data.od_sphere)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cylinder:</span>
                    <span className="font-medium">{formatDiopter(data.ar_data.od_cylinder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Axis:</span>
                    <span className="font-medium">{data.ar_data.od_axis ? data.ar_data.od_axis + "°" : "—"}</span>
                  </div>
                </div>
              </div>
              {(data.ar_data.od_wet_sphere || data.ar_data.od_wet_cylinder || data.ar_data.od_wet_axis) && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Wet AR (Dilated)</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sphere:</span>
                      <span className="font-medium">{formatDiopter(data.ar_data.od_wet_sphere)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cylinder:</span>
                      <span className="font-medium">{formatDiopter(data.ar_data.od_wet_cylinder)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Axis:</span>
                      <span className="font-medium">{data.ar_data.od_wet_axis ? data.ar_data.od_wet_axis + "°" : "—"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-1">Left Eye (OS)</h4>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Dry AR</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sphere:</span>
                    <span className="font-medium">{formatDiopter(data.ar_data.os_sphere)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cylinder:</span>
                    <span className="font-medium">{formatDiopter(data.ar_data.os_cylinder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Axis:</span>
                    <span className="font-medium">{data.ar_data.os_axis ? data.ar_data.os_axis + "°" : "—"}</span>
                  </div>
                </div>
              </div>
              {(data.ar_data.os_wet_sphere || data.ar_data.os_wet_cylinder || data.ar_data.os_wet_axis) && (
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Wet AR (Dilated)</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sphere:</span>
                      <span className="font-medium">{formatDiopter(data.ar_data.os_wet_sphere)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cylinder:</span>
                      <span className="font-medium">{formatDiopter(data.ar_data.os_wet_cylinder)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Axis:</span>
                      <span className="font-medium">{data.ar_data.os_wet_axis ? data.ar_data.os_wet_axis + "°" : "—"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {data.ar_data.pupillary_distance && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <span className="text-sm text-slate-600">Pupillary Distance: </span>
              <span className="text-sm font-medium">{data.ar_data.pupillary_distance} mm</span>
            </div>
          )}
          {data.ar_data.notes && (
            <p className="mt-3 text-sm text-slate-600">Notes: {data.ar_data.notes}</p>
          )}
        </>
      )
    },
    {
      id: 'refraction',
      title: 'Refraction',
      icon: <Eye className="h-5 w-5 text-teal-600" />,
      hasData: !!data.refraction,
      content: data.refraction && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-1">Right Eye (OD)</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{formatDiopter(data.refraction.od_sphere)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{formatDiopter(data.refraction.od_cylinder)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.refraction.od_axis ? data.refraction.od_axis + "°" : "—"}</span>
                </div>
                {data.refraction.od_prism && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Prism:</span>
                    <span className="font-medium">{data.refraction.od_prism}</span>
                  </div>
                )}
                {data.refraction.od_distance_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dist. BCVA:</span>
                    <span className="font-medium">{data.refraction.od_distance_bcva}</span>
                  </div>
                )}
                {data.refraction.od_near_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Near BCVA:</span>
                    <span className="font-medium">{data.refraction.od_near_bcva}</span>
                  </div>
                )}
                {data.refraction.od_add_power !== undefined && data.refraction.od_add_power !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Add Power:</span>
                    <span className="font-medium">{formatDiopter(data.refraction.od_add_power)}</span>
                  </div>
                )}
              </div>
              {(data.refraction.od_dilated_sphere || data.refraction.od_dilated_cylinder || data.refraction.od_dilated_axis || data.refraction.od_dilated_visual_acuity || data.refraction.od_dilated_pinhole) && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-teal-700 uppercase mb-1">Dilated Acceptance</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sphere:</span>
                      <span className="font-medium">{formatDiopter(data.refraction.od_dilated_sphere)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cylinder:</span>
                      <span className="font-medium">{formatDiopter(data.refraction.od_dilated_cylinder)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Axis:</span>
                      <span className="font-medium">{data.refraction.od_dilated_axis ? data.refraction.od_dilated_axis + "°" : "—"}</span>
                    </div>
                    {data.refraction.od_dilated_visual_acuity && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Visual Acuity:</span>
                        <span className="font-medium">{data.refraction.od_dilated_visual_acuity}</span>
                      </div>
                    )}
                    {data.refraction.od_dilated_pinhole && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pinhole:</span>
                        <span className="font-medium">{data.refraction.od_dilated_pinhole}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-1">Left Eye (OS)</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{formatDiopter(data.refraction.os_sphere)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{formatDiopter(data.refraction.os_cylinder)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.refraction.os_axis ? data.refraction.os_axis + "°" : "—"}</span>
                </div>
                {data.refraction.os_prism && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Prism:</span>
                    <span className="font-medium">{data.refraction.os_prism}</span>
                  </div>
                )}
                {data.refraction.os_distance_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dist. BCVA:</span>
                    <span className="font-medium">{data.refraction.os_distance_bcva}</span>
                  </div>
                )}
                {data.refraction.os_near_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Near BCVA:</span>
                    <span className="font-medium">{data.refraction.os_near_bcva}</span>
                  </div>
                )}
                {data.refraction.os_add_power !== undefined && data.refraction.os_add_power !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Add Power:</span>
                    <span className="font-medium">{formatDiopter(data.refraction.os_add_power)}</span>
                  </div>
                )}
              </div>
              {(data.refraction.os_dilated_sphere || data.refraction.os_dilated_cylinder || data.refraction.os_dilated_axis || data.refraction.os_dilated_visual_acuity || data.refraction.os_dilated_pinhole) && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-teal-700 uppercase mb-1">Dilated Acceptance</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sphere:</span>
                      <span className="font-medium">{formatDiopter(data.refraction.os_dilated_sphere)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cylinder:</span>
                      <span className="font-medium">{formatDiopter(data.refraction.os_dilated_cylinder)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Axis:</span>
                      <span className="font-medium">{data.refraction.os_dilated_axis ? data.refraction.os_dilated_axis + "°" : "—"}</span>
                    </div>
                    {data.refraction.os_dilated_visual_acuity && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Visual Acuity:</span>
                        <span className="font-medium">{data.refraction.os_dilated_visual_acuity}</span>
                      </div>
                    )}
                    {data.refraction.os_dilated_pinhole && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pinhole:</span>
                        <span className="font-medium">{data.refraction.os_dilated_pinhole}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {data.refraction.notes && (
            <p className="mt-3 text-sm text-slate-600">Notes: {data.refraction.notes}</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Recorded: {formatDateTime(data.refraction.recorded_at)}
          </p>
        </>
      )
    },
    {
      id: 'iop',
      title: 'Intraocular Pressure (IOP)',
      icon: <Gauge className="h-5 w-5 text-indigo-600" />,
      hasData: !!data.iop,
      content: data.iop && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Right Eye (OD)</h4>
              <p className="text-2xl font-bold text-indigo-600">{data.iop.od_pressure} mmHg</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Left Eye (OS)</h4>
              <p className="text-2xl font-bold text-indigo-600">{data.iop.os_pressure} mmHg</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Measurement Method:</span>
              <span className="font-medium">{data.iop.measurement_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Measurement Time:</span>
              <span className="font-medium">{formatDateTime(data.iop.measurement_time)}</span>
            </div>
          </div>
          {data.iop.notes && (
            <p className="mt-3 text-sm text-slate-600">Notes: {data.iop.notes}</p>
          )}
        </>
      )
    },
    {
      id: 'vision',
      title: 'Visual Acuity',
      icon: <Eye className="h-5 w-5 text-cyan-600" />,
      hasData: !!data.vision,
      content: data.vision && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Right Eye (OD)</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">Distance Vision</p>
                  <div className="space-y-1 text-sm">
                    {data.vision.od_ucva_distance && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">UCVA:</span>
                        <span className="font-medium">{data.vision.od_ucva_distance}</span>
                      </div>
                    )}
                    {data.vision.od_ph_va && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">PH:</span>
                        <span className="font-medium">{data.vision.od_ph_va}</span>
                      </div>
                    )}
                    {data.vision.od_va_with_current_specs && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">With Specs:</span>
                        <span className="font-medium">{data.vision.od_va_with_current_specs}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">Near Vision</p>
                  <div className="space-y-1 text-sm">
                    {data.vision.od_near_ucva && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">UCVA:</span>
                        <span className="font-medium">{data.vision.od_near_ucva}</span>
                      </div>
                    )}
                    {data.vision.od_near_with_current_specs && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">With Specs:</span>
                        <span className="font-medium">{data.vision.od_near_with_current_specs}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <h4 className="font-semibold text-green-900 mb-3">Left Eye (OS)</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Distance Vision</p>
                  <div className="space-y-1 text-sm">
                    {data.vision.os_ucva_distance && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">UCVA:</span>
                        <span className="font-medium">{data.vision.os_ucva_distance}</span>
                      </div>
                    )}
                    {data.vision.os_ph_va && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">PH:</span>
                        <span className="font-medium">{data.vision.os_ph_va}</span>
                      </div>
                    )}
                    {data.vision.os_va_with_current_specs && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">With Specs:</span>
                        <span className="font-medium">{data.vision.os_va_with_current_specs}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Near Vision</p>
                  <div className="space-y-1 text-sm">
                    {data.vision.os_near_ucva && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">UCVA:</span>
                        <span className="font-medium">{data.vision.os_near_ucva}</span>
                      </div>
                    )}
                    {data.vision.os_near_with_current_specs && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">With Specs:</span>
                        <span className="font-medium">{data.vision.os_near_with_current_specs}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {data.vision.notes && (
            <p className="mt-3 text-sm text-slate-600">Notes: {data.vision.notes}</p>
          )}
        </>
      )
    },
    {
      id: 'prescription',
      title: 'Prescription',
      icon: <FileText className="h-5 w-5 text-green-600" />,
      hasData: !!data.prescription,
      content: data.prescription && (
        <PrescriptionSummaryView prescription={data.prescription} formatDate={formatDate} />
      )
    }
  ];

  // Filter sections that have data
  const sectionsWithData = allSections.filter(section => section.hasData);

  // If no sections have data, show empty state
  if (sectionsWithData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12">
        <div className="text-center">
          <FileText className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Data Available</h3>
          <p className="mt-2 text-sm text-slate-500">
            No visit data has been recorded for this patient yet.
          </p>
        </div>
      </div>
    );
  }

  // Determine layout based on number of sections
  const totalSections = sectionsWithData.length;
  const useTwoColumns = totalSections >= 2;

  // Split sections into balanced columns
  const leftColumnSections = useTwoColumns
    ? sectionsWithData.slice(0, Math.ceil(totalSections / 2))
    : sectionsWithData;

  const rightColumnSections = useTwoColumns
    ? sectionsWithData.slice(Math.ceil(totalSections / 2))
    : [];

  return (
    <div className={`grid ${useTwoColumns ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
      {/* Left Column */}
      <div className="space-y-6">
        {leftColumnSections.map((section) => (
          <section key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-4">
              {section.icon}
              <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
            </div>
            <div className="space-y-3">
              {section.content}
            </div>
          </section>
        ))}
      </div>

      {/* Right Column */}
      {rightColumnSections.length > 0 && (
        <div className="space-y-6">
          {rightColumnSections.map((section) => (
            <section key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

interface VisitSummaryProps {
  data: PrescriptionDataResponse;
  patientName: string;
  patientUhid?: string;
  onClose: () => void;
}

export function VisitSummary({ data, patientName, patientUhid, onClose }: VisitSummaryProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Visit Summary</h2>
              <p className="text-sm text-slate-600 mt-1">
                {patientName} {patientUhid && `• ${patientUhid}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <VisitSummaryLayout data={data} formatDate={formatDate} formatDateTime={formatDateTime} />
        </div>

        {/* Branding Footer */}
        <div className="flex-shrink-0">
          <Footer noSidebar isFixed={false} />
        </div>
      </div>
    </div>
  );

  // Determine the mounting point - if we are in fullscreen mode, mount to the fullscreen element
  // regarding of whether the modal was opened before or after entering fullscreen
  // Since this component is only rendered when mounted is true (client-side), direct DOM access is safe
  const mountNode = document.fullscreenElement || document.body;

  return createPortal(modalContent, mountNode);
}
