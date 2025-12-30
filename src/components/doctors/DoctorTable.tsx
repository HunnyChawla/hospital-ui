"use client";

import { useDoctors } from "@/hooks/queries/useDoctors";
import { Edit2, Settings } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { Doctor } from "@/services/doctorsApi";

interface DoctorTableProps {
  onDoctorClick?: (doctorId: string) => void;
  onEditClick?: (doctor: Doctor) => void;
  onConfigureFeesClick?: (doctor: Doctor) => void;
}

export function DoctorTable({ onDoctorClick, onEditClick, onConfigureFeesClick }: DoctorTableProps) {
  // Use React Query hook instead of Redux - automatic deduplication!
  const { data, isLoading, error } = useDoctors();
  const list = data ?? [];

  if (isLoading) {
    return <SkeletonRow rows={5} />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
        <p className="text-sm text-rose-800">
          Failed to load doctors. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3">Specialization</th>
            <th className="px-4 py-3">Qualification</th>
            <th className="px-4 py-3">Registration</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {list.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No doctors found
              </td>
            </tr>
          ) : (
            list.map((doctor) => {
              const doctorName = doctor.name || doctor.user?.name || `Dr. ${doctor.specialization || "Unknown"}`;
              return (
                <tr
                  key={doctor.id}
                  className="cursor-pointer hover:bg-sky-50/50 transition"
                  onClick={() => onDoctorClick?.(doctor.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{doctorName}</p>
                    {doctor.user?.email && (
                      <p className="text-xs text-slate-500">{doctor.user.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {doctor.specialization || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {doctor.qualification || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {doctor.registration_number || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigureFeesClick?.(doctor);
                        }}
                        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-teal-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-teal-600"
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
                        title="Configure Fees"
                      >
                        <Settings className="h-4 w-4 shrink-0" />
                        <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Fees</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick?.(doctor);
                        }}
                        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

