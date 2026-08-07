"use client";

import { AlertTriangle, Pencil, Users } from "lucide-react";
import { Department } from "@/services/departmentsApi";
import { useDepartments } from "@/hooks/queries/useDepartments";

interface DepartmentsTableProps {
    onEdit: (department: Department) => void;
}

export function DepartmentsTable({ onEdit }: DepartmentsTableProps) {
    const { data: departments, isLoading, isError, error } = useDepartments();

    if (isLoading) {
        return <p className="py-8 text-center text-sm text-slate-500">Loading departments…</p>;
    }

    if (isError) {
        return (
            <p className="py-8 text-center text-sm text-rose-600">
                Could not load departments. {(error as Error)?.message}
            </p>
        );
    }

    if (!departments?.length) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-medium text-slate-700">No departments yet</p>
                <p className="mt-1 text-sm text-slate-500">
                    Departments are where doctors sit and where clinical pathways attach.
                </p>
            </div>
        );
    }

    // Departments carried over from free-text specialisations may be job titles
    // ("ENT Specialist") rather than departments. Surfacing them first is the
    // whole point of the flag — otherwise nobody ever cleans them up.
    const needingReview = departments.filter((d) => d.needs_review);

    return (
        <div className="grid gap-3">
            {needingReview.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800">
                        {needingReview.length} department
                        {needingReview.length === 1 ? "" : "s"} came from imported specialisation
                        text and may be a job title rather than a department. Rename to confirm.
                    </p>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="pb-2 pr-3 font-medium">Department</th>
                            <th className="pb-2 pr-3 font-medium">Pathway</th>
                            <th className="pb-2 pr-3 font-medium">Doctors</th>
                            <th className="pb-2 pr-3 font-medium">Status</th>
                            <th className="pb-2 font-medium sr-only">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((department) => (
                            <tr
                                key={department.id}
                                className="border-b border-slate-50 last:border-0"
                            >
                                <td className="py-3 pr-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">
                                            {department.name}
                                        </span>
                                        {department.needs_review && (
                                            <span
                                                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                                                title="Imported from specialisation text — check this is really a department"
                                            >
                                                Review
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">{department.code}</span>
                                </td>
                                <td className="py-3 pr-3">
                                    {department.pathway_name ? (
                                        <span className="text-slate-700">
                                            {department.pathway_name}
                                        </span>
                                    ) : (
                                        // Not the same as "no workflow" — say so, or an
                                        // admin reads a blank cell as broken.
                                        <span className="text-slate-400">Hospital default</span>
                                    )}
                                </td>
                                <td className="py-3 pr-3">
                                    <span className="inline-flex items-center gap-1 text-slate-700">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        {department.doctor_count}
                                    </span>
                                </td>
                                <td className="py-3 pr-3">
                                    <span
                                        className={
                                            department.is_active
                                                ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                                : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                                        }
                                    >
                                        {department.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="py-3 text-right">
                                    <button
                                        onClick={() => onEdit(department)}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label={`Edit ${department.name}`}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
