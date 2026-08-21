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
  FileText
} from "lucide-react";

interface PrescriptionPrintProps {
  prescription: PrescriptionResponse;
  layout?: PrintLayoutConfig;
  showHeader?: boolean;
  doctorSignature?: string | null;
  visitData?: PrescriptionDataResponse | null;
  visibleSections?: string[];
  sectionOrder?: string[];
}

export function PrescriptionPrint({
  prescription,
  layout,
  showHeader,
  doctorSignature,
  visitData,
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
  const totalItemsScore = medicineCount + adviceCount + (prescription.diagnosis ? 1 : 0) + (prescription.notes ? 1 : 0);

  const compactThreshold = geometry.isSideBand ? 11 : 15;
  const extremeThreshold = geometry.isSideBand ? 19 : 25;
  const isCompact = totalItemsScore > compactThreshold;
  const isExtremelyCompact = totalItemsScore > extremeThreshold;

  const spacingClass = isExtremelyCompact ? "mb-0.5" : isCompact ? "mb-1" : "mb-4";
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

  // Build patient fields grid identically to the optometrist prescription
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
      value: visitData?.uhid || prescription.patient_id?.slice(0, 8) || "-",
      valueClass: "font-bold",
    },
    {
      icon: <UserRound className={iconClass} />,
      label: "Consultant",
      value: prescription.doctor_name,
      valueClass: "font-bold",
    },
    {
      icon: <User className={iconClass} />,
      label: "Patient Name",
      value: prescription.patient_name,
      valueClass: "font-bold text-sky-900",
    },
    {
      icon: <Hash className={iconClass} />,
      label: "OPD No.",
      value: visitData?.visit_number || prescription.visit_number || prescription.visit_id?.slice(0, 8) || "-",
    },
    {
      icon: <Calendar className={iconClass} />,
      label: "Date",
      value: `${formatDateVal(visitData?.checked_in_at || prescription.created_at)} ${formatTimeVal(visitData?.checked_in_at || prescription.created_at)}`,
    },
    {
      icon: <MapPin className={iconClass} />,
      label: "Address",
      value: visitData?.address || "-",
    },
    {
      icon: <User className={iconClass} />,
      label: "Category",
      value: (visitData as any)?.category || (visitData as any)?.patient_category || "-",
      valueClass: "font-bold",
    },
    {
      icon: <Phone className={iconClass} />,
      label: "Mobile No.",
      value: visitData?.mobile || "-",
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

      {/* Patient Details Section - Matches the Box style in Optometrist Prescription */}
      <div className={`${isCompact ? "mb-1" : "mb-4"} border border-slate-400 text-[10px] font-medium`}>
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
                <div className="text-xs text-left">
                  <p className="uppercase font-medium">{prescription.diagnosis}</p>
                </div>
              </div>
            ) : null;

          case "medicines":
            return prescription.items && prescription.items.length > 0 ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2 pt-1">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Pill className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Prescription
                  </span>
                </div>
                <div>
                  <div className={`${isCompact ? "space-y-1" : "space-y-2.5"}`}>
                    {prescription.items.map((item, idx) => {
                      const doseText = item.dose || item.dosage;
                      const formattedFreq = formatFrequencyByPreference(
                        item.frequency_structure,
                        item.frequency,
                        item.is_prn,
                        frequencyFormat
                      );
                      const freqDisplay = item.is_prn
                        ? `PRN / SOS${item.prn_reason ? ` (Reason: ${item.prn_reason})` : ""}`
                        : (formattedFreq || item.frequency);
                      const datesText =
                        item.start_date || item.end_date
                          ? `${formatDateVal(item.start_date)} ${item.end_date ? `to ${formatDateVal(item.end_date)}` : ""}`
                          : "";

                      return (
                        <div key={item.id || idx} className={sectionFontClass}>
                          {/* Main Title line */}
                          <div className="font-bold flex gap-2 leading-tight text-sky-900 flex-wrap items-center">
                            <span>{idx + 1}. {item.medicine_name}</span>
                            {item.generic_name && (
                              <span className="italic font-normal text-slate-500 text-[10px]">
                                ({item.generic_name})
                              </span>
                            )}
                            {item.brand && (
                              <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 text-[9px] rounded border border-slate-200">
                                Brand: {item.brand}
                              </span>
                            )}
                            {(item.form || item.strength) && (
                              <span className="font-semibold text-slate-700 text-[10px]">
                                • {[item.form, item.strength].filter(Boolean).join(" ")}
                              </span>
                            )}
                          </div>

                          {/* Detail Lines */}
                          <div className="pl-5 text-[10px] text-slate-700 space-y-0.5 mt-0.5">
                            {item.tapering_steps && item.tapering_steps.length > 0 ? (
                              <div className="mt-1 bg-purple-50/30 border border-purple-100/50 rounded-md p-2 max-w-md">
                                <span className="text-[9px] font-bold text-purple-800 uppercase block mb-1">📉 Tapering Dose Schedule:</span>
                                <div className="space-y-1">
                                  {item.tapering_steps.map((step, sIdx) => (
                                    <div key={sIdx} className="text-[9px] text-slate-700">
                                      <span className="font-bold text-purple-950">Step {sIdx + 1}: </span>
                                      <span>{step.dosage || item.dosage || ""}</span>
                                      {step.frequency && <span> • {step.frequency}</span>}
                                      {step.duration && <span> • {step.duration}</span>}
                                      {step.instructions && <span className="italic text-slate-500"> ({step.instructions})</span>}
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
            return prescription.advice_items?.some((a) => a.advice_type === "lab-test") ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <FlaskConical className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Lab Invest.
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium uppercase text-xs text-left`}>
                  {prescription.advice_items
                    .filter((a) => a.advice_type === "lab-test")
                    .map((a) => a.description)
                    .join(", ")}
                </div>
              </div>
            ) : null;

          case "advice":
            return prescription.advice_items?.some((a) => a.advice_type !== "lab-test") ? (
              <div key={key} className={`${spacingClass} break-inside-avoid grid grid-cols-[var(--rx-label-col)_1fr] gap-2 items-start`}>
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="bg-slate-50 p-1 rounded-sm border border-slate-100">
                    <Info className={`${isExtremelyCompact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-sky-700 shrink-0`} />
                  </div>
                  <span className={`font-bold uppercase tracking-tight text-slate-900 leading-tight ${isExtremelyCompact ? "text-[8px]" : "text-[10px]"}`}>
                    Advice
                  </span>
                </div>
                <div className={`${sectionFontClass} font-medium uppercase text-xs text-left`}>
                  {prescription.advice_items
                    .filter((a) => a.advice_type !== "lab-test")
                    .map((a) => a.description)
                    .join(", ")}
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
                <div className="text-xs text-left font-medium">
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
                <div className="text-xs text-left font-bold text-slate-900">
                  Follow up on {formatDateVal(prescription.followup_date)}
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
        <div className={`flex justify-between items-end ${isExtremelyCompact ? "mt-2" : isCompact ? "mt-4" : "mt-6"} pt-2 border-t border-slate-300 break-inside-avoid gap-4`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium flex-1">
            <div className="whitespace-nowrap">
              Issued Date & Time : {formatDateVal(prescription.created_at)} {formatTimeVal(prescription.created_at)}
            </div>
            <div className="text-[9px] text-slate-400 font-medium italic tracking-wider whitespace-nowrap">
              Powered by <span className="text-slate-500 font-bold not-italic">Technesian Cura</span> &bull; <span className="text-slate-400">Revolutionizing Hospital Management</span> &bull; <span className="text-sky-700/70 not-italic">www.technesian.com</span>
            </div>
          </div>
          <div className={`text-center ${geometry.isSideBand ? "w-40" : "w-48"} shrink-0`}>
            <div className={`${isCompact ? "h-12" : "h-16"} flex items-end justify-center mb-1`}>
              {doctorSignature && (!effectiveLayout.visible_sections || effectiveLayout.visible_sections.includes("Digital Signature")) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={doctorSignature}
                  src={doctorSignature}
                  alt={`Signature of ${prescription.doctor_name || "Doctor"}`}
                  className={`${isCompact ? "max-h-12" : "max-h-16"} w-auto object-contain`}
                />
              ) : (!effectiveLayout.visible_sections || effectiveLayout.visible_sections.includes("Signature Placeholder")) ? (
                <div className="border-b border-dashed border-slate-300 w-full h-8" />
              ) : (
                <div className="h-8" />
              )}
            </div>
            <div className="font-bold text-xs uppercase text-slate-900">{prescription.doctor_name || "Medical Officer"}</div>
            <div className="text-[10px] text-slate-500 font-medium">Doctor&apos;s Signature</div>
          </div>
        </div>
      )}


    </div>
  );
}
