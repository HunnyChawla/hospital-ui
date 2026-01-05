"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Eye, Calendar, User, Activity, Pill, AlertCircle, FileText, Gauge } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

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
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Right Eye (OD)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{data.ar_data.od_sphere}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{data.ar_data.od_cylinder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.ar_data.od_axis}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Visual Acuity:</span>
                  <span className="font-medium">{data.ar_data.od_visual_acuity}</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Left Eye (OS)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{data.ar_data.os_sphere}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{data.ar_data.os_cylinder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.ar_data.os_axis}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Visual Acuity:</span>
                  <span className="font-medium">{data.ar_data.os_visual_acuity}</span>
                </div>
              </div>
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
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Right Eye (OD)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{data.refraction.od_sphere}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{data.refraction.od_cylinder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.refraction.od_axis}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VA Uncorrected:</span>
                  <span className="font-medium">{data.refraction.od_visual_acuity_uncorrected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VA Corrected:</span>
                  <span className="font-medium">{data.refraction.od_visual_acuity_corrected}</span>
                </div>
                {data.refraction.od_add_power && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Add Power:</span>
                    <span className="font-medium">{data.refraction.od_add_power}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Left Eye (OS)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sphere:</span>
                  <span className="font-medium">{data.refraction.os_sphere}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cylinder:</span>
                  <span className="font-medium">{data.refraction.os_cylinder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Axis:</span>
                  <span className="font-medium">{data.refraction.os_axis}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VA Uncorrected:</span>
                  <span className="font-medium">{data.refraction.os_visual_acuity_uncorrected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VA Corrected:</span>
                  <span className="font-medium">{data.refraction.os_visual_acuity_corrected}</span>
                </div>
                {data.refraction.os_add_power && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Add Power:</span>
                    <span className="font-medium">{data.refraction.os_add_power}</span>
                  </div>
                )}
              </div>
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
      id: 'prescription',
      title: 'Prescription',
      icon: <FileText className="h-5 w-5 text-green-600" />,
      hasData: !!data.prescription,
      content: data.prescription && (
        <div className="rounded-lg bg-slate-50 p-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap">
            {JSON.stringify(data.prescription, null, 2)}
          </pre>
        </div>
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
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
          <VisitSummaryLayout data={data} formatDate={formatDate} formatDateTime={formatDateTime} />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
