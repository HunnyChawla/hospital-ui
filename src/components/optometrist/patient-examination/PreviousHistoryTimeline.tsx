"use client";

import { Clock, Eye, FileText, Activity, Pill } from "lucide-react";
import type { PatientOptometryTimeline, ComplaintRecord } from "@/types";

interface PreviousHistoryTimelineProps {
  patientOptometryHistory: PatientOptometryTimeline | null;
  loading: boolean;
  currentVisitComplaints?: ComplaintRecord[];
}

export function PreviousHistoryTimeline({
  patientOptometryHistory,
  loading,
  currentVisitComplaints,
}: PreviousHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Loading patient history...</p>
      </div>
    );
  }

  const rawEvents = Array.isArray(patientOptometryHistory?.events)
    ? (patientOptometryHistory!.events as any[])
    : [];
  const rawVisits = Array.isArray((patientOptometryHistory as any)?.items)
    ? ((patientOptometryHistory as any).items as any[])
    : [];

  const visits = rawVisits.map((v) => {
    const ebt = (v as any).events_by_type || {};
    const flat = Object.entries(ebt).flatMap(([type, arr]: [string, any]) =>
      Array.isArray(arr)
        ? arr.map((e: any) => ({
            ...e,
            event_type: e?.event_type || type,
            visit_id: v?.visit_id ?? e?.visit_id ?? null,
            visit_date: v?.visit_date ?? e?.date ?? null,
          }))
        : []
    );
    flat.sort(
      (a: any, b: any) =>
        new Date(b?.date || b?.timestamp || 0).getTime() - new Date(a?.date || a?.timestamp || 0).getTime()
    );
    return {
      visit_id: v?.visit_id ?? null,
      visit_date: v?.visit_date ?? null,
      events_by_type: ebt,
      events: flat,
    };
  });

  const events = (visits.length > 0 ? visits.flatMap((v: any) => v.events) : rawEvents) as any[];

  if (!patientOptometryHistory || events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Clock className="mx-auto mb-3 h-12 w-12 text-slate-400" />
        <p className="text-slate-600">No previous optometry history found</p>
        <p className="text-sm text-slate-500">This is the patient's first optometry visit</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return <Eye className="h-5 w-5 text-blue-600" />;
      case "iop":
        return <Activity className="h-5 w-5 text-purple-600" />;
      case "ar_data":
        return <Eye className="h-5 w-5 text-cyan-600" />;
      case "eye_surgery":
        return <Activity className="h-5 w-5 text-rose-600" />;
      case "complaint":
        return <FileText className="h-5 w-5 text-amber-600" />;
      case "prescription":
        return <Pill className="h-5 w-5 text-emerald-600" />;
      case "visit":
        return <FileText className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return "border-blue-200 bg-blue-50";
      case "iop":
        return "border-purple-200 bg-purple-50";
      case "ar_data":
        return "border-cyan-200 bg-cyan-50";
      case "eye_surgery":
        return "border-rose-200 bg-rose-50";
      case "complaint":
        return "border-amber-200 bg-amber-50";
      case "prescription":
        return "border-emerald-200 bg-emerald-50";
      case "visit":
        return "border-amber-200 bg-amber-50";
      default:
        return "border-slate-200 bg-slate-50";
    }
  };

  const typeLabel = (eventType: string) => {
    switch (eventType) {
      case "complaint":
        return "Complaints";
      case "ar_data":
        return "AR Data";
      case "refraction":
        return "Refractions";
      case "iop":
        return "IOP Measurements";
      case "eye_surgery":
        return "Eye Surgeries";
      case "prescription":
        return "Prescriptions";
      default:
        return eventType.charAt(0).toUpperCase() + eventType.slice(1);
    }
  };

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const relativeDate = (ts: string | null | undefined) => {
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const today = startOfDay(new Date());
    const day = startOfDay(d);
    const diff = Math.floor((today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString();
  };

  const totalVisits = ((): number => {
    if ((patientOptometryHistory as any)?.total_visits != null) return (patientOptometryHistory as any).total_visits;
    if (Array.isArray(visits) && visits.length > 0) {
      return visits.filter((v: any) => !!v.visit_id).length;
    }
    const set = new Set((events || []).map((e: any) => e.visit_id).filter(Boolean));
    return set.size;
  })();

  const totalPrescriptions = ((): number => {
    if ((patientOptometryHistory as any)?.total_prescriptions != null) return (patientOptometryHistory as any).total_prescriptions;
    return (events || []).filter((e: any) => e.event_type === "prescription").length;
  })();

  const totalRefractions = ((): number => {
    if ((patientOptometryHistory as any)?.total_refraction_tests != null) return (patientOptometryHistory as any).total_refraction_tests;
    return (events || []).filter((e: any) => e.event_type === "refraction").length;
  })();

  const totalIOP = ((): number => {
    if ((patientOptometryHistory as any)?.total_iop_tests != null) return (patientOptometryHistory as any).total_iop_tests;
    return (events || []).filter((e: any) => e.event_type === "iop").length;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Patient Optometry History</h3>
        <p className="text-sm text-slate-600">
          Timeline of all previous optometry visits, tests, and prescriptions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalVisits}
          </p>
          <p className="text-sm text-slate-600">Total Visits</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalPrescriptions}
          </p>
          <p className="text-sm text-slate-600">Prescriptions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalRefractions}
          </p>
          <p className="text-sm text-slate-600">Refraction Tests</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalIOP}
          </p>
          <p className="text-sm text-slate-600">IOP Tests</p>
        </div>
      </div>

      {/* Grouped by Event Type */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-6 text-base font-semibold text-slate-900">History by Category</h4>

        <div className="relative space-y-6">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          {/* Build grouped map across all events */}
          {(() => {
            const grouped: Record<string, any[]> = {};
            (events || []).forEach((e: any) => {
              const t = (e?.event_type || "other").toLowerCase();
              (grouped[t] = grouped[t] || []).push(e);
            });

            // Override complaints with current visit complaints if provided
            if (Array.isArray(currentVisitComplaints) && currentVisitComplaints.length > 0) {
              grouped["complaint"] = currentVisitComplaints.map((c) => ({
                event_type: "complaint",
                title: "Chief Complaint",
                description: c.complaint,
                optometrist_name: null,
                visit_id: c.visit_id,
                date: c.created_at,
                timestamp: c.created_at,
                details: {
                  complaint: c.complaint,
                  severity: c.severity,
                  duration: c.duration,
                  notes: c.notes,
                },
              }));
            }
            const byDateDesc = (arr: any[]) =>
              arr.sort(
                (a, b) => new Date(b?.date || b?.timestamp || 0).getTime() - new Date(a?.date || a?.timestamp || 0).getTime()
              );
            Object.keys(grouped).forEach((k) => byDateDesc(grouped[k]));

            const order = ["complaint", "ar_data", "refraction", "iop", "eye_surgery", "prescription"] as const;
            const extras = Object.keys(grouped).filter((k) => !order.includes(k as any));
            const allTypes: string[] = [...order.filter((k) => grouped[k]?.length), ...extras];

            return allTypes.map((type) => {
              const items = grouped[type] || [];
              if (!items.length) return null;
              return (
                <div key={type} className="relative pl-12">
                  <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white shadow-md">
                    {getEventIcon(type)}
                  </div>
                  <div className="mb-4">
                    <h5 className="font-semibold text-slate-900">{typeLabel(type)} ({items.length})</h5>
                  </div>
                  <div className="space-y-4">
                    {items.map((event: any, idx: number) => (
                      <div key={`${type}-${idx}`} className={`rounded-lg border p-4 ${getEventColor(type)}`}>
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h6 className="font-semibold text-slate-900">{event.title}</h6>
                            <p className="text-xs text-slate-600">{relativeDate(event?.date ?? event?.timestamp)}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                        </div>

                        {event.description && <p className="text-sm text-slate-700">{event.description}</p>}

                        {type === "refraction" && event.details && (
                          <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/50 p-3 text-xs">
                            {event.details.od && (
                              <div>
                                <p className="font-semibold text-blue-900">OD (Right)</p>
                                <p className="text-slate-700">SPH: {event.details.od.sphere ?? "—"} / CYL: {event.details.od.cylinder ?? "—"} / AXIS: {event.details.od.axis ?? "—"}</p>
                                <p className="text-slate-600">VA: {event.details.od.visual_acuity_corrected ?? event.details.od.va ?? "—"}</p>
                              </div>
                            )}
                            {event.details.os && (
                              <div>
                                <p className="font-semibold text-green-900">OS (Left)</p>
                                <p className="text-slate-700">SPH: {event.details.os.sphere ?? "—"} / CYL: {event.details.os.cylinder ?? "—"} / AXIS: {event.details.os.axis ?? "—"}</p>
                                <p className="text-slate-600">VA: {event.details.os.visual_acuity_corrected ?? event.details.os.va ?? "—"}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {type === "ar_data" && event.details && (
                          <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/50 p-3 text-xs">
                            {event.details.od && (
                              <div>
                                <p className="font-semibold text-blue-900">OD (Right)</p>
                                <p className="text-slate-700">SPH: {event.details.od.sphere ?? "—"} / CYL: {event.details.od.cylinder ?? "—"} / AXIS: {event.details.od.axis ?? "—"}</p>
                                {event.details.od.visual_acuity && <p className="text-slate-600">VA: {event.details.od.visual_acuity}</p>}
                              </div>
                            )}
                            {event.details.os && (
                              <div>
                                <p className="font-semibold text-green-900">OS (Left)</p>
                                <p className="text-slate-700">SPH: {event.details.os.sphere ?? "—"} / CYL: {event.details.os.cylinder ?? "—"} / AXIS: {event.details.os.axis ?? "—"}</p>
                                {event.details.os.visual_acuity && <p className="text-slate-600">VA: {event.details.os.visual_acuity}</p>}
                              </div>
                            )}
                            {event.details.pupillary_distance != null && (
                              <div className="col-span-2 text-xs text-slate-600">PD: {event.details.pupillary_distance}</div>
                            )}
                          </div>
                        )}

                        {type === "iop" && event.details && (
                          <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/50 p-3 text-xs">
                            <div>
                              <p className="font-semibold text-blue-900">OD Pressure</p>
                              <p className="text-lg font-bold text-slate-900">{event.details.od_pressure} mmHg</p>
                            </div>
                            <div>
                              <p className="font-semibold text-green-900">OS Pressure</p>
                              <p className="text-lg font-bold text-slate-900">{event.details.os_pressure} mmHg</p>
                            </div>
                            {event.details.method && <div className="col-span-2 text-xs text-slate-600">Method: {event.details.method}</div>}
                          </div>
                        )}

                        {type === "eye_surgery" && event.details && (
                          <div className="mt-3 rounded bg-white/50 p-3 text-xs">
                            <p className="font-semibold text-slate-900">Eye Surgery</p>
                            <p className="text-slate-700">{event.details.surgery_name}</p>
                            <p className="text-slate-600">Eye: {event.details.eye} • Date: {event.details.surgery_date}</p>
                            {event.details.surgeon_name && <p className="text-slate-600">Surgeon: {event.details.surgeon_name}</p>}
                            {event.details.hospital_name && <p className="text-slate-600">Hospital: {event.details.hospital_name}</p>}
                            {event.details.complications && <p className="text-slate-600">Complications: {event.details.complications}</p>}
                          </div>
                        )}

                        {type === "complaint" && event.details && (
                          <div className="mt-3 rounded bg-white/50 p-3 text-xs">
                            <p className="text-slate-700"><span className="font-medium">Complaint:</span> {event.details.complaint}</p>
                            {event.details.severity && <p className="text-slate-600">Severity: {event.details.severity}</p>}
                          </div>
                        )}

                        {type === "prescription" && event.details && (
                          <div className="mt-3 rounded bg-white/50 p-3 text-xs">
                            <p className="font-semibold text-slate-900">Prescription Details</p>
                            {event.details.diagnosis && (
                              <p className="mt-1 text-slate-700"><span className="font-medium">Diagnosis:</span> {event.details.diagnosis}</p>
                            )}
                            {event.details.prescription_number && <p className="mt-1 text-slate-600">Rx #: {event.details.prescription_number}</p>}
                          </div>
                        )}

                        {event.optometrist_name && (
                          <p className="mt-3 text-xs text-slate-600">
                            By: <span className="font-medium">{event.optometrist_name}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Load more (if pagination needed) */}
        {(() => {
          const anyHist: any = patientOptometryHistory || {};
          const hasMore = typeof anyHist?.has_more === "boolean" ? anyHist.has_more : (anyHist?.page ?? 1) < (anyHist?.total_pages ?? 1);
          return hasMore;
        })() && (
          <div className="mt-6 text-center">
            <button className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Load More History
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          This timeline shows all previous optometry examinations, tests, and prescriptions for this
          patient across all visits.
        </p>
      </div>
    </div>
  );
}
