"use client";

import { usePatients } from "@/hooks/queries/usePatients";
import { formatDate } from "@/utils/format";
import { Edit2, User, Calendar, Phone } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { Patient } from "@/types";
import { useState } from "react";

interface PatientTableProps {
  onPatientClick?: (patientId: string) => void;
  onEditClick?: (patient: Patient) => void;
}

export function PatientTable({ onPatientClick, onEditClick }: PatientTableProps) {
  // Use React Query hook instead of Redux - automatic deduplication!
  const { data, isLoading, error } = usePatients({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Extract patients from React Query response
  const list = data?.patients ?? [];

  if (isLoading) {
    return <SkeletonRow rows={5} />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
        <p className="text-sm text-rose-800">
          Failed to load patients. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Mobile View - Cards */}
      <div className="grid gap-4 p-4 md:hidden">
        {list.map((patient) => (
          <div
            key={patient.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            onClick={() => {
              setSelectedId(patient.id);
              onPatientClick?.(patient.id);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{patient.name}</p>
                  <p className="text-xs text-slate-500">
                    {patient.age} years • {patient.gender}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                {(patient.status || 'Active').toLowerCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{patient.mobile}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDate(patient.lastVisit)}</span>
              </div>
            </div>

            {patient.healthId && (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-xs text-slate-500">
                Health ID: <span className="font-medium text-slate-700">{patient.healthId}</span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.(patient);
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <Edit2 className="h-4 w-4" />
              Edit Patient
            </button>
          </div>
        ))}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {list.map((patient) => (
              <tr
                key={patient.id}
                className="cursor-pointer hover:bg-sky-50/50 transition"
                onClick={() => {
                  setSelectedId(patient.id);
                  onPatientClick?.(patient.id);
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      {patient.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {patient.age} • {patient.gender}
                      {patient.healthId && ` • ${patient.healthId}`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col text-slate-700">
                    <span>{patient.mobile}</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {(patient.status || 'Active').toLowerCase()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDate(patient.lastVisit)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick?.(patient);
                      }}
                      className={`group relative flex items-center justify-center overflow-hidden rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${selectedId === patient.id
                        ? "bg-sky-500 hover:bg-sky-600"
                        : "bg-slate-500 hover:bg-slate-600"
                        }`}
                      style={{ width: "2rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.paddingLeft = "0.75rem";
                        e.currentTarget.style.paddingRight = "0.75rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

