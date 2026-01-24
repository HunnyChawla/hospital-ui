"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Pencil, Plus, EyeOff } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import type { VisionRecord } from "@/types";
import { visionApi } from "@/services/visionApi";
import { DataEditModal } from "../patient-examination/DataEditModal";
import { VisionTab } from "../patient-examination/VisionTab";

interface EditableVisionCardProps {
  data: PrescriptionDataResponse["vision"];
  patientId: string;
  visitId: string;
  optometristId: string;
  onSave: () => void;
  isReadOnly?: boolean;
}

export function EditableVisionCard({
  data,
  patientId,
  visitId,
  optometristId,
  onSave,
  isReadOnly = false,
}: EditableVisionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visionRecords, setVisionRecords] = useState<VisionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch vision records when modal opens
  const fetchVisionRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await visionApi.getByPatient(patientId);
      setVisionRecords(response.items as VisionRecord[]);
    } catch (error) {
      console.error("Failed to fetch vision records:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchVisionRecords();
    }
  }, [isModalOpen, fetchVisionRecords]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Refresh parent data after modal closes
    onSave();
  };

  const handleRefresh = () => {
    fetchVisionRecords();
  };

  // Empty state - no data
  if (!data) {
    if (isReadOnly) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-cyan-600" />
            <h4 className="font-semibold text-slate-900">Visual Acuity</h4>
          </div>
          <div className="text-center py-4">
            <EyeOff className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No vision data recorded</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-cyan-600" />
            <h4 className="font-semibold text-slate-900">Visual Acuity</h4>
          </div>
          <div className="text-center py-4">
            <EyeOff className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">No vision data recorded for this visit</p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Vision
            </button>
          </div>
        </section>

        {/* Modal with VisionTab */}
        <DataEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Visual Acuity"
          icon={<EyeOff className="h-5 w-5" />}
          colorScheme="blue"
          size="xl"
        >
          <VisionTab
            patientId={patientId}
            visitId={visitId}
            optometristId={optometristId}
            visionRecords={visionRecords}
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
            <Eye className="h-4 w-4 text-cyan-600" />
            <h4 className="font-semibold text-slate-900">Visual Acuity</h4>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50 transition"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* OD (Right Eye) */}
          <div className="rounded bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">OD (Right Eye)</p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600 border-b border-blue-200 pb-1">Distance Vision</p>
              <div className="space-y-1 text-sm">
                {data.od_ucva_distance && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">UCVA:</span>
                    <span className="font-medium">{data.od_ucva_distance}</span>
                  </div>
                )}
                {data.od_ph_va && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">PH:</span>
                    <span className="font-medium">{data.od_ph_va}</span>
                  </div>
                )}
                {data.od_va_with_current_specs && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">With Specs:</span>
                    <span className="font-medium">{data.od_va_with_current_specs}</span>
                  </div>
                )}
                {data.od_bcva_distance && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">BCVA:</span>
                    <span className="font-medium">{data.od_bcva_distance}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-slate-600 border-b border-blue-200 pb-1 mt-2">Near Vision</p>
              <div className="space-y-1 text-sm">
                {data.od_near_ucva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">UCVA:</span>
                    <span className="font-medium">{data.od_near_ucva}</span>
                  </div>
                )}
                {data.od_near_with_current_specs && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">With Specs:</span>
                    <span className="font-medium">{data.od_near_with_current_specs}</span>
                  </div>
                )}
                {data.od_near_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">BCVA:</span>
                    <span className="font-medium">{data.od_near_bcva}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OS (Left Eye) */}
          <div className="rounded bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-2">OS (Left Eye)</p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600 border-b border-green-200 pb-1">Distance Vision</p>
              <div className="space-y-1 text-sm">
                {data.os_ucva_distance && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">UCVA:</span>
                    <span className="font-medium">{data.os_ucva_distance}</span>
                  </div>
                )}
                {data.os_ph_va && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">PH:</span>
                    <span className="font-medium">{data.os_ph_va}</span>
                  </div>
                )}
                {data.os_va_with_current_specs && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">With Specs:</span>
                    <span className="font-medium">{data.os_va_with_current_specs}</span>
                  </div>
                )}
                {data.os_bcva_distance && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">BCVA:</span>
                    <span className="font-medium">{data.os_bcva_distance}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-slate-600 border-b border-green-200 pb-1 mt-2">Near Vision</p>
              <div className="space-y-1 text-sm">
                {data.os_near_ucva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">UCVA:</span>
                    <span className="font-medium">{data.os_near_ucva}</span>
                  </div>
                )}
                {data.os_near_with_current_specs && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">With Specs:</span>
                    <span className="font-medium">{data.os_near_with_current_specs}</span>
                  </div>
                )}
                {data.os_near_bcva && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">BCVA:</span>
                    <span className="font-medium">{data.os_near_bcva}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {data.notes && (
          <p className="mt-2 text-xs text-slate-500">Notes: {data.notes}</p>
        )}
      </section>

      {/* Modal with VisionTab */}
      <DataEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Visual Acuity"
        icon={<EyeOff className="h-5 w-5" />}
        colorScheme="blue"
        size="xl"
      >
        <VisionTab
          patientId={patientId}
          visitId={visitId}
          optometristId={optometristId}
          visionRecords={visionRecords}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </DataEditModal>
    </>
  );
}
