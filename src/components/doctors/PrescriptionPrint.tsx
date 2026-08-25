"use client";

import React, { useMemo } from "react";
import { PrescriptionResponse } from "@/services/prescriptionsApi";
import { useTenant } from "@/hooks/useTenant";
import { PrintHeader } from "@/components/common/PrintHeader";
import { usePrintLayout } from "@/hooks/queries/usePrintLayout";
import { normalizePrintLayout, type PrintLayoutConfig } from "@/types/printLayout";
import { buildPrintGeometry, PRINT_CONTAINER_CLASS } from "@/utils/printLayout";
import {
  PRESCRIPTION_PRINT_SECTIONS,
  orderPrescriptionSections,
} from "./prescriptionSections";
import { usePrescriptionSettings } from "@/hooks/usePrescriptionSettings";
import { formatFrequencyByPreference } from "@/utils/frequencyDisplay";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";

import {
  Hash,
  UserRound,
  User,
  Calendar,
  MapPin,
  Phone,
  ClipboardCheck,
  Pill,
  FlaskConical,
  Info,
  FileText,
  Activity,
  AlertTriangle,
  History,
  Target,
  MessageSquare,
  Stethoscope,
} from "lucide-react";

interface PrescriptionPrintProps {
  prescription: PrescriptionResponse;
  layout?: PrintLayoutConfig;
  showHeader?: boolean;
  doctorSignature?: string | null;
  visitData?: PrescriptionDataResponse | any | null;
  patient?: any | null;
  doctor?: any | null;
  plannedSurgeries?: any[];
  visibleSections?: string[];
  sectionOrder?: string[];
}

export function PrescriptionPrint({
  prescription,
  layout,
  showHeader,
  doctorSignature,
  visitData,
  patient,
  doctor,
  plannedSurgeries,
  visibleSections,
  sectionOrder,
}: PrescriptionPrintProps) {
  const { tenant } = useTenant();
  const { frequencyFormat } = usePrescriptionSettings(prescription.doctor_id);

  const { data: savedLayout } = usePrintLayout("prescription");

  const effectiveLayout = useMemo<PrintLayoutConfig>(() => {
    const base = layout ? normalizePrintLayout(layout) : normalizePrintLayout(savedLayout?.config);
    return {
      ...base,
      header_enabled: showHeader !== undefined ? showHeader : base.header_enabled,
      visible_sections:
        visibleSections !== undefined ? visibleSections : base.visible_sections,
      section_order: sectionOrder !== undefined ? sectionOrder : base.section_order,
    };
  }, [layout, savedLayout, showHeader, visibleSections, sectionOrder]);

  const geometry = useMemo(() => buildPrintGeometry(effectiveLayout), [effectiveLayout]);
  const headerPosition = effectiveLayout.header_position;
  const rendersTopHeader = geometry.rendersBand && headerPosition === "top";
  const rendersSideBand = geometry.rendersBand && headerPosition !== "top";

  const orderedSections = orderPrescriptionSections(
    PRESCRIPTION_PRINT_SECTIONS,
    effectiveLayout.section_order,
    effectiveLayout.visible_sections
  );

  // Spacing and font styles based on density
  const medicineCount = prescription.items?.length || 0;
  const adviceCount = prescription.advice_items?.length || 0;
  const totalItemsScore =
    medicineCount +
    adviceCount +
    (prescription.diagnosis ? 1 : 0) +
    (prescription.notes ? 1 : 0) +
    (prescription.plan_of_action ? 1 : 0) +
    (prescription.remarks ? 1 : 0);

  const compactThreshold = geometry.isSideBand ? 11 : 15;
  const extremeThreshold = geometry.isSideBand ? 19 : 25;
  const isCompact = totalItemsScore > compactThreshold;
  const isExtremelyCompact = totalItemsScore > extremeThreshold;

  const spacingClass = isExtremelyCompact ? "mb-1" : isCompact ? "mb-2" : "mb-3.5";
  const sectionFontClass = isExtremelyCompact ? "text-[10px]" : isCompact ? "text-xs" : "text-sm";
  const cellPadding = isExtremelyCompact ? "p-0.5" : "p-1";

  // Helper to format date
  const formatDateVal = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeVal = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Compute patient age / gender
  const computeAge = (dob?: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const patientAge = patient?.date_of_birth
    ? computeAge(patient.date_of_birth)
    : visitData?.date_of_birth
    ? computeAge(visitData.date_of_birth)
    : (visitData as any)?.age ?? null;

  const patientGender =
    patient?.gender ||
    (visitData as any)?.gender ||
    (visitData as any)?.sex ||
    null;

  const ageGenderDisplay =
    [patientAge !== null ? `${patientAge} Y` : null, patientGender]
      .filter(Boolean)
      .join(" / ") || "-";

  const consultantName =
    doctor?.name ||
    (doctor as any)?.full_name ||
    prescription.doctor_name ||
    "Medical Officer";

  const consultantSpec =
    doctor?.specialization ||
    (doctor as any)?.department ||
    null;

  const consultantDisplay = consultantSpec
    ? `${consultantName} (${consultantSpec})`
    : consultantName;

  // Build patient fields grid
  const iconClass = "h-2.5 w-2.5 text-slate-500";
  const patientFields: ({
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    valueClass?: string;
  } | null)[] = [
    {
      icon: <Hash className={iconClass} />,
      label: "UHID No",
      value: visitData?.uhid || patient?.uhid || prescription.patient_id?.slice(0, 8) || "-",
      valueClass: "font-bold",
    },
    {
      icon: <UserRound className={iconClass} />,
      label: "Consultant",
      value: consultantDisplay,
      valueClass: "font-bold",
    },
    {
      icon: <User className={iconClass} />,
      label: "Patient Name",
      value: patient?.name || prescription.patient_name || "-",
      valueClass: "font-bold text-sky-900",
    },
    {
      icon: <User className={iconClass} />,
      label: "Age / Gender",
      value: ageGenderDisplay,
      valueClass: "font-bold",
    },
    {
      icon: <Hash className={iconClass} />,
      label: "OPD No.",
      value:
        visitData?.visit_number ||
        prescription.visit_number ||
        prescription.visit_id?.slice(0, 8) ||
        "-",
    },
    {
      icon: <Calendar className={iconClass} />,
      label: "Date",
      value: `${formatDateVal(visitData?.checked_in_at || prescription.created_at)} ${formatTimeVal(visitData?.checked_in_at || prescription.created_at)}`,
    },
    {
      icon: <MapPin className={iconClass} />,
      label: "Address",
      value:
        visitData?.address ||
        patient?.address ||
        [patient?.city, patient?.state].filter(Boolean).join(", ") ||
        "-",
    },
    {
      icon: <User className={iconClass} />,
      label: "Category",
      value:
        (visitData as any)?.category ||
        (visitData as any)?.patient_category ||
        patient?.category ||
        "General",
      valueClass: "font-bold",
    },
    {
      icon: <Phone className={iconClass} />,
      label: "Mobile No.",
      value: visitData?.mobile || patient?.mobile || "-",
      valueClass: "font-bold",
    },
  ];

  const patientFieldsPerRow = geometry.isSideBand ? 1 : 2;
  const patientFieldRows: (typeof patientFields)[] = [];
  for (let i = 0; i < patientFields.length; i += patientFieldsPerRow) {
    const row = patientFields.slice(i, i + patientFieldsPerRow);
    while (row.length < patientFieldsPerRow) row.push(null);
    patientFieldRows.push(row);
  }

  // Clinical data helpers
  const complaintsList = useMemo(() => {
    const items: string[] = [];
    if (visitData?.chief_complaint) {
      items.push(visitData.chief_complaint);
    }
    if (Array.isArray(visitData?.complaints)) {
      visitData.complaints.forEach((c: any) => {
        const text = c.complaint || c.name;
        if (!text) return;
        const details = [c.severity, c.duration].filter(Boolean).join(", ");
        items.push(details ? `${text} (${details})` : text);
      });
    }
    if (Array.isArray(prescription.symptoms)) {
      prescription.symptoms.forEach((s: any) => {
        const text = s.symptom_name || s.name;
        if (text && !items.includes(text)) {
          items.push(text);
        }
      });
    }
    return items;
  }, [visitData, prescription.symptoms]);

  const vitalsRecord = useMemo(() => {
    const v =
      (visitData as any)?.vital_signs ||
      (visitData as any)?.vitals ||
      null;
    if (!v) return null;
    return Array.isArray(v) ? v[v.length - 1] : v;
  }, [visitData]);

  const allergyList = useMemo(() => {
    if (Array.isArray(visitData?.drug_allergies)) return visitData.drug_allergies;
    if (Array.isArray((visitData as any)?.allergies)) return (visitData as any).allergies;
    return [];
  }, [visitData]);

  const medicalConditionsList = useMemo(() => {
    if (Array.isArray(visitData?.medical_conditions)) return visitData.medical_conditions;
    const medHistory = (visitData as any)?.medical_history || (visitData as any)?.conditions;
    if (Array.isArray(medHistory)) return medHistory;
    if (medHistory && typeof medHistory === "object") {
      const conditionMap: Record<string, string> = {
        diabetes: "Diabetes Mellitus",
        hypertension: "Hypertension",
        thyroid_disorder: "Thyroid Disorder",
        heart_disease: "Heart Disease",
        asthma: "Asthma",
        tuberculosis: "Tuberculosis",
        kidney_disease: "Kidney Disease",
        liver_disease: "Liver Disease",
        cancer: "Cancer / Malignancy",
        hiv_aids: "HIV / AIDS",
      };
      const result: any[] = [];
      Object.entries(conditionMap).forEach(([key, label]) => {
        if (medHistory[key]) {
          result.push({ condition_name: label, duration: null, control_status: null });
        }
      });
      if (medHistory.other_conditions) {
        result.push({ condition_name: medHistory.other_conditions, duration: null, control_status: null });
      }
      return result;
    }
    return [];
  }, [visitData]);

  const activeSurgeries = useMemo(() => {
    if (Array.isArray(plannedSurgeries) && plannedSurgeries.length > 0) {
      return plannedSurgeries;
    }
    if (Array.isArray(visitData?.planned_surgeries) && visitData.planned_surgeries.length > 0) {
      return visitData.planned_surgeries;
    }
    return [];
  }, [plannedSurgeries, visitData]);

  return (
    <div
      className={`${PRINT_CONTAINER_CLASS} relative bg-white text-black font-sans mx-auto text-sm print:m-0`}
      style={{
        width: "100%",
        maxWidth: "850px",
        ...geometry.containerStyle,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: geometry.pageStyle }} />

      {/* Letterhead band for left/right layouts */}
      {rendersSideBand && geometry.bandStyle && (
        <div className={geometry.bandClassName} style={geometry.bandStyle}>
          <PrintHeader
            tenant={tenant}
            documentType="Prescription"
            variant="vertical"
            align={effectiveLayout.header_align}
            side={headerPosition === "right" ? "right" : "left"}
            showLogo={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_logo}
            showAddress={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_address}
            showContact={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_contact}
            showDivider={effectiveLayout.show_divider}
          />
        </div>
      )}

      {/* Header Section - Configurable */}
      {rendersTopHeader && (
        <PrintHeader
          tenant={tenant}
          documentType="Prescription"
          align={effectiveLayout.header_align}
          showLogo={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_logo}
          showAddress={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_address}
          showContact={effectiveLayout.header_mode === "rendered" && effectiveLayout.show_contact}
          showDivider={effectiveLayout.show_divider}
        />
      )}

      {/* A reserved top band spacer */}
      {geometry.topSpacerMm > 0 && (
        <div style={{ height: `${geometry.topSpacerMm}mm` }} className="mb-2" />
      )}

      {/* Document Status Badge (Right aligned, if Draft) */}
      {prescription.status !== "finalized" && (
        <div className="mb-1 flex justify-end">
          <span className="px-2 py-0.5 bg-slate-50 text-slate-700 font-medium rounded text-[10px] border border-slate-300/80">
            <span className="font-semibold text-slate-600">Prescription Status:</span>{" "}
            <span className="font-bold text-slate-900">Draft</span>{" "}
            <span className="text-[9px] text-slate-500 italic font-normal">(not finalized)</span>
          </span>
        </div>
      )}

      {/* Patient Details Section */}
      <div className={`${isCompact ? "mb-1.5" : "mb-3.5"} border border-slate-400 text-[10px] font-medium`}>
        {patientFieldRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`grid ${geometry.isSideBand ? "grid-cols-[80px_1fr]" : "grid-cols-[100px_1fr_100px_1fr]"} ${rowIdx < patientFieldRows.length - 1 ? "border-b border-slate-300" : ""}`}
          >
            {row.map((field, colIdx) => (
              <React.Fragment key={colIdx}>
                <div className={`bg-slate-50 ${cellPadding} font-semibold border-r border-slate-300 flex items-center gap-1`}>
                  {field ? (
                    <>
                      {field.icon}
                      <span>{field.label}</span>
                    </>
                  ) : (
                    <span />
                  )}
                </div>
                <div
                  className={`${cellPadding} ${field?.valueClass || ""} ${colIdx === 0 && row.length > 1 ? "border-r border-slate-300" : ""}`}
                >
                  {field?.value}
                </div>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* Dynamic Content Sections */}
      {orderedSections.map((key) => {
        switch (key) {
          case "complaints":
            return complaintsList.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <MessageSquare className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Complaints
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {complaintsList.join(", ")}
                </div>
              </div>
            ) : null;

          case "vitals":
            return vitalsRecord ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Activity className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Vitals
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-800 font-medium">
                  {vitalsRecord.systolic_bp && vitalsRecord.diastolic_bp && (
                    <span>
                      <strong className="text-slate-900">BP:</strong> {vitalsRecord.systolic_bp}/{vitalsRecord.diastolic_bp} mmHg
                    </span>
                  )}
                  {vitalsRecord.pulse_rate && (
                    <span>
                      <strong className="text-slate-900">Pulse:</strong> {vitalsRecord.pulse_rate} bpm
                    </span>
                  )}
                  {vitalsRecord.temperature && (
                    <span>
                      <strong className="text-slate-900">Temp:</strong> {vitalsRecord.temperature} °F
                    </span>
                  )}
                  {vitalsRecord.spo2 && (
                    <span>
                      <strong className="text-slate-900">SpO₂:</strong> {vitalsRecord.spo2}%
                    </span>
                  )}
                  {vitalsRecord.respiratory_rate && (
                    <span>
                      <strong className="text-slate-900">RR:</strong> {vitalsRecord.respiratory_rate}/min
                    </span>
                  )}
                  {vitalsRecord.weight && (
                    <span>
                      <strong className="text-slate-900">Wt:</strong> {vitalsRecord.weight} kg
                    </span>
                  )}
                  {vitalsRecord.height && (
                    <span>
                      <strong className="text-slate-900">Ht:</strong> {vitalsRecord.height} cm
                    </span>
                  )}
                  {vitalsRecord.bmi && (
                    <span>
                      <strong className="text-slate-900">BMI:</strong> {vitalsRecord.bmi} kg/m²
                    </span>
                  )}
                </div>
              </div>
            ) : null;

          case "allergies":
            return allergyList.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-red-50 p-1 rounded-sm border border-red-200">
                    <AlertTriangle className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-red-600 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-red-700 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Allergies
                  </span>
                </div>
                <div className="text-xs font-semibold text-red-800 text-left flex flex-wrap gap-x-2">
                  {allergyList.map((a: any, idx: number) => (
                    <span key={idx} className="bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      {a.drug_name} {a.reaction ? `(${a.reaction})` : ""} {a.severity ? `[${a.severity}]` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;

          case "history":
            return medicalConditionsList.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <History className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Medical Hist.
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {medicalConditionsList.map((m: any) => `${m.condition_name}${m.duration ? ` [${m.duration}]` : ""}`).join(", ")}
                </div>
              </div>
            ) : null;

          case "diagnosis":
            return prescription.diagnosis ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <ClipboardCheck className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Diagnosis
                  </span>
                </div>
                <div className={`${sectionFontClass} font-bold text-slate-900 text-left`}>
                  {prescription.diagnosis}
                </div>
              </div>
            ) : null;

          case "medicines":
            return prescription.items && prescription.items.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Pill className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Rx
                  </span>
                </div>

                <div className="w-full text-left">
                  <div className={`space-y-${isExtremelyCompact ? "1" : "2"}`}>
                    {prescription.items.map((item, index) => {
                      const freqDisplay = formatFrequencyByPreference(
                        item.frequency_structure,
                        item.frequency,
                        item.is_prn,
                        frequencyFormat
                      );
                      const doseText = item.dose || item.dosage;
                      const hasTapering = Array.isArray(item.tapering_steps) && item.tapering_steps.length > 0;
                      const datesText = [
                        item.start_date ? `from ${formatDateVal(item.start_date)}` : "",
                        item.end_date ? `to ${formatDateVal(item.end_date)}` : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <div key={index} className="text-xs pb-1.5 border-b border-slate-100 last:border-0">
                          {/* Top Row: Name, Brand, Generic */}
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-bold text-slate-900">{index + 1}. {item.medicine_name}</span>
                            {item.brand && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-medium">
                                {item.brand}
                              </span>
                            )}
                            {item.generic_name && (
                              <span className="text-slate-500 italic text-[10px]">
                                ({item.generic_name})
                              </span>
                            )}
                            {(item.form || (item as any).dosage_form) && (
                              <span className="text-slate-500 text-[10px]">
                                &bull; {item.form || (item as any).dosage_form} {item.strength || ""}
                              </span>
                            )}
                          </div>

                          {/* Medicine details */}
                          <div className="pl-4 mt-0.5 space-y-0.5 text-[10.5px]">
                            {hasTapering ? (
                              <div>
                                <div className="text-slate-700 font-semibold text-[10px] mb-0.5">Tapering Schedule:</div>
                                <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded border border-slate-200 text-[9.5px]">
                                  {item.tapering_steps!.map((step, sIdx) => (
                                    <div key={sIdx} className="text-slate-700">
                                      <span className="font-semibold">{(step as any).days ? `${(step as any).days}d` : step.duration || `Step ${step.sequence || sIdx + 1}`}:</span> {step.dosage || step.frequency}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Dosage, Route, Frequency, Timing */}
                                <div className="font-medium flex flex-wrap gap-x-2 text-slate-800">
                                  {doseText && <span><strong className="text-slate-900">Dose:</strong> {doseText}</span>}
                                  {item.route && <span>• <strong className="text-slate-900">Route:</strong> {item.route}</span>}
                                  {freqDisplay && <span>• <strong className="text-slate-900">Frequency:</strong> {freqDisplay}</span>}
                                  {item.timing && <span>• <strong className="text-slate-900">Timing:</strong> {item.timing}</span>}
                                  {item.is_prn && (
                                    <span className="text-amber-800 font-semibold">
                                      • PRN / SOS {item.prn_reason ? `(${item.prn_reason})` : ""}
                                    </span>
                                  )}
                                </div>

                                {/* Duration, Dates, Quantity */}
                                {(item.duration || datesText || item.quantity) && (
                                  <div className="text-slate-600 flex flex-wrap gap-x-2 text-[9.5px]">
                                    {item.duration && <span><strong className="text-slate-700">Duration:</strong> {item.duration}</span>}
                                    {datesText && <span>({datesText.trim()})</span>}
                                    {item.quantity && <span>• <strong className="text-slate-700">Qty:</strong> {item.quantity}</span>}
                                  </div>
                                )}

                                {/* Instructions & Special Instructions */}
                                {(item.instructions || item.special_instructions) && (
                                  <div className="text-slate-600 text-[9.5px] italic">
                                    {item.instructions && <span>Instructions: {item.instructions}</span>}
                                    {item.instructions && item.special_instructions && <span> • </span>}
                                    {item.special_instructions && (
                                      <span className="text-amber-800 font-normal">
                                        Special Note: {item.special_instructions}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null;

          case "tests":
            return prescription.advice_items?.some((a) => a.advice_type === "lab-test" || (a as any).advice_type === "test") ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <FlaskConical className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Lab Invest.
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {prescription.advice_items
                    .filter((a) => a.advice_type === "lab-test" || (a as any).advice_type === "test")
                    .map((a) => a.description)
                    .join(", ")}
                </div>
              </div>
            ) : null;

          case "advice":
            return prescription.advice_items?.some((a) => a.advice_type !== "lab-test" && (a as any).advice_type !== "test") ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Info className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Advice
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {prescription.advice_items
                    .filter((a) => a.advice_type !== "lab-test" && (a as any).advice_type !== "test")
                    .map((a) => a.description)
                    .join(", ")}
                </div>
              </div>
            ) : null;

          case "plan":
            return prescription.plan_of_action ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Target className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Plan
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {prescription.plan_of_action}
                </div>
              </div>
            ) : null;

          case "remarks":
            return prescription.remarks ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <MessageSquare className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Remarks
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left`}>
                  {prescription.remarks}
                </div>
              </div>
            ) : null;

          case "surgeries":
            return activeSurgeries.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Stethoscope className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Procedures
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium text-slate-800 text-left space-y-1`}>
                  {activeSurgeries.map((s: any, idx: number) => (
                    <div key={idx} className="flex flex-wrap gap-x-2 items-baseline">
                      <span className="font-bold text-slate-900">• {s.surgery_name}</span>
                      {s.eye && <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">Eye: {s.eye}</span>}
                      {(s.planned_date || s.advised_date) && (
                        <span className="text-slate-500 text-[10px]">
                          Advised: {formatDateVal(s.planned_date || s.advised_date)}
                        </span>
                      )}
                      {s.notes && <span className="text-slate-500 italic text-[10px]">({s.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null;

          case "notes":
            return prescription.notes ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <FileText className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Notes
                  </span>
                </div>
                <div className={`${sectionFontClass} text-left font-medium text-slate-800`}>
                  {prescription.notes}
                </div>
              </div>
            ) : null;

          case "followup":
            return prescription.followup_date ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Calendar className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Follow Up
                  </span>
                </div>
                <div className={`${sectionFontClass} text-left font-bold text-slate-900`}>
                  Follow up on {formatDateVal(prescription.followup_date)} (or earlier in case of any discomfort)
                </div>
              </div>
            ) : null;

          default:
            return null;
        }
      })}

      {/* Doctor Information & Signature Section */}
      {(!effectiveLayout.visible_sections ||
        effectiveLayout.visible_sections.includes("Digital Signature") ||
        effectiveLayout.visible_sections.includes("Signature Placeholder")) && (
        <div className={`flex justify-between items-end ${isExtremelyCompact ? "mt-2" : isCompact ? "mt-3" : "mt-5"} pt-2 border-t border-slate-300 break-inside-avoid gap-4`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium flex-1">
            <div className="whitespace-nowrap">
              Issued Date & Time : {formatDateVal(prescription.created_at)} {formatTimeVal(prescription.created_at)}
            </div>
            <div className="text-[9px] text-slate-400 font-medium italic tracking-wider whitespace-nowrap">
              Powered by <span className="text-slate-500 font-bold not-italic">Technesian Cura</span> &bull; <span className="text-slate-400">Revolutionizing Hospital Management</span> &bull; <span className="text-sky-700/70 not-italic">www.technesian.com</span>
            </div>
          </div>
          <div className={`text-center ${geometry.isSideBand ? "w-40" : "w-52"} shrink-0`}>
            <div className={`${isCompact ? "h-12" : "h-16"} flex items-end justify-center mb-1`}>
              {doctorSignature && (!effectiveLayout.visible_sections || effectiveLayout.visible_sections.includes("Digital Signature")) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={doctorSignature}
                  src={doctorSignature}
                  alt={`Signature of ${consultantName}`}
                  className={`${isCompact ? "max-h-12" : "max-h-16"} w-auto object-contain`}
                />
              ) : (!effectiveLayout.visible_sections || effectiveLayout.visible_sections.includes("Signature Placeholder")) ? (
                <div className="border-b border-dashed border-slate-300 w-full h-8" />
              ) : (
                <div className="h-8" />
              )}
            </div>
            <div className="font-bold text-xs uppercase text-slate-900">{consultantName}</div>
            {consultantSpec && <div className="text-[10px] text-slate-600 font-medium">{consultantSpec}</div>}
            <div className="text-[9.5px] text-slate-500 font-medium">Doctor&apos;s Signature</div>
          </div>
        </div>
      )}
    </div>
  );
}
