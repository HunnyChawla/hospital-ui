"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Pencil, Plus, Glasses } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import type { RefractionRecord } from "@/types";
import { refractionApi } from "@/services/refractionApi";
import { DataEditModal } from "../patient-examination/DataEditModal";
import { RefractionTab } from "../patient-examination/RefractionTab";

interface EditableRefractionCardProps {
  data: PrescriptionDataResponse["refraction"];
  patientId: string;
  visitId: string;
  optometristId: string;
  onSave: () => void;
  isReadOnly?: boolean;
}

export function EditableRefractionCard({
  data,
  patientId,
  visitId,
  optometristId,
  onSave,
  isReadOnly = false,
}: EditableRefractionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refractionRecords, setRefractionRecords] = useState<RefractionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined || val === "") return "-";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "-";
    return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  // Fetch refraction records when modal opens
  const fetchRefractionRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await refractionApi.list({ patient_id: patientId });
      setRefractionRecords(response.items);
    } catch (error) {
      console.error("Failed to fetch refraction records:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchRefractionRecords();
    }
  }, [isModalOpen, fetchRefractionRecords]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Refresh parent data after modal closes
    onSave();
  };

  const handleRefresh = () => {
    fetchRefractionRecords();
  };

  // Empty state - no data
  if (!data) {
    if (isReadOnly) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-teal-600" />
            <h4 className="font-semibold text-slate-900">Refraction</h4>
          </div>
          <div className="text-center py-4">
            <Eye className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No refraction recorded</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-teal-600" />
            <h4 className="font-semibold text-slate-900">Refraction</h4>
          </div>
          <div className="text-center py-4">
            <Eye className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">No refraction recorded for this visit</p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Refraction
            </button>
          </div>
        </section>

        {/* Modal with RefractionTab */}
        <DataEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Refraction"
          icon={<Glasses className="h-5 w-5" />}
          colorScheme="sky"
          size="xl"
        >
          <RefractionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            refractionRecords={refractionRecords}
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
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-teal-600" />
            <h4 className="font-semibold text-slate-900">Refraction</h4>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 transition"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">OD (Right Eye)</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Sphere:</span>
                <span className="font-medium">{formatValue(data.od_sphere)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cylinder:</span>
                <span className="font-medium">{formatValue(data.od_cylinder)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Axis:</span>
                <span className="font-medium">{data.od_axis ? `${data.od_axis}°` : "-"}</span>
              </div>
              {data.od_prism && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Prism:</span>
                  <span className="font-medium">{data.od_prism}</span>
                </div>
              )}
              {data.od_distance_bcva && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Dist. BCVA:</span>
                  <span className="font-medium">{data.od_distance_bcva}</span>
                </div>
              )}
              {data.od_near_bcva && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Near BCVA:</span>
                  <span className="font-medium">{data.od_near_bcva}</span>
                </div>
              )}
              {data.od_add_power && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Add:</span>
                  <span className="font-medium">{formatValue(data.od_add_power)}</span>
                </div>
              )}
            </div>
            {(data.od_dilated_sphere || data.od_dilated_cylinder || data.od_dilated_axis || data.od_dilated_visual_acuity || data.od_dilated_pinhole) && (
              <div className="pt-2 border-t border-blue-200 mt-2">
                <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1">Dilated Acceptance</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sphere:</span>
                    <span className="font-medium">{formatValue(data.od_dilated_sphere)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cylinder:</span>
                    <span className="font-medium">{formatValue(data.od_dilated_cylinder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Axis:</span>
                    <span className="font-medium">{data.od_dilated_axis ? `${data.od_dilated_axis}°` : "-"}</span>
                  </div>
                  {data.od_dilated_visual_acuity && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Visual Acuity:</span>
                      <span className="font-medium">{data.od_dilated_visual_acuity}</span>
                    </div>
                  )}
                  {data.od_dilated_pinhole && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pinhole:</span>
                      <span className="font-medium">{data.od_dilated_pinhole}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="rounded bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-2">OS (Left Eye)</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Sphere:</span>
                <span className="font-medium">{formatValue(data.os_sphere)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cylinder:</span>
                <span className="font-medium">{formatValue(data.os_cylinder)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Axis:</span>
                <span className="font-medium">{data.os_axis ? `${data.os_axis}°` : "-"}</span>
              </div>
              {data.os_prism && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Prism:</span>
                  <span className="font-medium">{data.os_prism}</span>
                </div>
              )}
              {data.os_distance_bcva && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Dist. BCVA:</span>
                  <span className="font-medium">{data.os_distance_bcva}</span>
                </div>
              )}
              {data.os_near_bcva && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Near BCVA:</span>
                  <span className="font-medium">{data.os_near_bcva}</span>
                </div>
              )}
              {data.os_add_power && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Add:</span>
                  <span className="font-medium">{formatValue(data.os_add_power)}</span>
                </div>
              )}
            </div>
            {(data.os_dilated_sphere || data.os_dilated_cylinder || data.os_dilated_axis || data.os_dilated_visual_acuity || data.os_dilated_pinhole) && (
              <div className="pt-2 border-t border-green-200 mt-2">
                <p className="text-[10px] font-semibold text-green-700 uppercase mb-1">Dilated Acceptance</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sphere:</span>
                    <span className="font-medium">{formatValue(data.os_dilated_sphere)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cylinder:</span>
                    <span className="font-medium">{formatValue(data.os_dilated_cylinder)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Axis:</span>
                    <span className="font-medium">{data.os_dilated_axis ? `${data.os_dilated_axis}°` : "-"}</span>
                  </div>
                  {data.os_dilated_visual_acuity && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Visual Acuity:</span>
                      <span className="font-medium">{data.os_dilated_visual_acuity}</span>
                    </div>
                  )}
                  {data.os_dilated_pinhole && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pinhole:</span>
                      <span className="font-medium">{data.os_dilated_pinhole}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 text-right">
          Recorded: {formatDateTime(data.recorded_at)}
        </p>
      </section>

      {/* Modal with RefractionTab */}
      <DataEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Refraction"
        icon={<Glasses className="h-5 w-5" />}
        colorScheme="sky"
        size="xl"
      >
        <RefractionTab
          patientId={patientId}
          visitId={visitId}
          optometristId={optometristId}
          refractionRecords={refractionRecords}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </DataEditModal>
    </>
  );
}
