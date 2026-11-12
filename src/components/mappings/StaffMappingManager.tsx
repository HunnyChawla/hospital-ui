"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  Users,
  Stethoscope,
  Search,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { examinerMappingsApi, type ExaminerDoctorMapping } from "@/services/examinerMappingsApi";
import { optometristMappingsApi, type OptometristDoctorMapping } from "@/services/optometristMappingsApi";
import { doctorsApi, type Doctor } from "@/services/doctorsApi";
import { usersApi, type User } from "@/services/usersApi";
import { getTenantIdForApi } from "@/utils/auth";
import { useTenantLabels } from "@/hooks/useTenantLabels";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { getErrorMessage } from "@/utils/errorHandler";

export type MappingType = "examiner" | "optometrist";

interface MappingRow {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_email?: string;
  doctor_id: string;
  doctor_name: string;
  specialization?: string | null;
  created_at: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "ST";
}

export function StaffMappingManager({ type }: { type: MappingType }) {
  const { roleLabel } = useTenantLabels();
  const rawRole = roleLabel(type);
  const roleName = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

  // Data states
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [search, setSearch] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState("");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MappingRow | null>(null);

  // Fetch mappings, staff and doctors
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const tenantId =
          typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);

        // 1. Fetch staff
        const staffRes = await usersApi.list({ role: type, page_size: 100 });
        const staff = staffRes.items;
        setStaffList(staff);

        // 2. Fetch active doctors
        const docsRes = await doctorsApi.list({
          is_active: true,
          tenantId: apiTenantId || undefined,
        });
        setDoctorsList(docsRes);

        const docMap = new Map<string, Doctor>();
        docsRes.forEach((d) => docMap.set(d.id, d));

        // 3. Fetch mappings
        if (type === "examiner") {
          const promises = staff.map((s) =>
            examinerMappingsApi
              .getExaminerDoctors(s.id, apiTenantId || undefined)
              .catch((err) => {
                console.error(`Error fetching mappings for examiner ${s.id}:`, err);
                return [] as ExaminerDoctorMapping[];
              })
          );
          const results = await Promise.all(promises);
          const flat: MappingRow[] = results.flat().map((m) => {
            const d = docMap.get(m.doctor_id);
            const s = staff.find((u) => u.id === m.examiner_id);
            return {
              id: m.id,
              staff_id: m.examiner_id,
              staff_name: m.examiner_name || s?.full_name || "Unknown Staff",
              staff_email: s?.email,
              doctor_id: m.doctor_id,
              doctor_name: m.doctor_name || d?.user_name || "Unknown Doctor",
              specialization: d?.specialization,
              created_at: m.created_at,
            };
          });
          setMappings(flat);
        } else {
          // type === "optometrist"
          const promises = staff.map((s) =>
            optometristMappingsApi
              .getOptometristDoctors(s.id, apiTenantId || undefined)
              .catch((err) => {
                console.error(`Error fetching mappings for optometrist ${s.id}:`, err);
                return [] as OptometristDoctorMapping[];
              })
          );
          const results = await Promise.all(promises);
          const flat: MappingRow[] = results.flat().map((m) => {
            const d = docMap.get(m.doctor_id);
            const s = staff.find((u) => u.id === m.optometrist_id);
            return {
              id: m.id,
              staff_id: m.optometrist_id,
              staff_name: m.optometrist_name || s?.full_name || "Unknown Staff",
              staff_email: s?.email,
              doctor_id: m.doctor_id,
              doctor_name: m.doctor_name || d?.user_name || "Unknown Doctor",
              specialization: d?.specialization,
              created_at: m.created_at,
            };
          });
          setMappings(flat);
        }
      } catch (error) {
        console.error("Failed to load mappings:", error);
        toast.error(`Failed to load ${roleName.toLowerCase()} mappings`);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [type, roleName]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open add modal
  const handleOpenAdd = () => {
    setSelectedStaffId(staffList.length > 0 ? staffList[0].id : "");
    setSelectedDoctorIds([]);
    setDoctorFilter("");
    setShowModal(true);
  };

  // Doctors already mapped to the selected staff member
  const alreadyMappedDoctorIds = useMemo(() => {
    if (!selectedStaffId) return new Set<string>();
    const mapped = mappings
      .filter((m) => m.staff_id === selectedStaffId)
      .map((m) => m.doctor_id);
    return new Set(mapped);
  }, [selectedStaffId, mappings]);

  // Filtered doctors list in modal
  const filteredModalDoctors = useMemo(() => {
    if (!doctorFilter.trim()) return doctorsList;
    const q = doctorFilter.toLowerCase();
    return doctorsList.filter(
      (d) =>
        d.user_name.toLowerCase().includes(q) ||
        (d.specialization && d.specialization.toLowerCase().includes(q))
    );
  }, [doctorsList, doctorFilter]);

  // Toggle doctor in modal
  const toggleDoctorSelection = (doctorId: string) => {
    if (alreadyMappedDoctorIds.has(doctorId)) return;
    setSelectedDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  // Create mappings
  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      toast.error(`Please select a ${roleName.toLowerCase()}`);
      return;
    }
    if (selectedDoctorIds.length === 0) {
      toast.error("Please select at least one doctor");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId =
        typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

      const promises = selectedDoctorIds.map((doctorId) => {
        if (type === "examiner") {
          return examinerMappingsApi.createMapping(
            { examiner_id: selectedStaffId, doctor_id: doctorId },
            tenantId || undefined
          );
        } else {
          return optometristMappingsApi.createMapping(
            { optometrist_id: selectedStaffId, doctor_id: doctorId },
            tenantId || undefined
          );
        }
      });

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (succeeded > 0 && failed === 0) {
        toast.success(
          `Successfully mapped ${succeeded} doctor${succeeded > 1 ? "s" : ""}`
        );
      } else if (succeeded > 0 && failed > 0) {
        toast.warning(`Mapped ${succeeded} doctor(s), ${failed} failed`);
      } else {
        const firstRejection = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        toast.error(
          getErrorMessage(firstRejection?.reason) || "Failed to create mappings"
        );
      }

      setShowModal(false);
      setSelectedDoctorIds([]);
      await fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to create mapping");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete mapping
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const tenantId =
        typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

      if (type === "examiner") {
        await examinerMappingsApi.deleteMapping(
          deleteTarget.id,
          tenantId || undefined
        );
      } else {
        await optometristMappingsApi.deleteMapping(
          deleteTarget.id,
          tenantId || undefined
        );
      }

      toast.success(
        `Removed mapping between ${deleteTarget.staff_name} and ${deleteTarget.doctor_name}`
      );
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to delete mapping");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter mappings by search
  const filteredMappings = useMemo(() => {
    if (!search.trim()) return mappings;
    const q = search.toLowerCase();
    return mappings.filter(
      (m) =>
        m.staff_name.toLowerCase().includes(q) ||
        m.doctor_name.toLowerCase().includes(q) ||
        (m.specialization && m.specialization.toLowerCase().includes(q))
    );
  }, [mappings, search]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{roleName} Mappings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Map {roleName.toLowerCase()}s to doctors for pre-consultation screening.
            Unmapped doctors receive patients directly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${refreshing ? "animate-spin text-sky-600" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Mapping</span>
          </button>
        </div>
      </div>

      {/* 2. Simple Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search by ${roleName.toLowerCase()} or doctor name...`}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/15"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 3. Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
          <span className="ml-3 text-sm text-slate-600">Loading mappings...</span>
        </div>
      ) : mappings.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            No {roleName} Mappings Found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a mapping to connect a {roleName.toLowerCase()} with a doctor.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Mapping</span>
          </button>
        </div>
      ) : filteredMappings.length === 0 ? (
        /* Zero Search Results */
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No matches found</h3>
          <p className="mt-1 text-xs text-slate-500">
            No mappings match &quot;{search}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-3 text-xs font-semibold text-sky-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Clean Modern Table */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-left">{roleName}</th>
                <th className="px-6 py-3.5 text-left">Doctor</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMappings.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-slate-50/70">
                  {/* Staff */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700 text-xs ring-1 ring-teal-200">
                        {getInitials(m.staff_name)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {m.staff_name}
                        </div>
                        {m.staff_email && (
                          <div className="text-xs text-slate-500">{m.staff_email}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Doctor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 text-xs ring-1 ring-sky-200">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {m.doctor_name}
                        </div>
                        {m.specialization && (
                          <div className="text-xs text-slate-500">
                            {m.specialization}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Mapping"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Add Mapping Modal (Clean & Straightforward) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Add {roleName} Mapping
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateMapping} className="p-6 space-y-5">
              {/* Select Staff */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Select {roleName}
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setSelectedDoctorIds([]);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  required
                >
                  <option value="" disabled>
                    Choose a {roleName.toLowerCase()}...
                  </option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Doctors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Select Doctors
                  </label>
                  {selectedDoctorIds.length > 0 && (
                    <span className="text-xs text-sky-600 font-medium">
                      {selectedDoctorIds.length} selected
                    </span>
                  )}
                </div>

                {/* Optional search within doctors */}
                {doctorsList.length > 5 && (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={doctorFilter}
                      onChange={(e) => setDoctorFilter(e.target.value)}
                      placeholder="Filter doctors..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Doctor List */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                  {filteredModalDoctors.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No doctors found
                    </div>
                  ) : (
                    filteredModalDoctors.map((doc) => {
                      const isMapped = alreadyMappedDoctorIds.has(doc.id);
                      const isSelected = selectedDoctorIds.includes(doc.id);

                      return (
                        <div
                          key={doc.id}
                          onClick={() => !isMapped && toggleDoctorSelection(doc.id)}
                          className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                            isMapped
                              ? "cursor-not-allowed bg-slate-50 opacity-50"
                              : "cursor-pointer hover:bg-slate-50"
                          } ${isSelected ? "bg-sky-50" : ""}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                isSelected
                                  ? "border-sky-600 bg-sky-600 text-white"
                                  : isMapped
                                  ? "border-slate-300 bg-slate-200"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {(isSelected || isMapped) && (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {doc.user_name}
                              </div>
                              {doc.specialization && (
                                <div className="text-[11px] text-slate-500">
                                  {doc.specialization}
                                </div>
                              )}
                            </div>
                          </div>

                          {isMapped && (
                            <span className="text-[10px] font-medium text-slate-500">
                              Already Mapped
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedDoctorIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Mapping</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        title="Delete Mapping"
        message={
          deleteTarget
            ? `Are you sure you want to remove the mapping between ${deleteTarget.staff_name} and ${deleteTarget.doctor_name}?`
            : ""
        }
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
