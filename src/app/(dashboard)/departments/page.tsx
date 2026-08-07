"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { DepartmentsTable } from "@/components/departments/DepartmentsTable";
import { DepartmentFormModal } from "@/components/departments/DepartmentFormModal";
import { Department } from "@/services/departmentsApi";

export default function DepartmentsPage() {
    const [editing, setEditing] = useState<Department | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const openCreate = () => {
        setEditing(null);
        setIsFormOpen(true);
    };

    const openEdit = (department: Department) => {
        setEditing(department);
        setIsFormOpen(true);
    };

    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Departments</h1>
                            <p className="text-sm text-slate-500">
                                Where doctors sit, and which clinical pathway their patients follow
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                    >
                        Add Department
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <DepartmentsTable onEdit={openEdit} />
            </div>

            <DepartmentFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                department={editing}
            />
        </div>
    );
}
