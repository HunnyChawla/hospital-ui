"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Users,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { examinerMappingsApi, ExaminerDoctorMapping } from "@/services/examinerMappingsApi";
import { doctorsApi, Doctor } from "@/services/doctorsApi";
import { usersApi, User } from "@/services/usersApi";
import { getTenantIdForApi } from "@/utils/auth";
import { useTenantLabels } from "@/hooks/useTenantLabels";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { getErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";

export default function ExaminerMappingsPage() {
  const [mappings, setMappings] = useState<ExaminerDoctorMapping[]>([]);
  const [examiners, setExaminers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExaminerDoctorMapping | null>(null);
  const { roleLabel } = useTenantLabels();

  // Form state
  const [selectedExaminerId, setSelectedExaminerId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const apiTenantId = getTenantIdForApi(tenantId || undefined);

      const examinersResponse = await usersApi.list({ role: "examiner", page_size: 100 });
      setExaminers(examinersResponse.items);

      const docsResponse = await doctorsApi.list({ is_active: true, tenantId: apiTenantId || undefined });
      setDoctors(docsResponse);

      const mappingPromises = examinersResponse.items.map((examiner) =>
        examinerMappingsApi
          .getExaminerDoctors(examiner.id, apiTenantId || undefined)
          .catch((e) => {
            console.error(`Error fetching mappings for examiner ${examiner.id}:`, e);
            return [] as ExaminerDoctorMapping[];
          })
      );

      const allMappingsResults = await Promise.all(mappingPromises);
      setMappings(allMappingsResults.flat());
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExaminerId || !selectedDoctorId) {
      toast.error(`Please select both an ${roleLabel("examiner").toLowerCase()} and a doctor`);
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await examinerMappingsApi.createMapping(
        { examiner_id: selectedExaminerId, doctor_id: selectedDoctorId },
        tenantId || undefined
      );
      toast.success("Mapping created successfully");
      setShowModal(false);
      setSelectedExaminerId("");
      setSelectedDoctorId("");
      fetchData();
    } catch (error) {
      // Surface the backend's message — it explains e.g. the eye/general
      // pipeline conflict, which "Failed to create mapping" would hide.
      toast.error(getErrorMessage(error) || "Failed to create mapping");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMapping = async () => {
    if (!deleteTarget) return;
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await examinerMappingsApi.deleteMapping(deleteTarget.id, tenantId || undefined);
      toast.success("Mapping deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to delete mapping");
    } finally {
      setDeleteTarget(null);
    }
  };

  const examinerName = (examinerId: string) =>
    examiners.find((e) => e.id === examinerId)?.full_name || "Unknown";

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {roleLabel("examiner")} Mappings
          </h1>
          <p className="text-slate-500">
            Doctors whose patients see a mapped {roleLabel("examiner").toLowerCase()} before the
            consultation. A doctor with no mapping receives patients directly.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
        >
          <Plus className="h-5 w-5" />
          Add Mapping
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-2 text-slate-600">Loading mappings...</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left">{roleLabel("examiner")}</th>
                <th className="px-6 py-4 text-left">Doctor</th>
                <th className="px-6 py-4 pr-12 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <p>No mappings found. Create one to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr key={mapping.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {mapping.examiner_name || examinerName(mapping.examiner_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                          <Stethoscope className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900">{mapping.doctor_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTarget(mapping)}
                        className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        title="Delete Mapping"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Mapping Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Mapping</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateMapping} className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Select {roleLabel("examiner")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    value={selectedExaminerId}
                    onChange={(e) => setSelectedExaminerId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  >
                    <option value="">
                      Select an {roleLabel("examiner").toLowerCase()}...
                    </option>
                    {examiners.map((examiner) => (
                      <option key={examiner.id} value={examiner.id}>
                        {examiner.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Doctor</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  >
                    <option value="">Select a doctor...</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Mapping"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        title="Delete Mapping"
        message={
          deleteTarget
            ? `Remove the mapping between ${
                deleteTarget.examiner_name || examinerName(deleteTarget.examiner_id)
              } and ${deleteTarget.doctor_name}? New visits for this doctor will go directly to the doctor.`
            : ""
        }
        confirmText="Delete"
        onConfirm={handleDeleteMapping}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
