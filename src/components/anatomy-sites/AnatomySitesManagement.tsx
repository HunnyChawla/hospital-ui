"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Globe,
  Lock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AnatomySite } from "@/types";
import { anatomySitesApi } from "@/services/anatomySitesApi";
import { toast } from "sonner";
import { getErrorMessage, handleError } from "@/utils/errorHandler";

export function AnatomySitesManagement() {
  const [sites, setSites] = useState<AnatomySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedScope, setSelectedScope] = useState("all"); // "all" | "global" | "custom"

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<AnatomySite | null>(null);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [department, setDepartment] = useState("Ophthalmology");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("active"); // "active" (default) | "inactive" | "all"

  const fetchSites = async () => {
    setLoading(true);
    try {
      const data = await anatomySitesApi.list({ is_active_only: false });
      setSites(data);
    } catch (err) {
      handleError(err, { defaultMessage: "Failed to load anatomy sites", logError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const isGlobalSite = (site: AnatomySite) => {
    return site.is_global === true || site.tenant_id === null || site.tenant_id === undefined;
  };

  const handleOpenModal = (site?: AnatomySite) => {
    if (site) {
      if (isGlobalSite(site)) {
        toast.error("Global anatomy sites cannot be modified.", {
          description: "Global system records are standard across all tenants. You can create custom anatomy sites for specific needs.",
        });
        return;
      }
      setEditingSite(site);
      setName(site.name);
      setShortCode(site.short_code);
      setDepartment(site.department || "Ophthalmology");
      setSortOrder(site.sort_order || 0);
    } else {
      setEditingSite(null);
      setName("");
      setShortCode("");
      setDepartment("Ophthalmology");
      setSortOrder(sites.length + 1);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim()) {
      toast.error("Please provide both site name and short code");
      return;
    }

    setSaving(true);
    try {
      if (editingSite) {
        if (isGlobalSite(editingSite)) {
          toast.error("Global anatomy sites are standard system records and cannot be edited.");
          setSaving(false);
          return;
        }
        await anatomySitesApi.update(editingSite.id, {
          name: name.trim(),
          short_code: shortCode.trim().toUpperCase(),
          department: department.trim(),
          sort_order: Number(sortOrder),
        });
        toast.success("Anatomy site updated successfully!");
      } else {
        await anatomySitesApi.create({
          name: name.trim(),
          short_code: shortCode.trim().toUpperCase(),
          department: department.trim(),
          sort_order: Number(sortOrder),
        });
        toast.success("Custom anatomy site created successfully!");
      }
      setModalOpen(false);
      fetchSites();
    } catch (err) {
      const errMsg = getErrorMessage(err);
      toast.error(errMsg || "Failed to save anatomy site");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (site: AnatomySite) => {
    if (isGlobalSite(site)) {
      toast.error("Global anatomy sites cannot be deactivated.", {
        description: "Global system records are active system wide. Create custom anatomy sites for tenant level changes.",
      });
      return;
    }
    try {
      await anatomySitesApi.update(site.id, { is_active: !site.is_active });
      toast.success(
        `Anatomy site ${!site.is_active ? "activated" : "deactivated"} successfully`
      );
      fetchSites();
    } catch (err) {
      const errMsg = getErrorMessage(err);
      toast.error(errMsg || "Failed to update status");
    }
  };

  const handleDelete = async (site: AnatomySite) => {
    if (isGlobalSite(site)) {
      toast.error("Global anatomy sites cannot be deleted.", {
        description: "Standard system anatomy sites (OD, OS, OU, etc.) are protected system records.",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete custom anatomy site "${site.name}"?`)) {
      return;
    }

    try {
      await anatomySitesApi.deactivate(site.id);
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      toast.success(`Custom anatomy site "${site.name}" deleted successfully.`);
    } catch (err) {
      const errMsg = getErrorMessage(err);
      toast.error(errMsg || "Failed to delete anatomy site");
    }
  };

  const filteredSites = sites.filter((site) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = site.name.toLowerCase().includes(q);
      const matchCode = site.short_code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (selectedDept !== "all" && site.department !== selectedDept) {
      return false;
    }
    if (selectedScope === "global" && !isGlobalSite(site)) {
      return false;
    }
    if (selectedScope === "custom" && isGlobalSite(site)) {
      return false;
    }
    if (selectedStatus === "active" && !site.is_active) {
      return false;
    }
    if (selectedStatus === "inactive" && site.is_active) {
      return false;
    }
    return true;
  });

  const globalCount = sites.filter(isGlobalSite).length;
  const customCount = sites.length - globalCount;
  const activeCount = sites.filter((s) => s.is_active).length;
  const inactiveCount = sites.length - activeCount;

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-600" />
            Anatomy Sites Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage global system anatomy sites (OD, OS, OU) and tenant-custom surgical locations.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Custom Anatomy Site
        </button>
      </div>

      {/* Scope Info Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-purple-950">Global (System) Sites ({globalCount})</span>
            <p className="text-[11px] text-purple-800 mt-0.5">
              Standard pre-configured anatomical sites (OD, OS, OU, etc.) shared across all hospital tenants. Protected against deletion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-sky-900 text-xs">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-sky-950">Tenant Custom Sites ({customCount})</span>
            <p className="text-[11px] text-sky-800 mt-0.5">
              Hospital-specific anatomical locations created by your organization. Can be edited and managed by admins.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anatomy site name or short code (OD, OS, OU)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="all">All Scope Types ({sites.length})</option>
            <option value="global">Global (System) Only ({globalCount})</option>
            <option value="custom">Tenant Custom Only ({customCount})</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="all">All Statuses ({sites.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="inactive">Inactive / Deactivated ({inactiveCount})</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          >
            <option value="all">All Departments</option>
            <option value="Ophthalmology">Ophthalmology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="General Surgery">General Surgery</option>
          </select>
        </div>
      </div>

      {/* Sites Grid / Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Loader2 className="h-5 w-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading anatomy sites...</p>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <MapPin className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No anatomy sites found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Anatomy Site Name</th>
                  <th className="px-5 py-3">Short Code</th>
                  <th className="px-5 py-3">Record Scope / Type</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Sort Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSites.map((site) => {
                  const global = isGlobalSite(site);
                  return (
                    <tr key={site.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{site.name}</span>
                          {global && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-sky-700">
                        <span className="bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {site.short_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {global ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <Globe className="h-3 w-3 text-purple-600" /> Global (System)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <Building2 className="h-3 w-3 text-sky-600" /> Custom (Tenant)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-600">
                        {site.department || "General"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">
                        #{site.sort_order || 0}
                      </td>
                      <td className="px-5 py-3.5">
                        {site.is_active ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {global ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                            title="Global system records are protected and cannot be edited or deleted"
                          >
                            <Lock className="h-3 w-3 text-slate-400" /> Protected System Record
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenModal(site)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                              title="Edit Custom Anatomy Site"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(site)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                site.is_active
                                  ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={site.is_active ? "Deactivate" : "Activate"}
                            >
                              {site.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(site)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Custom Anatomy Site"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-sky-600" />
                {editingSite ? "Edit Custom Anatomy Site" : "Add Tenant Custom Anatomy Site"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Anatomy Site Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Right Eye, Both Eyes, Left Knee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-sky-400 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Short Code (OD, OS, OU) *</label>
                <input
                  type="text"
                  placeholder="e.g. OD, OS, OU, LK, RK"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-sky-400 text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-sky-400 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-sky-400 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition cursor-pointer shadow-xs"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingSite ? "Save Changes" : "Create Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
