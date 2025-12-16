"use client";

import { useEffect } from "react";
import {
  fetchPatients,
  selectPatient,
} from "@/redux/patientsSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { formatDate, currency } from "@/utils/format";
import { Edit2 } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { Patient } from "@/types";

interface PatientTableProps {
  onPatientClick?: (patientId: string) => void;
  onEditClick?: (patient: Patient) => void;
}

export function PatientTable({ onPatientClick, onEditClick }: PatientTableProps) {
  const dispatch = useAppDispatch();
  const { list, loading, selected } = useAppSelector((s) => s.patients);

  useEffect(() => {
    dispatch(fetchPatients());
  }, [dispatch]);

  if (loading) {
    return <SkeletonRow rows={5} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Visit</th>
            <th className="px-4 py-3">Outstanding</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {list.map((patient) => (
            <tr
              key={patient.id}
              className="cursor-pointer hover:bg-sky-50/50 transition"
              onClick={() => {
                dispatch(selectPatient(patient.id));
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
                    {patient.status.toLowerCase()}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {formatDate(patient.lastVisit)}
              </td>
              <td className="px-4 py-3 font-semibold text-amber-600">
                {currency(patient.outstanding)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick?.(patient);
                    }}
                    className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                      selected?.id === patient.id
                        ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Edit2 className="mr-1 inline h-4 w-4" />
                    Edit
                  </button>
                  {/* Delete functionality not available - API doesn't support patient deletion */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

