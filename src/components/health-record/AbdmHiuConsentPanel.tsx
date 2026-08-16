"use client";

import { useEffect, useState, useCallback } from "react";
import {
  hiuConsentService,
  ConsentRequestDto,
  ExternalHealthRecordDto,
} from "@/services/hiuConsentService";
import { AbdmConsentRequestModal } from "./AbdmConsentRequestModal";
import { ExternalHealthRecordsViewer } from "./ExternalHealthRecordsViewer";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileCheck,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface AbdmHiuConsentPanelProps {
  patientId: string;
  patientName: string;
  patientAbha?: string | null;
  patientUhid?: string;
}

export function AbdmHiuConsentPanel({
  patientId,
  patientName,
  patientAbha,
  patientUhid,
}: AbdmHiuConsentPanelProps) {
  const [consentRequests, setConsentRequests] = useState<ConsentRequestDto[]>([]);
  const [records, setRecords] = useState<ExternalHealthRecordDto[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [fetchingDataForId, setFetchingDataForId] = useState<string | null>(null);

  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  // Default collapsed as requested by user
  const [isConsentsExpanded, setIsConsentsExpanded] = useState(false);

  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const loadData = useCallback(async () => {
    if (!patientId) return;

    setLoadingRequests(true);
    setLoadingRecords(true);

    try {
      const [reqs, recs] = await Promise.all([
        hiuConsentService.listConsentRequests(patientId, patientAbha, tenantId),
        hiuConsentService.getPatientExternalRecords(patientId, tenantId),
      ]);
      setConsentRequests(reqs);
      setRecords(recs);
    } catch (err: any) {
      console.error("Failed to load HIU data:", err);
    } finally {
      setLoadingRequests(false);
      setLoadingRecords(false);
    }
  }, [patientId, patientAbha, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFetchData = async (consentReqId: string) => {
    setFetchingDataForId(consentReqId);
    try {
      const res = await hiuConsentService.fetchHealthInformation(consentReqId, tenantId);
      toast.success(res.message || "Data transfer request sent to external hospital!");
      // Reload after slight delay to allow inbound webhook processing
      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to trigger data fetch");
    } finally {
      setFetchingDataForId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "GRANTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>GRANTED</span>
          </span>
        );
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>PENDING APPROVAL</span>
          </span>
        );
      case "DENIED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>DENIED</span>
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
            <span>REVOKED</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>EXPIRED</span>
          </span>
        );
      default:
        return (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
        );
    }
  };

  const grantedCount = consentRequests.filter((r) => r.status === "GRANTED").length;
  const pendingCount = consentRequests.filter((r) => r.status === "REQUESTED").length;

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary (Matching OPD Header Theme) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                ABDM External Health Records (HIU)
              </h3>
              <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[10px] font-bold text-sky-800">
                M3
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Request and view patient clinical history from ABDM-linked facilities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loadingRequests || loadingRecords}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!patientAbha) {
                toast.error("Please attach or verify an ABHA address for this patient first.");
                return;
              }
              setIsConsentModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Consent Request</span>
          </button>
        </div>
      </div>

      {/* Patient ABHA Warning if missing */}
      {!patientAbha && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">No ABHA Address Linked</p>
            <p className="text-amber-700">
              To request external records from other hospitals via ABDM, the patient must have an active ABHA address (e.g. name@sbx).
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Collapsible Consent Requests */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsConsentsExpanded((prev) => !prev)}
          className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between transition text-left"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <Shield className="h-4 w-4 text-sky-600" />
              <span>Consent Requests ({consentRequests.length})</span>
            </div>

            {grantedCount > 0 && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                {grantedCount} Granted
              </span>
            )}

            {pendingCount > 0 && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                {pendingCount} Pending
              </span>
            )}

            {!isConsentsExpanded && (
              <span className="text-[11px] text-slate-400 font-normal ml-1">
                (Click to view consent audit table)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <span>{isConsentsExpanded ? "Collapse" : "Expand"}</span>
            {isConsentsExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </div>
        </button>

        {isConsentsExpanded && (
          <div className="p-4 border-t border-slate-200 space-y-3">
            {loadingRequests ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-2" />
                Checking consent statuses...
              </div>
            ) : consentRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
                No consent requests initiated for this patient yet. Click &quot;New Consent Request&quot; to send a consent prompt to the patient&apos;s ABHA app.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Record Types</th>
                      <th className="px-3.5 py-2.5">Date Range</th>
                      <th className="px-3.5 py-2.5">Expires</th>
                      <th className="px-3.5 py-2.5">Requester</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consentRequests.map((req) => {
                      const isGranted = req.status === "GRANTED";
                      const isFetching = fetchingDataForId === req.consent_request_id;

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {getStatusBadge(req.status)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {(req.hi_types || []).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-700"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {formatDate(req.date_range_from)} to {formatDate(req.date_range_to)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500">
                            {formatDate(req.expiry_at)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {req.requester_name || "Doctor"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {isGranted ? (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  type="button"
                                  disabled={isFetching}
                                  onClick={() => handleFetchData(req.consent_request_id)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 ${
                                    req.last_fetched_at
                                      ? "bg-sky-600 hover:bg-sky-700"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                  }`}
                                >
                                  {req.last_fetched_at ? (
                                    <RotateCcw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                                  ) : (
                                    <Download className={`h-3 w-3 ${isFetching ? "animate-bounce" : ""}`} />
                                  )}
                                  <span>
                                    {isFetching
                                      ? "Fetching..."
                                      : req.last_fetched_at
                                      ? "Fetch Again"
                                      : "Fetch Records"}
                                  </span>
                                </button>

                                {req.last_fetched_at && (
                                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5 text-slate-400" />
                                    Fetched: {formatDate(req.last_fetched_at)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                {req.status === "REQUESTED" ? "Waiting for Patient" : "Inactive"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: External Health Records Viewer */}
      <ExternalHealthRecordsViewer records={records} loading={loadingRecords} />

      {/* Consent Request Modal */}
      {isConsentModalOpen && (
        <AbdmConsentRequestModal
          isOpen={isConsentModalOpen}
          onClose={() => setIsConsentModalOpen(false)}
          patientId={patientId}
          patientName={patientName}
          patientAbha={patientAbha || ""}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
