"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Gauge, Pencil, Plus, Activity } from "lucide-react";
import type { PrescriptionDataResponse } from "@/services/prescriptionDataApi";
import type { IOPRecord } from "@/types";
import { iopApi } from "@/services/iopApi";
import { DataEditModal } from "../patient-examination/DataEditModal";
import { IOPTab } from "../patient-examination/IOPTab";

interface EditableIOPCardProps {
  data: PrescriptionDataResponse["iop"];
  patientId: string;
  visitId: string;
  optometristId: string;
  onSave: () => void;
  isReadOnly?: boolean;
}

// Get IOP status and color based on pressure value
function getIOPStatus(pressure: number): { status: string; colorClass: string } {
  if (pressure < 10) {
    return { status: "Low", colorClass: "text-blue-600 bg-blue-50" };
  } else if (pressure >= 10 && pressure <= 21) {
    return { status: "Normal", colorClass: "text-green-600 bg-green-50" };
  } else if (pressure > 21 && pressure <= 30) {
    return { status: "Elevated", colorClass: "text-amber-600 bg-amber-50" };
  } else {
    return { status: "High", colorClass: "text-red-600 bg-red-50" };
  }
}

export function EditableIOPCard({
  data,
  patientId,
  visitId,
  optometristId,
  onSave,
  isReadOnly = false,
}: EditableIOPCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [iopRecords, setIopRecords] = useState<IOPRecord[]>([]);
  const [iopTrends, setIopTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch IOP records when modal opens
  const fetchIOPRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsResponse, trendsResponse] = await Promise.all([
        iopApi.list({ patient_id: patientId }),
        iopApi.getTrends(patientId, 180),
      ]);
      setIopRecords(recordsResponse.items);
      setIopTrends(trendsResponse);
    } catch (error) {
      console.error("Failed to fetch IOP records:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchIOPRecords();
    }
  }, [isModalOpen, fetchIOPRecords]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Refresh parent data after modal closes
    onSave();
  };

  const handleRefresh = () => {
    fetchIOPRecords();
  };

  // Empty state - no data
  if (!data) {
    if (isReadOnly) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="h-4 w-4 text-indigo-600" />
            <h4 className="font-semibold text-slate-900">IOP (Intraocular Pressure)</h4>
          </div>
          <div className="text-center py-4">
            <Gauge className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No IOP recorded</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="h-4 w-4 text-indigo-600" />
            <h4 className="font-semibold text-slate-900">IOP (Intraocular Pressure)</h4>
          </div>
          <div className="text-center py-4">
            <Gauge className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">No IOP recorded for this visit</p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add IOP
            </button>
          </div>
        </section>

        {/* Modal with IOPTab */}
        <DataEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Intraocular Pressure (IOP)"
          icon={<Activity className="h-5 w-5" />}
          colorScheme="emerald"
          size="lg"
        >
          <IOPTab
            patientId={patientId}
            visitId={visitId}
            iopRecords={iopRecords}
            iopTrends={iopTrends}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </DataEditModal>
      </>
    );
  }

  // Display mode with data
  const odPressure = parseFloat(data.od_pressure) || 0;
  const osPressure = parseFloat(data.os_pressure) || 0;
  const odStatus = getIOPStatus(odPressure);
  const osStatus = getIOPStatus(osPressure);

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-indigo-600" />
            <h4 className="font-semibold text-slate-900">IOP (Intraocular Pressure)</h4>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded p-3 text-center ${odStatus.colorClass}`}>
            <p className="text-xs font-semibold mb-1">OD</p>
            <p className="text-2xl font-bold">{data.od_pressure}</p>
            <p className="text-xs">mmHg</p>
            <span className="inline-block mt-1 text-xs font-medium">{odStatus.status}</span>
          </div>
          <div className={`rounded p-3 text-center ${osStatus.colorClass}`}>
            <p className="text-xs font-semibold mb-1">OS</p>
            <p className="text-2xl font-bold">{data.os_pressure}</p>
            <p className="text-xs">mmHg</p>
            <span className="inline-block mt-1 text-xs font-medium">{osStatus.status}</span>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Method: {data.measurement_method}</span>
          <span>{formatDateTime(data.measurement_time)}</span>
        </div>
      </section>

      {/* Modal with IOPTab */}
      <DataEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Intraocular Pressure (IOP)"
        icon={<Activity className="h-5 w-5" />}
        colorScheme="emerald"
        size="lg"
      >
        <IOPTab
          patientId={patientId}
          visitId={visitId}
          iopRecords={iopRecords}
          iopTrends={iopTrends}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </DataEditModal>
    </>
  );
}
