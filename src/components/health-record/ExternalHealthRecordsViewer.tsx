"use client";

import { useMemo, useState } from "react";
import {
  ExternalHealthRecordDto,
  hiuConsentService,
} from "@/services/hiuConsentService";
import { Modal } from "@/components/common/Modal";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileText,
  Fingerprint,
  Home,
  Hourglass,
  Info,
  Layers,
  Pill,
  Receipt,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Tag,
  User,
} from "lucide-react";

interface ExternalHealthRecordsViewerProps {
  records: ExternalHealthRecordDto[];
  loading?: boolean;
}

interface CareContextGroup {
  careContextReference: string;
  careContextName?: string | null;
  latestDate: string;
  records: ExternalHealthRecordDto[];
}

interface HospitalGroup {
  hipId: string;
  hipName: string;
  latestActivity: string;
  isCurrentFacility: boolean;
  totalRecordsCount: number;
  careContexts: CareContextGroup[];
}

export function ExternalHealthRecordsViewer({
  records,
  loading,
}: ExternalHealthRecordsViewerProps) {
  const [selectedRecordForPdf, setSelectedRecordForPdf] =
    useState<ExternalHealthRecordDto | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [jsonDrawerRecord, setJsonDrawerRecord] =
    useState<ExternalHealthRecordDto | null>(null);

  // Drilldown Navigation State:
  // Step 1: All Hospitals -> selectedHospitalKey
  // Step 2: Hospital Care Contexts -> selectedCareContextRef
  // Step 3: Care Context Documents
  const [selectedHospitalKey, setSelectedHospitalKey] = useState<string | null>(null);
  const [selectedCareContextRef, setSelectedCareContextRef] = useState<string | null>(null);

  // Default collapsed on health record cards
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------
  // Grouping, Deduplication, and Sorting Engine
  // -------------------------------------------------------------
  const groupedHospitals: HospitalGroup[] = useMemo(() => {
    if (!records || records.length === 0) return [];

    // Step 1: Group by Hospital
    const hospitalMap: Record<string, ExternalHealthRecordDto[]> = {};
    for (const rec of records) {
      const hipKey = rec.hip_name || rec.hip_id || "External Hospital";
      if (!hospitalMap[hipKey]) {
        hospitalMap[hipKey] = [];
      }
      hospitalMap[hipKey].push(rec);
    }

    const hospitalGroups: HospitalGroup[] = [];

    for (const [hipKey, hospitalRecords] of Object.entries(hospitalMap)) {
      const hipId = hospitalRecords[0]?.hip_id || "HIP";
      const hipName = hipKey;

      // Step 2: Group by Care Context within Hospital
      const contextMap: Record<string, ExternalHealthRecordDto[]> = {};
      for (const rec of hospitalRecords) {
        const ccKey = rec.care_context_reference || "General Consultation";
        if (!contextMap[ccKey]) {
          contextMap[ccKey] = [];
        }
        contextMap[ccKey].push(rec);
      }

      const careContextGroups: CareContextGroup[] = [];

      for (const [ccKey, contextRecords] of Object.entries(contextMap)) {
        // Step 3: Smart Deduplication & Event Tracking
        const seenEvents = new Set<string>();
        const deduplicatedRecords: ExternalHealthRecordDto[] = [];

        for (const rec of contextRecords) {
          const chk = rec.checksum || rec.id;
          const eraseKey = rec.data_erase_at ? rec.data_erase_at.substring(0, 10) : "no-erase";
          const createdKey = rec.created_at ? rec.created_at.substring(0, 13) : "no-create";
          const eventFingerprint = `${chk}_${eraseKey}_${createdKey}`;

          if (!seenEvents.has(eventFingerprint)) {
            seenEvents.add(eventFingerprint);
            deduplicatedRecords.push(rec);
          }
        }

        // Sort records within care context descending by record_date / created_at
        deduplicatedRecords.sort((a, b) => {
          const dateA = new Date(a.record_date || a.created_at).getTime();
          const dateB = new Date(b.record_date || b.created_at).getTime();
          return dateB - dateA;
        });

        const latestContextDate = deduplicatedRecords[0]
          ? deduplicatedRecords[0].record_date || deduplicatedRecords[0].created_at
          : new Date().toISOString();

        careContextGroups.push({
          careContextReference: ccKey,
          careContextName: contextRecords[0]?.care_context_name || null,
          latestDate: latestContextDate,
          records: deduplicatedRecords,
        });
      }

      // Sort care contexts descending by latest activity date
      careContextGroups.sort((a, b) => {
        return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
      });

      const latestHospitalActivity = careContextGroups[0]?.latestDate || new Date().toISOString();
      const totalDocs = careContextGroups.reduce((acc, cc) => acc + cc.records.length, 0);

      // Check if this facility matches current local facility
      const isLocal =
        hipId === "IN0610090730" ||
        hipName.toLowerCase().includes("technesian") ||
        hipName.toLowerCase().includes("city hospital");

      hospitalGroups.push({
        hipId,
        hipName,
        latestActivity: latestHospitalActivity,
        isCurrentFacility: isLocal,
        totalRecordsCount: totalDocs,
        careContexts: careContextGroups,
      });
    }

    // Sort hospitals descending by latest activity (most recent on top)
    hospitalGroups.sort((a, b) => {
      return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
    });

    return hospitalGroups;
  }, [records]);

  // Current Selected Objects
  const activeHospital = useMemo(() => {
    if (!selectedHospitalKey) return null;
    return groupedHospitals.find((h) => h.hipName === selectedHospitalKey) || null;
  }, [groupedHospitals, selectedHospitalKey]);

  const activeCareContext = useMemo(() => {
    if (!activeHospital || !selectedCareContextRef) return null;
    return (
      activeHospital.careContexts.find(
        (c) => c.careContextReference === selectedCareContextRef
      ) || null
    );
  }, [activeHospital, selectedCareContextRef]);

  // Toggle record expand
  const toggleRecordExpand = (recId: string) => {
    setExpandedRecordIds((prev) => ({
      ...prev,
      [recId]: !prev[recId],
    }));
  };

  // PDF Preview Handler
  const handleOpenPdf = async (rec: ExternalHealthRecordDto) => {
    setSelectedRecordForPdf(rec);
    setLoadingPdf(true);
    try {
      const blob = await hiuConsentService.getRecordPdfBlob(rec.id);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      toast.error("Failed to load PDF attachment or consent has expired");
      setSelectedRecordForPdf(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleClosePdf = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    setSelectedRecordForPdf(null);
  };

  const copyChecksum = (chk: string) => {
    navigator.clipboard.writeText(chk);
    toast.success("MD5 Checksum copied to clipboard");
  };

  const getRecordTypeBadge = (hiType: string) => {
    switch (hiType) {
      case "Prescription":
      case "Prescription record":
        return {
          icon: <Pill className="h-3.5 w-3.5 text-amber-600" />,
          style: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "DiagnosticReport":
      case "Diagnostic Report":
        return {
          icon: <Activity className="h-3.5 w-3.5 text-purple-600" />,
          style: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "OPConsultation":
      case "Clinical consultation report":
        return {
          icon: <Stethoscope className="h-3.5 w-3.5 text-sky-600" />,
          style: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "Invoice":
        return {
          icon: <Receipt className="h-3.5 w-3.5 text-cyan-600" />,
          style: "bg-cyan-50 text-cyan-700 border-cyan-200",
        };
      default:
        return {
          icon: <FileText className="h-3.5 w-3.5 text-slate-600" />,
          style: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-slate-600">Loading external health records...</p>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-700">No External Health Records Retrieved Yet</p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Once the patient approves a consent request, click &quot;Fetch Health Records&quot; to securely download and view their clinical history from other hospitals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* Breadcrumb Navigation Header (OPD Style) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
        <nav className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedHospitalKey(null);
              setSelectedCareContextRef(null);
            }}
            className={`flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg transition ${
              !selectedHospitalKey
                ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs"
                : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-sky-600" />
            <span>All Hospitals ({groupedHospitals.length})</span>
          </button>

          {activeHospital && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setSelectedCareContextRef(null)}
                className={`flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg transition ${
                  !selectedCareContextRef
                    ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <span>{activeHospital.hipName}</span>
                <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[10px] text-purple-800">
                  {activeHospital.careContexts.length} Contexts
                </span>
              </button>
            </>
          )}

          {activeCareContext && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>{activeCareContext.careContextName || activeCareContext.careContextReference}</span>
              </span>
            </>
          )}
        </nav>

        {/* Back Button */}
        {selectedCareContextRef ? (
          <button
            type="button"
            onClick={() => setSelectedCareContextRef(null)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Care Contexts</span>
          </button>
        ) : selectedHospitalKey ? (
          <button
            type="button"
            onClick={() => setSelectedHospitalKey(null)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Hospitals</span>
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: All Hospitals List (Clean Clickable Cards) */}
      {/* ------------------------------------------------------------- */}
      {!selectedHospitalKey && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium">
            Select a hospital facility to view its associated care contexts and clinical records:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {groupedHospitals.map((hospital, hIdx) => {
              return (
                <div
                  key={hospital.hipName}
                  onClick={() => setSelectedHospitalKey(hospital.hipName)}
                  className="cursor-pointer group relative rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100 group-hover:scale-105 transition">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                              {hospital.hipName}
                            </h3>
                            {hospital.isCurrentFacility ? (
                              <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                                Current Facility
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                External Hospital
                              </span>
                            )}
                          </div>
                          {hospital.hipId && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200 mt-0.5 inline-block">
                              Facility ID: {hospital.hipId}
                            </span>
                          )}
                        </div>
                      </div>

                      {hIdx === 0 && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                          Latest Activity
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                        <Layers className="h-3.5 w-3.5 text-purple-600" />
                        <span>{hospital.careContexts.length} Care Context{hospital.careContexts.length > 1 ? "s" : ""}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
                        <FileCheck className="h-3.5 w-3.5 text-sky-600" />
                        <span>{hospital.totalRecordsCount} Medical Record{hospital.totalRecordsCount > 1 ? "s" : ""}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Active: {formatDate(hospital.latestActivity)}
                    </span>
                    <span className="font-semibold text-sky-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      <span>View Care Contexts</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: Care Contexts of Selected Hospital (Clean Clickable Cards) */}
      {/* ------------------------------------------------------------- */}
      {selectedHospitalKey && !selectedCareContextRef && activeHospital && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600 font-medium">
              Select a care context (visit/episode) under <span className="font-bold text-slate-900">{activeHospital.hipName}</span>:
            </p>
            <span className="text-xs text-slate-500">
              {activeHospital.careContexts.length} Visit Contexts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeHospital.careContexts.map((context) => {
              const docTypes = Array.from(
                new Set(context.records.map((r) => r.summary?.document_type || r.hi_type))
              );

              return (
                <div
                  key={context.careContextReference}
                  onClick={() => setSelectedCareContextRef(context.careContextReference)}
                  className="cursor-pointer group rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 border border-purple-100 group-hover:scale-105 transition">
                          <Stethoscope className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
                            {context.careContextName || context.careContextReference}
                          </h4>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200 mt-0.5 inline-block">
                            Ref: {context.careContextReference}
                          </span>
                        </div>
                      </div>

                      <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200 shrink-0">
                        {context.records.length} Record{context.records.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Document Type Badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                      {docTypes.map((dt, dtIdx) => (
                        <span
                          key={dtIdx}
                          className="rounded bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                        >
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Visit Date: {formatDate(context.latestDate)}
                    </span>
                    <span className="font-semibold text-purple-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      <span>View Documents</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: Health Records & Documents under Selected Care Context */}
      {/* ------------------------------------------------------------- */}
      {selectedHospitalKey && selectedCareContextRef && activeCareContext && (
        <div className="space-y-4">
          {/* Top Care Context Context Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Care Context</p>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                {activeCareContext.careContextName || activeCareContext.careContextReference}
              </h4>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>Reference: <code className="font-mono text-slate-700">{activeCareContext.careContextReference}</code></span>
                <span>•</span>
                <span>Hospital: <span className="font-semibold text-slate-800">{activeHospital?.hipName}</span> ({activeHospital?.hipId})</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                {activeCareContext.records.length} Document{activeCareContext.records.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* List of Decrypted Document Cards - Collapsible by default */}
          <div className="space-y-3">
            {activeCareContext.records.map((rec, recIdx) => {
              const summary = rec.summary || {};
              const meds = summary.medications || [];
              const diagnoses = summary.diagnoses || [];
              const obs = summary.observations || [];
              const invoice = summary.invoice;

              // Default collapsed as requested by user
              const isExpanded = expandedRecordIds[rec.id] ?? false;
              const typeBadge = getRecordTypeBadge(rec.hi_type);

              return (
                <div
                  key={rec.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                >
                  {/* Clickable Document Header Bar */}
                  <div
                    onClick={() => toggleRecordExpand(rec.id)}
                    className="cursor-pointer bg-slate-50/70 hover:bg-slate-100/70 px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-700">
                        #{recIdx + 1}
                      </span>

                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${typeBadge.style}`}>
                        {typeBadge.icon}
                        <span>{summary.title || rec.hi_type}</span>
                      </span>

                      {summary.practitioner && (
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                          <User className="h-3 w-3 text-slate-400" />
                          Dr. {summary.practitioner}
                        </span>
                      )}

                      {rec.record_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Doc Date: {formatDate(rec.record_date)}
                        </span>
                      )}

                      {rec.data_erase_at && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Hourglass className="h-3 w-3 text-amber-600" />
                          Erases: {formatDate(rec.data_erase_at)}
                        </span>
                      )}
                    </div>

                    {/* Header Action Buttons */}
                    <div
                      className="flex items-center gap-2 self-start sm:self-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rec.has_pdf && (
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(rec)}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View PDF</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setJsonDrawerRecord(rec)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        title="View Decrypted FHIR JSON"
                      >
                        <Code2 className="h-3 w-3 text-slate-400" />
                        <span>FHIR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleRecordExpand(rec.id)}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                        title={isExpanded ? "Collapse" : "Expand details"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Document Card Body (Expanded Details) */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Metadata Sub-line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Retrieved: {formatDate(rec.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {rec.checksum_verified && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Checksum Verified
                            </span>
                          )}
                          {rec.checksum && (
                            <button
                              type="button"
                              onClick={() => copyChecksum(rec.checksum!)}
                              className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 transition"
                              title="Click to copy MD5 Hash"
                            >
                              <Fingerprint className="h-3 w-3 text-slate-400" />
                              {rec.checksum.substring(0, 10)}...
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. Prescriptions Detailed View */}
                      {meds.length > 0 && (
                        <div className="space-y-2">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                            <Pill className="h-3.5 w-3.5 text-amber-600" />
                            Prescribed Medications ({meds.length})
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {meds.map((m, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-slate-50/70 p-3 border border-slate-200 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-xs font-bold text-slate-900">{m.name}</span>
                                    {m.status && (
                                      <span className="rounded bg-white px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 border border-slate-200 uppercase">
                                        {m.status}
                                      </span>
                                    )}
                                  </div>
                                  {m.dosage && (
                                    <p className="text-xs text-slate-700 mt-1">
                                      Dosage: <span className="font-semibold text-slate-900">{m.dosage}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600">
                                  {m.frequency && (
                                    <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800 border border-slate-200">
                                      Timing: {m.frequency}
                                    </span>
                                  )}
                                  {m.duration && (
                                    <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800 border border-slate-200">
                                      Duration: {m.duration}
                                    </span>
                                  )}
                                  {m.route && (
                                    <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-800 border border-slate-200">
                                      Route: {m.route}
                                    </span>
                                  )}
                                  {m.instructions && (
                                    <span className="text-slate-600 italic">
                                      ({m.instructions})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Invoice & Financial Breakdown */}
                      {invoice && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                              <Receipt className="h-3.5 w-3.5 text-cyan-600" />
                              Invoice & Billing Summary
                            </p>
                            <div className="flex items-center gap-2">
                              {invoice.invoice_number && (
                                <span className="text-xs font-mono font-semibold text-slate-700">
                                  Invoice #{invoice.invoice_number}
                                </span>
                              )}
                              {invoice.status && (
                                <span className="rounded bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
                                  {invoice.status}
                                </span>
                              )}
                            </div>
                          </div>

                          {invoice.line_items && invoice.line_items.length > 0 && (
                            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2">Service / Item Description</th>
                                    <th className="px-3 py-2 text-center">Qty</th>
                                    <th className="px-3 py-2 text-right">Unit Price</th>
                                    <th className="px-3 py-2 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {invoice.line_items.map((item, iIdx) => (
                                    <tr key={iIdx} className="hover:bg-slate-50/50">
                                      <td className="px-3 py-2 font-medium">{item.description}</td>
                                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                                      <td className="px-3 py-2 text-right font-mono">
                                        {invoice.currency === "INR" ? "₹" : invoice.currency}{" "}
                                        {item.unit_price.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold font-mono">
                                        {invoice.currency === "INR" ? "₹" : invoice.currency}{" "}
                                        {item.total_price.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {invoice.total_amount !== undefined && invoice.total_amount !== null && (
                                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                                    <tr>
                                      <td colSpan={3} className="px-3 py-2 text-right">Total Bill:</td>
                                      <td className="px-3 py-2 text-right text-sm text-slate-900 font-mono">
                                        {invoice.currency === "INR" ? "₹" : invoice.currency}{" "}
                                        {Number(invoice.total_amount).toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Diagnoses & Observations Highlights */}
                      {(diagnoses.length > 0 || obs.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {diagnoses.length > 0 && (
                            <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-200">
                              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                                <Stethoscope className="h-3 w-3 text-sky-600" />
                                Diagnoses / Conditions
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {diagnoses.map((d, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 border border-slate-200 shadow-2xs"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {obs.length > 0 && (
                            <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-200">
                              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                                <Activity className="h-3 w-3 text-purple-600" />
                                Clinical Observations
                              </p>
                              <div className="space-y-1.5">
                                {obs.map((o, oIdx) => (
                                  <div key={oIdx} className="text-xs text-slate-800 flex items-center justify-between">
                                    <span className="text-slate-600">{o.name}:</span>
                                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {o.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PDF View Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedRecordForPdf && (
        <Modal
          isOpen={true}
          onClose={handleClosePdf}
          title={`Document View - ${selectedRecordForPdf.hi_type}`}
          size="xl"
        >
          <div className="flex flex-col h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {selectedRecordForPdf.hip_name || "External Hospital"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Care Context: {selectedRecordForPdf.care_context_reference || "N/A"}
                </p>
              </div>
              {pdfBlobUrl && (
                <a
                  href={pdfBlobUrl}
                  download={`ABDM_${selectedRecordForPdf.hi_type}_${selectedRecordForPdf.care_context_reference || "record"}.pdf`}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </a>
              )}
            </div>

            <div className="flex-1 mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
              {loadingPdf ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="h-full w-full border-0"
                  title="PDF Viewer"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                  No PDF preview available
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Decrypted Raw FHIR JSON Modal */}
      {/* ------------------------------------------------------------- */}
      {jsonDrawerRecord && (
        <Modal
          isOpen={true}
          onClose={() => setJsonDrawerRecord(null)}
          title={`Decrypted FHIR Bundle - ${jsonDrawerRecord.hi_type}`}
          size="lg"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
              <span>Transaction ID: <code className="font-mono text-slate-700">{jsonDrawerRecord.transaction_id}</code></span>
              <span>Consent ID: <code className="font-mono text-slate-700">{jsonDrawerRecord.consent_id}</code></span>
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-900 p-4 text-xs font-mono text-emerald-400">
              {JSON.stringify(jsonDrawerRecord.bundle_json, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
}
