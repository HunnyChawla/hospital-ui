"use client";

import { useEffect } from "react";
import { fetchDoctors } from "@/redux/doctorsSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { formatDate, currency } from "@/utils/format";
import { Edit2 } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { Doctor } from "@/services/doctorsApi";

interface DoctorTableProps {
  onDoctorClick?: (doctorId: string) => void;
  onEditClick?: (doctor: Doctor) => void;
}

export function DoctorTable({ onDoctorClick, onEditClick }: DoctorTableProps) {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.doctors);

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch]);

  if (loading) {
    return <SkeletonRow rows={5} />;
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
            <th className="px-4 py-3">Consultation Fee</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {list.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                  <td className="px-4 py-3 text-slate-700">
                    {doctor.consultation_fee ? currency(parseFloat(doctor.consultation_fee)) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick?.(doctor);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
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

