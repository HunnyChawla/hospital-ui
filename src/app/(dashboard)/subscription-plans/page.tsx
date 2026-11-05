"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isPlatformOwner } from "@/utils/auth";
import {
  subscriptionPlansApi,
  SubscriptionPlanResponse,
  ModuleResponse,
} from "@/services/subscriptionPlansApi";
import { Modal } from "@/components/common/Modal";
import {
  Layers,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Activity,
  CreditCard,
  Stethoscope,
  MonitorPlay,
  FlaskConical,
  BedDouble,
  Pill,
  CalendarDays,
  BarChart3,
  ShieldCheck,
  UserCog,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: Home,
  opd: Activity,
  billing: CreditCard,
  doctor_panel: Stethoscope,
  queue_tv: MonitorPlay,
  laboratory: FlaskConical,
  ipd: BedDouble,
  pharmacy: Pill,
  surgeries: CalendarDays,
  analytics: BarChart3,
  abdm: ShieldCheck,
  core_admin: UserCog,
};

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [modules, setModules] = useState<ModuleResponse[]>([]);

  // Modal state for Create / Edit Custom Plan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanResponse | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});
  const [selectedScreens, setSelectedScreens] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isPlatformOwner()) {
      router.push("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, modulesData] = await Promise.all([
        subscriptionPlansApi.listPlans(),
        subscriptionPlansApi.listModules(),
      ]);
      setPlans(plansData);
      setModules(modulesData);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchData();
    }
  }, [authorized]);

  const standardPlans = useMemo(() => plans.filter((p) => p.is_standard), [plans]);
  const customPlans = useMemo(() => plans.filter((p) => !p.is_standard), [plans]);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");

    // Default: basic core modules selected
    const initialMods: Record<string, boolean> = {
      dashboard: true,
      opd: true,
      billing: true,
      core_admin: true,
    };
    const initialScrs: Record<string, boolean> = {};

    for (const m of modules) {
      if (initialMods[m.key]) {
        for (const s of m.screens) {
          initialScrs[s.path] = true;
        }
      }
    }

    setSelectedModules(initialMods);
    setSelectedScreens(initialScrs);
    setExpandedModules({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlanResponse) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCode(plan.code);
    setFormDescription(plan.description || "");

    const modMap: Record<string, boolean> = {};
    for (const m of plan.modules) {
      modMap[m] = true;
    }
    const scrMap: Record<string, boolean> = {};
    for (const s of plan.screens) {
      scrMap[s] = true;
    }

    setSelectedModules(modMap);
    setSelectedScreens(scrMap);
    setExpandedModules({});
    setIsModalOpen(true);
  };

  const handleToggleModuleInForm = (moduleKey: string) => {
    const next = !selectedModules[moduleKey];
    setSelectedModules((prev) => ({ ...prev, [moduleKey]: next }));

    // Cascade to screens in that module
    const mod = modules.find((m) => m.key === moduleKey);
    if (mod) {
      setSelectedScreens((prev) => {
        const updated = { ...prev };
        for (const s of mod.screens) {
          updated[s.path] = next;
        }
        return updated;
      });
    }
  };

  const handleToggleScreenInForm = (moduleKey: string, screenPath: string) => {
    const next = !selectedScreens[screenPath];
    setSelectedScreens((prev) => ({ ...prev, [screenPath]: next }));
    if (next) {
      setSelectedModules((prev) => ({ ...prev, [moduleKey]: true }));
    }
  };

  const handleSaveCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Please provide both Plan Name and Plan Code");
      return;
    }

    const activeModules = Object.entries(selectedModules)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const activeScreens = Object.entries(selectedScreens)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (activeModules.length === 0) {
      toast.error("Please select at least one module for this plan");
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        await subscriptionPlansApi.updatePlan(editingPlan.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          modules: activeModules,
          screens: activeScreens,
        });
        toast.success("Custom plan updated successfully!");
      } else {
        await subscriptionPlansApi.createPlan({
          code: formCode.trim().toLowerCase(),
          name: formName.trim(),
          description: formDescription.trim(),
          modules: activeModules,
          screens: activeScreens,
        });
        toast.success("Custom plan created successfully!");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlanResponse) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) return;

    try {
      await subscriptionPlansApi.deletePlan(plan.id);
      toast.success("Custom plan deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Platform Administration
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Subscription Plans &amp; Feature Modules
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define standard tiers, create customized packages, and manage screen visibility across all hospital tenants.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium text-sm shadow-md hover:from-sky-600 hover:to-indigo-700 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Custom Plan
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          <p className="text-sm text-slate-500">Loading subscription plans...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Standard Plans Showcase */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Standard Platform Tiers</h2>
              <span className="text-xs text-slate-400 font-normal">
                (Pre-configured built-in subscription tiers)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {standardPlans.map((plan) => {
                const isUltra = plan.code === "ultra";
                const isPremium = plan.code === "premium";
                const isStandard = plan.code === "standard";

                const badgeColor = isUltra
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : isPremium
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : isStandard
                  ? "bg-sky-100 text-sky-800 border-sky-200"
                  : "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={plan.code}
                    className={`rounded-2xl border p-5 flex flex-col justify-between bg-white transition hover:shadow-lg ${
                      isUltra
                        ? "border-purple-300 ring-2 ring-purple-500/10"
                        : "border-slate-200 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                          {plan.code} tier
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {plan.screens.length} Screens
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[36px]">
                        {plan.description}
                      </p>

                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Included Modules:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {plan.modules.map((modKey) => {
                            const modObj = modules.find((m) => m.key === modKey);
                            const Icon = MODULE_ICONS[modKey] || Layers;
                            return (
                              <span
                                key={modKey}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                <Icon className="h-3 w-3 text-slate-500" />
                                {modObj?.name || modKey}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Plans */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Custom Subscription Plans</h2>
                <p className="text-xs text-slate-500">
                  Tailored plans created by Platform Owner that can be assigned to any hospital tenant.
                </p>
              </div>
            </div>

            {customPlans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 mx-auto mb-3 shadow-xs">
                  <Layers className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Custom Plans Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Create a custom subscription plan to bundle specific modules (e.g. OPD + Lab Only, Ophthalmology Clinic) and apply it to any tenant with one click.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Custom Plan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {customPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Custom Plan
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(plan)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                            title="Edit Custom Plan"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Custom Plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                      <code className="text-[11px] text-slate-400 block mb-2">{plan.code}</code>
                      {plan.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {plan.description}
                        </p>
                      )}

                      <div className="border-t border-slate-100 pt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Modules:</span>
                          <span className="font-semibold text-slate-800">{plan.modules.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Visible Screens:</span>
                          <span className="font-semibold text-slate-800">{plan.screens.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {plan.modules.map((m) => {
                            const Icon = MODULE_ICONS[m] || Layers;
                            return (
                              <span
                                key={m}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                <Icon className="h-2.5 w-2.5" />
                                {m}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create / Edit Custom Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-600" />
            <span>{editingPlan ? "Edit Custom Plan" : "Create New Custom Plan"}</span>
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleSaveCustomPlan} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-700">
                Plan Name <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingPlan) {
                    setFormCode(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_+|_+$/g, "")
                    );
                  }
                }}
                placeholder="e.g. Ophthalmology Center Plan"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-700">
                Plan Code / Slug <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                required
                disabled={!!editingPlan}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toLowerCase())}
                placeholder="e.g. ophthalmology_plan"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-medium text-slate-700">Description</span>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe this plan template and target hospital type..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </label>

          {/* Module & Screen Selection Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Included Modules &amp; Screens
              </span>
              <span className="text-xs text-slate-500">
                {Object.values(selectedModules).filter(Boolean).length} modules selected
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 border border-slate-200 rounded-xl p-3 bg-slate-50/50 scrollbar-thin">
              {modules.map((mod) => {
                const IconComponent = MODULE_ICONS[mod.key] || Layers;
                const isSelected = !!selectedModules[mod.key];
                const isExpanded = !!expandedModules[mod.key];

                return (
                  <div
                    key={mod.key}
                    className={`rounded-xl border transition ${
                      isSelected ? "border-slate-200 bg-white" : "border-slate-200/60 bg-white/60 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between p-3 gap-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id={`mod-${mod.key}`}
                          checked={isSelected}
                          onChange={() => handleToggleModuleInForm(mod.key)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <label
                          htmlFor={`mod-${mod.key}`}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          <IconComponent className="h-4 w-4 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-900">{mod.name}</span>
                        </label>
                      </div>

                      {mod.screens.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModules((prev) => ({ ...prev, [mod.key]: !prev[mod.key] }))
                          }
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                        >
                          <span>{mod.screens.length} screens</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {isExpanded && mod.screens.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 grid grid-cols-1 md:grid-cols-2 gap-1.5 rounded-b-xl">
                        {mod.screens.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 p-1.5 rounded bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedScreens[s.path]}
                              onChange={() => handleToggleScreenInForm(mod.key, s.path)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="truncate">{s.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-medium text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
