"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Glasses, Pencil, Plus, AlertCircle, Clock } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import type { CurrentSpecsRecord } from "@/types";
import { currentSpecsApi } from "@/services/currentSpecsApi";
import { DataEditModal } from "../patient-examination/DataEditModal";
import { CurrentSpecsTab } from "../patient-examination/CurrentSpecsTab";

interface EditableCurrentSpecsCardProps {
  data: PrescriptionDataResponse["current_specs"];
  patientId: string;
  visitId: string;
  optometristId: string;
  onSave: () => void;
  isReadOnly?: boolean;
}

export function EditableCurrentSpecsCard({
  data,
  patientId,
  visitId,
  optometristId,
  onSave,
  isReadOnly = false,
}: EditableCurrentSpecsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [specsRecords, setSpecsRecords] = useState<CurrentSpecsRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const spec: CurrentSpecsRecord | null = useMemo(() => {
    if (!data) return null;
    return Array.isArray(data) ? data[0] : data;
  }, [data]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined || val === "") return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return String(val);
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  const isFromPreviousVisit = Boolean(
    spec && (spec.is_previous_visit || (visitId && spec.visit_id && spec.visit_id !== visitId))
  );

  const previousVisitDate = spec?.visit_date || spec?.recorded_at || spec?.created_at;

  const fetchSpecsRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await currentSpecsApi.list({ patient_id: patientId });
      setSpecsRecords(response.items || []);
    } catch (error) {
      console.error("Failed to fetch current specs records:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchSpecsRecords();
    }
  }, [isModalOpen, fetchSpecsRecords]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    onSave();
  };

  const handleRefresh = () => {
    fetchSpecsRecords();
  };

  // Empty state - no data recorded
  if (!spec) {
    if (isReadOnly) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Glasses className="h-4 w-4 text-violet-600" />
            <h4 className="font-semibold text-slate-900">Current Glasses</h4>
          </div>
          <div className="text-center py-4">
            <Glasses className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No current glasses recorded</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Glasses className="h-4 w-4 text-violet-600" />
            <h4 className="font-semibold text-slate-900">Current Glasses</h4>
          </div>
          <div className="text-center py-4">
            <Glasses className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">No current glasses recorded for this visit</p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Current Glasses
            </button>
          </div>
        </section>

        <DataEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Current Glasses / Specs"
          icon={<Glasses className="h-5 w-5" />}
          colorScheme="violet"
          size="xl"
        >
          <CurrentSpecsTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            currentSpecsRecords={specsRecords}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </DataEditModal>
      </>
    );
  }

  // Display mode with data
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Glasses className="h-4 w-4 text-violet-600" />
            <h4 className="font-semibold text-slate-900">Current Glasses</h4>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 transition"
            >
              <Pencil className="h-3 w-3" />
              {isFromPreviousVisit ? "Record for Today" : "Edit"}
            </button>
          )}
        </div>

        {/* Previous Visit Notice Banner */}
        {isFromPreviousVisit && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
            <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">From Previous Visit:</span>{" "}
              Shown from visit on{" "}
              <span className="font-semibold">{formatDate(previousVisitDate) || "previous date"}</span>
              {spec.visit_number ? ` (${spec.visit_number})` : ""}. Not yet entered for current visit.
            </div>
          </div>
        )}

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-1.5">
          {isFromPreviousVisit && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Previous Visit
            </span>
          )}
          {spec.lens_type && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700">
              {spec.lens_type.replace(/_/g, " ")}
            </span>
          )}
          {spec.usage && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
              {spec.usage.replace(/_/g, " ")}
            </span>
          )}
          {spec.measured_by && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
              Via: {spec.measured_by.replace(/_/g, " ")}
            </span>
          )}
          {spec.is_comfortable !== null && spec.is_comfortable !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                spec.is_comfortable
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {spec.is_comfortable ? "Comfortable" : "Issues Reported"}
            </span>
          )}
        </div>

        {/* OD / OS Measurements Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded bg-blue-50 p-2.5">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">OD (Right Eye)</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Sphere:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.od_sph)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cylinder:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.od_cyl)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Axis:</span>
                <span className="font-semibold text-slate-800">{spec.od_axis ? `${spec.od_axis}°` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Add:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.od_add)}</span>
              </div>
            </div>
          </div>

          <div className="rounded bg-green-50 p-2.5">
            <p className="text-xs font-semibold text-green-700 mb-1.5">OS (Left Eye)</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Sphere:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.os_sph)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cylinder:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.os_cyl)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Axis:</span>
                <span className="font-semibold text-slate-800">{spec.os_axis ? `${spec.os_axis}°` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Add:</span>
                <span className="font-semibold text-slate-800">{formatValue(spec.os_add)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {spec.remarks && (
          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
            &quot;{spec.remarks}&quot;
          </p>
        )}
      </section>

      {/* Modal with CurrentSpecsTab */}
      <DataEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Current Glasses / Specs"
        icon={<Glasses className="h-5 w-5" />}
        colorScheme="violet"
        size="xl"
      >
        <CurrentSpecsTab
          patientId={patientId}
          visitId={visitId}
          optometristId={optometristId}
          currentSpecsRecords={specsRecords}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </DataEditModal>
    </>
  );
}
