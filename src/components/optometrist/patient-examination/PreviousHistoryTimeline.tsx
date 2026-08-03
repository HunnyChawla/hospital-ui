"use client";

import { Clock, Eye, EyeOff, FileText, Activity, Pill, Calendar } from "lucide-react";
import type { PatientOptometryTimeline, ComplaintRecord } from "@/types";

interface PreviousHistoryTimelineProps {
  patientOptometryHistory: PatientOptometryTimeline | null;
  loading: boolean;
  currentVisitComplaints?: ComplaintRecord[];
  onLoadMore?: () => void;
}

export function PreviousHistoryTimeline({
  patientOptometryHistory,
  loading,
  currentVisitComplaints,
  onLoadMore,
}: PreviousHistoryTimelineProps) {
  const isInitialLoading = !!(loading && (!patientOptometryHistory || !Array.isArray((patientOptometryHistory as any)?.items) || (patientOptometryHistory as any).items.length === 0));
  const isMoreLoading = !!(loading && patientOptometryHistory && Array.isArray((patientOptometryHistory as any)?.items) && (patientOptometryHistory as any).items.length > 0);

  if (isInitialLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Loading patient history...</p>
      </div>
    );
  }

  const formatValue = (val: any) => {
    if (val == null || val === "") return "—";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  const rawEvents = Array.isArray(patientOptometryHistory?.events)
    ? (patientOptometryHistory!.events as any[])
    : [];
  const rawVisits = Array.isArray((patientOptometryHistory as any)?.items)
    ? ((patientOptometryHistory as any).items as any[])
    : [];

  const visits = rawVisits.map((v) => {
    const ebt = (v as any).events_by_type || {};
    let flat = Object.entries(ebt).flatMap(([type, arr]: [string, any]) =>
      Array.isArray(arr)
        ? arr.map((e: any) => ({
          ...e,
          event_type: e?.event_type || type,
          visit_id: v?.visit_id ?? e?.visit_id ?? null,
          visit_date: v?.visit_date ?? e?.date ?? null,
        }))
        : []
    );

    // If current visit complaints are provided and they belong to this visit_id
    if (v?.visit_id && Array.isArray(currentVisitComplaints) && currentVisitComplaints.length > 0) {
      const currentComplaintsForThisVisit = currentVisitComplaints.filter(c => c.visit_id === v.visit_id);
      if (currentComplaintsForThisVisit.length > 0) {
        // Remove existing complaints from flat list to avoid duplicates
        flat = flat.filter(e => e.event_type !== "complaint");
        // Add current visit complaints
        flat.push(...currentComplaintsForThisVisit.map(c => ({
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
        })));
      }
    }

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
        <p className="text-sm text-slate-500">This is the patient&apos;s first optometry visit</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return <Eye className="h-4.5 w-4.5 text-blue-600" />;
      case "iop":
        return <Activity className="h-4.5 w-4.5 text-purple-600" />;
      case "ar_data":
        return <Eye className="h-4.5 w-4.5 text-cyan-600" />;
      case "vision":
        return <EyeOff className="h-4.5 w-4.5 text-teal-600" />;
      case "eye_surgery":
        return <Activity className="h-4.5 w-4.5 text-rose-600" />;
      case "complaint":
        return <FileText className="h-4.5 w-4.5 text-amber-600" />;
      case "prescription":
        return <Pill className="h-4.5 w-4.5 text-emerald-600" />;
      case "visit":
        return <FileText className="h-4.5 w-4.5 text-amber-600" />;
      default:
        return <Clock className="h-4.5 w-4.5 text-slate-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "refraction":
        return "border-blue-100 bg-blue-50/40";
      case "iop":
        return "border-purple-100 bg-purple-50/40";
      case "ar_data":
        return "border-cyan-100 bg-cyan-50/40";
      case "vision":
        return "border-teal-100 bg-teal-50/40";
      case "eye_surgery":
        return "border-rose-100 bg-rose-50/40";
      case "complaint":
        return "border-amber-100 bg-amber-50/40";
      case "prescription":
        return "border-emerald-100 bg-emerald-50/40";
      case "visit":
        return "border-amber-100 bg-amber-50/40";
      default:
        return "border-slate-100 bg-slate-50/40";
    }
  };

  const typeLabel = (eventType: string) => {
    switch (eventType) {
      case "complaint":
        return "Complaint";
      case "vision":
        return "Vision Assessment";
      case "ar_data":
        return "AR Data";
      case "refraction":
        return "Refraction";
      case "iop":
        return "IOP Measurement";
      case "eye_surgery":
        return "Eye Surgery";
      case "prescription":
        return "Prescription";
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
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
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
          <p className="text-sm text-slate-600 font-medium">Total Visits</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalPrescriptions}
          </p>
          <p className="text-sm text-slate-600 font-medium">Prescriptions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalRefractions}
          </p>
          <p className="text-sm text-slate-600 font-medium">Refraction Tests</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {totalIOP}
          </p>
          <p className="text-sm text-slate-600 font-medium">IOP Tests</p>
        </div>
      </div>

      {/* Grouped by Visit Date */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-6 text-base font-semibold text-slate-900">History Timeline</h4>

        <div className="relative space-y-8">
          {/* Vertical line running down the left */}
          <div className="absolute left-6 top-2 bottom-6 w-0.5 bg-slate-200" />

          {visits.map((visit: any, vIdx: number) => {
            const hasEvents = Array.isArray(visit.events) && visit.events.length > 0;
            if (!hasEvents) return null;

            const isNoVisit = !visit.visit_id;
            const displayTitle = isNoVisit ? "General Ophthalmic History" : `Visit: ${relativeDate(visit.visit_date)}`;
            const displaySubtitle = isNoVisit ? "Surgical history and general records" : `Date: ${new Date(visit.visit_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;

            return (
              <div key={visit.visit_id || `novisit-${vIdx}`} className="relative pl-14">
                {/* Timeline node for the Visit Date */}
                <div className="absolute left-6 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-md">
                  <Calendar className="h-4 w-4" />
                </div>

                {/* Visit Header */}
                <div className="mb-4">
                  <h5 className="text-base font-bold text-slate-900">{displayTitle}</h5>
                  <p className="text-xs text-slate-500">{displaySubtitle}</p>
                </div>

                {/* Event timeline branch */}
                <div className="space-y-4 relative">
                  {visit.events.map((event: any, eIdx: number) => {
                    const type = (event.event_type || "other").toLowerCase();
                    return (
                      <div key={`${visit.visit_id || 'novisit'}-${type}-${eIdx}`} className="relative pl-8">
                        {/* Event icon circle */}
                        <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm -translate-x-1/2 mt-1">
                          {getEventIcon(type)}
                        </div>

                        {/* Event Card */}
                        <div className={`rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow ${getEventColor(type)}`}>
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h6 className="font-semibold text-slate-900">{event.title}</h6>
                              <p className="text-xs text-slate-500">{relativeDate(event?.date ?? event?.timestamp)}</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200/50">
                              {typeLabel(type)}
                            </span>
                          </div>

                          {event.description && <p className="text-sm text-slate-700 mb-2 font-medium">{event.description}</p>}

                          {type === "refraction" && event.details && (
                            <div className="mt-3 space-y-3 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              {/* Dry Refraction */}
                              <div>
                                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Subjective Refraction (Dry)</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {event.details.od && (
                                    <div>
                                      <p className="font-semibold text-blue-900">OD (Right)</p>
                                      <p className="text-slate-700">SPH: {formatValue(event.details.od.sphere)} / CYL: {formatValue(event.details.od.cylinder)} / AXIS: {event.details.od.axis ?? "—"}</p>
                                      {(event.details.od.add_power != null || event.details.od.distance_bcva || event.details.od.near_bcva || event.details.od.prism) && (
                                        <p className="text-slate-500 text-[10px] mt-0.5">
                                          {event.details.od.add_power != null && `ADD: ${formatValue(event.details.od.add_power)}`}
                                          {event.details.od.distance_bcva && ` • BCVA (D): ${event.details.od.distance_bcva}`}
                                          {event.details.od.near_bcva && ` • BCVA (N): ${event.details.od.near_bcva}`}
                                          {event.details.od.prism && ` • Prism: ${event.details.od.prism}`}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {event.details.os && (
                                    <div>
                                      <p className="font-semibold text-green-900">OS (Left)</p>
                                      <p className="text-slate-700">SPH: {formatValue(event.details.os.sphere)} / CYL: {formatValue(event.details.os.cylinder)} / AXIS: {event.details.os.axis ?? "—"}</p>
                                      {(event.details.os.add_power != null || event.details.os.distance_bcva || event.details.os.near_bcva || event.details.os.prism) && (
                                        <p className="text-slate-500 text-[10px] mt-0.5">
                                          {event.details.os.add_power != null && `ADD: ${formatValue(event.details.os.add_power)}`}
                                          {event.details.os.distance_bcva && ` • BCVA (D): ${event.details.os.distance_bcva}`}
                                          {event.details.os.near_bcva && ` • BCVA (N): ${event.details.os.near_bcva}`}
                                          {event.details.os.prism && ` • Prism: ${event.details.os.prism}`}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Dilated Acceptance */}
                              {((event.details.od && (event.details.od.dilated_sphere != null || event.details.od.dilated_cylinder != null || event.details.od.dilated_axis != null)) ||
                                (event.details.os && (event.details.os.dilated_sphere != null || event.details.os.dilated_cylinder != null || event.details.os.dilated_axis != null))) && (
                                <div className="pt-2 border-t border-slate-200/50">
                                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Dilated Acceptance (Wet)</p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {event.details.od && (
                                      <div>
                                        <p className="font-semibold text-blue-900">OD (Right)</p>
                                        <p className="text-slate-700">SPH: {formatValue(event.details.od.dilated_sphere)} / CYL: {formatValue(event.details.od.dilated_cylinder)} / AXIS: {event.details.od.dilated_axis ?? "—"}</p>
                                        {(event.details.od.dilated_visual_acuity || event.details.od.dilated_pinhole) && (
                                          <p className="text-slate-500 text-[10px] mt-0.5">
                                            {event.details.od.dilated_visual_acuity && `VA: ${event.details.od.dilated_visual_acuity}`}
                                            {event.details.od.dilated_pinhole && ` • PH: ${event.details.od.dilated_pinhole}`}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {event.details.os && (
                                      <div>
                                        <p className="font-semibold text-green-900">OS (Left)</p>
                                        <p className="text-slate-700">SPH: {formatValue(event.details.os.dilated_sphere)} / CYL: {formatValue(event.details.os.dilated_cylinder)} / AXIS: {event.details.os.dilated_axis ?? "—"}</p>
                                        {(event.details.os.dilated_visual_acuity || event.details.os.dilated_pinhole) && (
                                          <p className="text-slate-500 text-[10px] mt-0.5">
                                            {event.details.os.dilated_visual_acuity && `VA: ${event.details.os.dilated_visual_acuity}`}
                                            {event.details.os.dilated_pinhole && ` • PH: ${event.details.os.dilated_pinhole}`}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {event.details.pupillary_distance != null && (
                                <div className="pt-2 border-t border-slate-200/50 text-[10px] text-slate-500 font-medium">
                                  Pupillary Distance (PD): {event.details.pupillary_distance} mm
                                </div>
                              )}
                              {event.details.notes && (
                                <div className="text-[10px] text-slate-500 italic mt-1">
                                  Notes: {event.details.notes}
                                </div>
                              )}
                            </div>
                          )}

                          {type === "ar_data" && event.details && (
                            <div className="mt-3 space-y-3 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              {/* Dry AR */}
                              <div>
                                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Dry AR</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {event.details.od && (
                                    <div>
                                      <p className="font-semibold text-blue-900">OD (Right)</p>
                                      <p className="text-slate-700">SPH: {formatValue(event.details.od.sphere)} / CYL: {formatValue(event.details.od.cylinder)} / AXIS: {event.details.od.axis ?? "—"}</p>
                                    </div>
                                  )}
                                  {event.details.os && (
                                    <div>
                                      <p className="font-semibold text-green-900">OS (Left)</p>
                                      <p className="text-slate-700">SPH: {formatValue(event.details.os.sphere)} / CYL: {formatValue(event.details.os.cylinder)} / AXIS: {event.details.os.axis ?? "—"}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Wet AR */}
                              {((event.details.od && (event.details.od.wet_sphere != null || event.details.od.wet_cylinder != null || event.details.od.wet_axis != null)) ||
                                (event.details.os && (event.details.os.wet_sphere != null || event.details.os.wet_cylinder != null || event.details.os.wet_axis != null))) && (
                                <div className="pt-2 border-t border-slate-200/50">
                                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Wet AR (Dilated Acceptance)</p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {event.details.od && (
                                      <div>
                                        <p className="font-semibold text-blue-900">OD (Right)</p>
                                        <p className="text-slate-700">SPH: {formatValue(event.details.od.wet_sphere)} / CYL: {formatValue(event.details.od.wet_cylinder)} / AXIS: {event.details.od.wet_axis ?? "—"}</p>
                                      </div>
                                    )}
                                    {event.details.os && (
                                      <div>
                                        <p className="font-semibold text-green-900">OS (Left)</p>
                                        <p className="text-slate-700">SPH: {formatValue(event.details.os.wet_sphere)} / CYL: {formatValue(event.details.os.wet_cylinder)} / AXIS: {event.details.os.wet_axis ?? "—"}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {event.details.pupillary_distance != null && (
                                <div className="pt-2 border-t border-slate-200/50 text-[10px] text-slate-500 font-medium">
                                  Pupillary Distance (PD): {event.details.pupillary_distance} mm
                                </div>
                              )}
                              {event.details.notes && (
                                <div className="text-[10px] text-slate-500 italic mt-1">
                                  Notes: {event.details.notes}
                                </div>
                              )}
                            </div>
                          )}

                          {type === "iop" && event.details && (
                            <div className="mt-3 grid grid-cols-2 gap-4 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              <div>
                                <p className="font-semibold text-blue-900">OD Pressure</p>
                                <p className="text-lg font-bold text-slate-900">{event.details.od_pressure} mmHg</p>
                              </div>
                              <div>
                                <p className="font-semibold text-green-900">OS Pressure</p>
                                <p className="text-lg font-bold text-slate-900">{event.details.os_pressure} mmHg</p>
                              </div>
                              {event.details.method && <div className="col-span-2 text-xs text-slate-500 border-t border-slate-200/40 pt-1.5 mt-1">Method: {event.details.method}</div>}
                            </div>
                          )}

                          {type === "eye_surgery" && event.details && (
                            <div className="mt-3 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              <p className="font-semibold text-slate-900">{event.details.surgery_name}</p>
                              <p className="text-slate-600 mt-1">Eye: {event.details.eye}{event.details.surgery_date ? ` • Date: ${event.details.surgery_date}` : ""}</p>
                              {event.details.surgeon_name && <p className="text-slate-600">Surgeon: {event.details.surgeon_name}</p>}
                              {event.details.hospital_name && <p className="text-slate-600">Hospital: {event.details.hospital_name}</p>}
                              {event.details.complications && <p className="text-slate-600 mt-1 text-rose-600"><span className="font-medium">Complications:</span> {event.details.complications}</p>}
                            </div>
                          )}

                          {type === "complaint" && event.details && (
                            <div className="mt-3 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              <p className="text-slate-700"><span className="font-medium text-slate-900">Complaint:</span> {event.details.complaint}</p>
                              {event.details.severity && <p className="text-slate-600 mt-1">Severity: <span className="font-medium text-slate-700 capitalize">{event.details.severity}</span></p>}
                            </div>
                          )}

                          {type === "vision" && event.details && (
                            <div className="mt-3 grid grid-cols-1 gap-4 rounded bg-white/60 p-3 text-xs border border-slate-100/50 sm:grid-cols-2">
                              {event.details.od && (
                                <div>
                                  <p className="font-semibold text-blue-900 border-b border-slate-200/30 pb-0.5 mb-1">OD (Right)</p>
                                  <div className="space-y-0.5">
                                    <p className="text-slate-600 font-medium">Distance:</p>
                                    {event.details.od.ucva_distance && <p className="text-slate-700">UCVA: {event.details.od.ucva_distance}</p>}
                                    {event.details.od.ph_va && <p className="text-slate-700">PH: {event.details.od.ph_va}</p>}
                                    {event.details.od.va_with_current_specs && <p className="text-slate-700">With Specs: {event.details.od.va_with_current_specs}</p>}
                                    {event.details.od.bcva_distance && <p className="text-slate-700">BCVA: {event.details.od.bcva_distance}</p>}
                                    <p className="text-slate-600 font-medium mt-1">Near:</p>
                                    {event.details.od.near_ucva && <p className="text-slate-700">UCVA: {event.details.od.near_ucva}</p>}
                                    {event.details.od.near_with_current_specs && <p className="text-slate-700">With Specs: {event.details.od.near_with_current_specs}</p>}
                                    {event.details.od.near_bcva && <p className="text-slate-700">BCVA: {event.details.od.near_bcva}</p>}
                                  </div>
                                </div>
                              )}
                              {event.details.os && (
                                <div>
                                  <p className="font-semibold text-green-900 border-b border-slate-200/30 pb-0.5 mb-1">OS (Left)</p>
                                  <div className="space-y-0.5">
                                    <p className="text-slate-600 font-medium">Distance:</p>
                                    {event.details.os.ucva_distance && <p className="text-slate-700">UCVA: {event.details.os.ucva_distance}</p>}
                                    {event.details.os.ph_va && <p className="text-slate-700">PH: {event.details.os.ph_va}</p>}
                                    {event.details.os.va_with_current_specs && <p className="text-slate-700">With Specs: {event.details.os.va_with_current_specs}</p>}
                                    {event.details.os.bcva_distance && <p className="text-slate-700">BCVA: {event.details.os.bcva_distance}</p>}
                                    <p className="text-slate-600 font-medium mt-1">Near:</p>
                                    {event.details.os.near_ucva && <p className="text-slate-700">UCVA: {event.details.os.near_ucva}</p>}
                                    {event.details.os.near_with_current_specs && <p className="text-slate-700">With Specs: {event.details.os.near_with_current_specs}</p>}
                                    {event.details.os.near_bcva && <p className="text-slate-700">BCVA: {event.details.os.near_bcva}</p>}
                                  </div>
                                </div>
                              )}
                              {event.details.notes && <div className="col-span-1 sm:col-span-2 text-xs text-slate-500 border-t border-slate-200/40 pt-1.5 mt-1">Notes: {event.details.notes}</div>}
                            </div>
                          )}

                          {type === "prescription" && event.details && (
                            <div className="mt-3 rounded bg-white/60 p-3 text-xs border border-slate-100/50">
                              {event.details.diagnosis && (
                                <p className="text-slate-700"><span className="font-semibold text-slate-900">Diagnosis:</span> {event.details.diagnosis}</p>
                              )}
                              {event.details.prescription_number && <p className="mt-1 text-slate-600">Rx #: <span className="font-semibold text-slate-700">{event.details.prescription_number}</span></p>}
                            </div>
                          )}

                          {event.optometrist_name && (
                            <p className="mt-3 text-xs text-slate-500">
                              By: <span className="font-medium text-slate-700">{event.optometrist_name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more button */}
        {(() => {
          const anyHist: any = patientOptometryHistory || {};
          const hasMore = typeof anyHist?.has_more === "boolean" ? anyHist.has_more : (anyHist?.page ?? 1) < (anyHist?.total_pages ?? 1);
          return hasMore;
        })() && (
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button
              onClick={onLoadMore}
              disabled={isMoreLoading}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm"
            >
              {isMoreLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full" />
                  Loading more...
                </>
              ) : (
                "Load More History"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900 font-medium">
          This timeline shows all previous optometry examinations, tests, and prescriptions for this
          patient across all visits.
        </p>
      </div>
    </div>
  );
}
