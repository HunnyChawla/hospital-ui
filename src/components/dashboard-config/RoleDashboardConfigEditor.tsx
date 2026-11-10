"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  dashboardConfigApi,
  DashboardWidgetConfigItem,
  DashboardConfigResponse,
} from "@/services/dashboardConfigApi";
import { WIDGET_REGISTRY } from "@/components/dashboard/widgets/WidgetRegistry";
import { usePermissions } from "@/hooks/usePermissions";
import { tenantsApi, Tenant } from "@/services/tenantsApi";
import {
  RotateCcw,
  Save,
  Building2,
  Shield,
  Eye,
  EyeOff,
  GripVertical,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import clsx from "clsx";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "doctor", label: "Doctor" },
  { key: "receptionist", label: "Receptionist" },
  { key: "nurse", label: "Nurse" },
  { key: "lab_technician", label: "Lab Technician" },
  { key: "optometrist", label: "Optometrist" },
  { key: "counsellor", label: "Counsellor" },
  { key: "examiner", label: "Examiner" },
];

function SortableAdminRow({
  widget,
  onToggle,
  onChangeSpan,
  onChangeRowSpan,
}: {
  widget: DashboardWidgetConfigItem;
  onToggle: (key: string) => void;
  onChangeSpan: (key: string, span: number) => void;
  onChangeRowSpan: (key: string, rowSpan: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.widget_key });

  const def = WIDGET_REGISTRY[widget.widget_key];
  const Icon = def?.icon || Sparkles;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center justify-between gap-3 rounded-xl border p-3 sm:p-3.5 transition-colors",
        widget.is_visible
          ? "border-slate-200/90 bg-white shadow-2xs"
          : "border-dashed border-slate-200 bg-slate-50/50 opacity-60",
        isDragging && "shadow-lg border-sky-400 bg-sky-50/50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-slate-600 rounded touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {def?.name || widget.widget_key}
          </p>
          <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
            {def?.description || ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Width Span */}
        {widget.is_visible && (
          <select
            value={widget.col_span}
            onChange={(e) => onChangeSpan(widget.widget_key, Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-sky-500"
            title="Widget width"
          >
            <option value={1}>1 Column (1x)</option>
            <option value={2}>2 Columns (2x)</option>
            <option value={3}>3 Columns (3x)</option>
            <option value={4}>4 Columns (Full)</option>
          </select>
        )}

        {/* Height Span */}
        {widget.is_visible && (
          <select
            value={widget.row_span || 1}
            onChange={(e) => onChangeRowSpan(widget.widget_key, Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-sky-500"
            title="Widget height"
          >
            <option value={1}>1x Height</option>
            <option value={2}>2x Height</option>
            <option value={3}>3x Height</option>
            <option value={4}>4x Height</option>
          </select>
        )}

        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => onToggle(widget.widget_key)}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
            widget.is_visible
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
          )}
        >
          {widget.is_visible ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function RoleDashboardConfigEditor() {
  const { isPlatformOwner } = usePermissions();
  const callerTenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "" : "";

  // Scope: 'global' (platform default) or 'tenant' (tenant override)
  const [scope, setScope] = useState<"global" | "tenant">(
    isPlatformOwner ? "global" : "tenant"
  );
  const [selectedTenantId, setSelectedTenantId] = useState<string>(callerTenantId);
  const [selectedRole, setSelectedRole] = useState<string>("doctor");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentConfig, setCurrentConfig] = useState<DashboardConfigResponse | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgetConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load tenants list if platform owner
  useEffect(() => {
    if (isPlatformOwner) {
      tenantsApi.list({ page: 1, page_size: 100 }).then((res) => {
        const items = res.items || [];
        setTenants(items);
        setSelectedTenantId((prev) => (prev ? prev : (items.length > 0 ? items[0].id : "")));
      }).catch(console.error);
    }
  }, [isPlatformOwner]);

  // Load configuration for selected scope & role
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const targetTenant = scope === "tenant" ? selectedTenantId || callerTenantId : null;
      const res = await dashboardConfigApi.getAdminConfig(selectedRole, targetTenant);
      setCurrentConfig(res);

      // Merge with any registered widgets not in current response
      const existingKeys = new Set(res.widgets.map((w) => w.widget_key));
      const fullList = [...res.widgets];

      Object.keys(WIDGET_REGISTRY).forEach((key) => {
        if (!existingKeys.has(key)) {
          fullList.push({
            widget_key: key,
            is_visible: false,
            display_order: fullList.length * 10,
            col_span: WIDGET_REGISTRY[key].defaultColSpan,
            row_span: WIDGET_REGISTRY[key].defaultRowSpan || 1,
          });
        }
      });

      setWidgets(fullList);
    } catch (err) {
      console.error("Failed to load dashboard config:", err);
      toast.error("Failed to load role configuration");
    } finally {
      setLoading(false);
    }
  }, [scope, selectedTenantId, callerTenantId, selectedRole]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((currentItems) => {
        const oldIndex = currentItems.findIndex((i) => i.widget_key === active.id);
        const newIndex = currentItems.findIndex((i) => i.widget_key === over.id);
        const reordered = arrayMove(currentItems, oldIndex, newIndex);
        return reordered.map((item, idx) => ({
          ...item,
          display_order: (idx + 1) * 10,
        }));
      });
    }
  };

  const handleToggle = (key: string) => {
    setWidgets((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, is_visible: !w.is_visible } : w))
    );
  };

  const handleChangeSpan = (key: string, span: number) => {
    setWidgets((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, col_span: span } : w))
    );
  };

  const handleChangeRowSpan = (key: string, rowSpan: number) => {
    setWidgets((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, row_span: rowSpan } : w))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetTenant = scope === "tenant" ? selectedTenantId || callerTenantId : null;
      await dashboardConfigApi.setAdminConfig({
        tenant_id: targetTenant,
        role: selectedRole,
        widgets,
      });
      toast.success(
        scope === "global"
          ? `Global default saved for ${selectedRole}`
          : `Tenant override saved for ${selectedRole}`
      );
      await loadConfig();
    } catch (err: any) {
      console.error("Failed to save dashboard config:", err);
      toast.error(err.response?.data?.detail || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const targetTenant = scope === "tenant" ? selectedTenantId || callerTenantId : null;
      await dashboardConfigApi.resetAdminConfig(selectedRole, targetTenant);
      toast.success(
        scope === "tenant"
          ? "Reverted tenant override to global default"
          : "Reset global config to code defaults"
      );
      await loadConfig();
    } catch (err) {
      console.error("Failed to reset config:", err);
      toast.error("Failed to reset configuration");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Layers className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Dashboard Widget Configurator
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Configure which widgets appear by default for each role globally, or override per hospital.
            </p>
          </div>

          {/* Scope Switcher */}
          {isPlatformOwner && (
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setScope("global")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  scope === "global"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Shield className="h-3.5 w-3.5 text-sky-600" />
                <span>Global Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("tenant")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  scope === "tenant"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Hospital Override</span>
              </button>
            </div>
          )}
        </div>

        {/* Tenant Selector (if in Tenant Override mode) */}
        {scope === "tenant" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Hospital:</span>
              {isPlatformOwner ? (
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800">
                  Current Hospital
                </span>
              )}
            </div>

            {/* Status indicator */}
            <div>
              {currentConfig?.has_tenant_override ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Custom Hospital Override Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-semibold text-sky-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Inheriting from Global Defaults
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role Selection Tabs */}
      <div className="flex overflow-x-auto gap-1.5 border-b border-slate-200 pb-2 scrollbar-hide">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSelectedRole(r.key)}
            className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedRole === r.key
                ? "bg-sky-500 text-white shadow-xs shadow-sky-100"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Widget List Table / Sortable */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Widget Order & Visibility for {ROLES.find((r) => r.key === selectedRole)?.label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag handles to adjust positioning. Disabled widgets will not be rendered for this role.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {scope === "tenant" ? "Revert to Global" : "Reset to Code Defaults"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-8 text-center text-xs text-slate-400 animate-pulse">
            Loading configuration...
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((i) => i.widget_key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {widgets.map((widget) => (
                  <SortableAdminRow
                    key={widget.widget_key}
                    widget={widget}
                    onToggle={handleToggle}
                    onChangeSpan={handleChangeSpan}
                    onChangeRowSpan={handleChangeRowSpan}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
