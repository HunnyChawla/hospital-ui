"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Modal } from "@/components/common/Modal";
import {
  subscriptionPlansApi,
  SubscriptionPlanResponse,
  TenantPlanConfigResponse,
} from "@/services/subscriptionPlansApi";
import { Tenant } from "@/services/tenantsApi";
import {
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
  Layers,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface TenantPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess?: () => void;
}

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

export function TenantPlanModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: TenantPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [config, setConfig] = useState<TenantPlanConfigResponse | null>(null);

  // Local editable state for modules and screens
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("basic");
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [enabledScreens, setEnabledScreens] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Fetch plans and tenant config on open
  useEffect(() => {
    if (!isOpen || !tenant) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      subscriptionPlansApi.listPlans(),
      subscriptionPlansApi.getTenantPlanConfig(tenant.id),
    ])
      .then(([plansData, configData]) => {
        if (!isMounted) return;
        setPlans(plansData);
        setConfig(configData);

        setSelectedPlanCode(configData.plan_code || "basic");

        // Initialize enabled maps
        const modMap: Record<string, boolean> = {};
        const scrMap: Record<string, boolean> = {};

        for (const m of configData.modules) {
          modMap[m.key] = m.is_enabled;
          for (const s of m.screens) {
            scrMap[s.path] = s.is_enabled;
          }
        }

        setEnabledModules(modMap);
        setEnabledScreens(scrMap);
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(getErrorMessage(err));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenant]);

  // Standard plans and custom plans lists
  const standardPlans = useMemo(() => plans.filter((p) => p.is_standard), [plans]);
  const customPlans = useMemo(() => plans.filter((p) => !p.is_standard), [plans]);

  // When a plan is chosen from preset buttons, apply its defaults locally
  const handleSelectPlanPreset = (code: string) => {
    setSelectedPlanCode(code);
    const plan = plans.find((p) => p.code === code);
    if (!plan || !config) return;

    const planMods = new Set(plan.modules);
    const planScrs = new Set(plan.screens);

    const newMods: Record<string, boolean> = {};
    const newScrs: Record<string, boolean> = {};

    for (const m of config.modules) {
      newMods[m.key] = planMods.has(m.key);
      for (const s of m.screens) {
        newScrs[s.path] = planScrs.has(s.path);
      }
    }

    setEnabledModules(newMods);
    setEnabledScreens(newScrs);
    toast.info(`Switched to ${plan.name} preset`);
  };

  // Toggle master module switch
  const handleToggleModule = (moduleKey: string) => {
    const current = !!enabledModules[moduleKey];
    const next = !current;

    setEnabledModules((prev) => ({ ...prev, [moduleKey]: next }));

    // Cascade to all child screens
    if (config) {
      const mod = config.modules.find((m) => m.key === moduleKey);
      if (mod) {
        setEnabledScreens((prev) => {
          const updated = { ...prev };
          for (const s of mod.screens) {
            updated[s.path] = next;
          }
          return updated;
        });
      }
    }
  };

  // Toggle individual screen switch
  const handleToggleScreen = (moduleKey: string, screenPath: string) => {
    const current = !!enabledScreens[screenPath];
    const next = !current;

    setEnabledScreens((prev) => ({ ...prev, [screenPath]: next }));

    // If enabling a screen, make sure parent module is enabled
    if (next) {
      setEnabledModules((prev) => ({ ...prev, [moduleKey]: true }));
    }
  };

  // Toggle module accordion expansion
  const toggleAccordion = (moduleKey: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  // Save changes
  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const activeModuleKeys = Object.entries(enabledModules)
        .filter(([, enabled]) => enabled)
        .map(([k]) => k);

      const activeScreenPaths = Object.entries(enabledScreens)
        .filter(([, enabled]) => enabled)
        .map(([k]) => k);

      const updated = await subscriptionPlansApi.updateTenantPlanConfig(tenant.id, {
        plan_code: selectedPlanCode,
        enabled_modules: activeModuleKeys,
        enabled_screens: activeScreenPaths,
      });

      setConfig(updated);
      toast.success("Subscription plan and screen permissions updated successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Manage Subscription Plan &amp; Screen Access
            </h3>
            <p className="text-xs text-slate-500">
              {tenant ? `${tenant.name} (${tenant.subdomain}.cura.com)` : ""}
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          <p className="text-sm text-slate-500">Loading subscription details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Selection Header */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Select Base Plan
                </span>
                <p className="text-xs text-slate-600">
                  Choose a standard tier or custom plan preset to pre-fill features.
                </p>
              </div>

              {customPlans.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Custom:</span>
                  <select
                    value={selectedPlanCode}
                    onChange={(e) => handleSelectPlanPreset(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-sky-500"
                  >
                    <option value="" disabled>
                      Select Custom Plan...
                    </option>
                    {customPlans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Standard Plan Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {standardPlans.map((plan) => {
                const isSelected = selectedPlanCode === plan.code;
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => handleSelectPlanPreset(plan.code)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition relative ${
                      isSelected
                        ? "border-sky-500 bg-white shadow-sm ring-2 ring-sky-500/20"
                        : "border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {plan.name}
                      </span>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">
                      {plan.modules.length} modules enabled
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module & Screen Customization Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Feature Modules &amp; Screen Visibility
                </h4>
                <p className="text-xs text-slate-500">
                  Toggle entire modules or expand to decide exactly which screens hospital staff can see and access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectPlanPreset(selectedPlanCode)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Defaults
              </button>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {config?.modules.map((mod) => {
                const IconComponent = MODULE_ICONS[mod.key] || Layers;
                const isModEnabled = !!enabledModules[mod.key];
                const isExpanded = !!expandedModules[mod.key];
                const activeScreenCount = mod.screens.filter(
                  (s) => enabledScreens[s.path]
                ).length;

                return (
                  <div
                    key={mod.key}
                    className={`rounded-xl border transition ${
                      isModEnabled
                        ? "border-slate-200 bg-white shadow-xs"
                        : "border-slate-200/60 bg-slate-50/70 opacity-75"
                    }`}
                  >
                    {/* Module Header */}
                    <div className="flex items-center justify-between p-3.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                            isModEnabled
                              ? "bg-sky-50 text-sky-600 ring-1 ring-sky-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {mod.name}
                            </span>
                            {mod.is_core && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                Core
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-md">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Screen count badge */}
                        {mod.screens.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleAccordion(mod.key)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                          >
                            <span>
                              {activeScreenCount}/{mod.screens.length} screens
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </button>
                        )}

                        {/* Master Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isModEnabled}
                            onChange={() => handleToggleModule(mod.key)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* Accordion Screens List */}
                    {isExpanded && mod.screens.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 space-y-2 rounded-b-xl">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Configured Screens in {mod.name}:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mod.screens.map((screen) => {
                            const isScrEnabled = !!enabledScreens[screen.path];
                            return (
                              <div
                                key={screen.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border bg-white transition ${
                                  isScrEnabled
                                    ? "border-slate-200"
                                    : "border-slate-200/60 opacity-60"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-medium text-slate-800 truncate">
                                    {screen.label}
                                  </p>
                                  <code className="text-[10px] text-slate-400">
                                    {screen.path}
                                  </code>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isScrEnabled}
                                    onChange={() =>
                                      handleToggleScreen(mod.key, screen.path)
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:after after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:from-sky-600 hover:to-indigo-700 shadow-md transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving Plan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Plan &amp; Screen Access
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
