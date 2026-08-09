"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, RotateCcw, Save, Tag } from "lucide-react";
import clsx from "clsx";
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
} from "@dnd-kit/sortable";
import { SortableRow } from "@/components/screens/SortableRow";
import { usePanelConfig, useTenantLabelsQuery } from "@/hooks/usePanelConfig";
import { CLINIC_PANEL_COMPONENTS } from "@/components/clinic/panelRegistry";
import { DEFAULT_STATUS_LABELS } from "@/utils/clinicQueueFilters";
import type { LabelOverrideItem } from "@/services/panelConfigApi";

type EditableComponent = {
  component_key: string;
  label: string; // registry default, shown as placeholder
  is_visible: boolean;
  display_order: number;
  label_override: string;
};

const ROLES: Array<{ key: "examiner" | "doctor"; label: string }> = [
  { key: "examiner", label: "Examiner" },
  { key: "doctor", label: "Doctor" },
];

// Statuses a tenant is likely to want to rename (the general pipeline's own).
const RENAMEABLE_STATUSES = [
  "awaiting_examiner",
  "examiner_assigned",
  "examination_in_progress",
  "examination_completed",
  "awaiting_doctor",
  "doctor_assigned",
  "consultation_in_progress",
  "consultation_completed",
  "no_show",
];

function buildEditable(
  configComponents: Array<{
    component_key: string;
    is_visible: boolean;
    display_order: number;
    label_override: string | null;
  }>,
  role: "examiner" | "doctor"
): EditableComponent[] {
  const overrides = new Map(configComponents.map((c) => [c.component_key, c]));
  return CLINIC_PANEL_COMPONENTS.filter(
    (def) => def.defaultRoles.includes(role) || overrides.has(def.key)
  )
    .map((def) => {
      const o = overrides.get(def.key);
      return {
        component_key: def.key,
        label: def.label,
        is_visible: o?.is_visible ?? def.defaultVisible,
        display_order: o?.display_order ?? def.defaultOrder,
        label_override: o?.label_override ?? "",
      };
    })
    .sort((a, b) => a.display_order - b.display_order);
}

function RoleComponentsEditor({ role }: { role: "examiner" | "doctor" }) {
  const { config, isLoading, saveComponents, isSaving, resetConfig, isResetting } =
    usePanelConfig("clinic_panel", role);
  const [rows, setRows] = useState<EditableComponent[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setRows(buildEditable(config.components, role));
      setDirty(false);
    }
  }, [config, role]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((prev) => {
        const oldIndex = prev.findIndex((r) => r.component_key === active.id);
        const newIndex = prev.findIndex((r) => r.component_key === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setDirty(true);
    }
  };

  const updateRow = (key: string, patch: Partial<EditableComponent>) => {
    setRows((prev) => prev.map((r) => (r.component_key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const handleSave = () => {
    saveComponents({
      targetRole: role,
      components: rows.map((row, index) => ({
        component_key: row.component_key,
        is_visible: row.is_visible,
        display_order: (index + 1) * 10,
        label_override: row.label_override.trim() || null,
      })),
    });
    setDirty(false);
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Drag to reorder · toggle to show/hide · type to rename. Applies to every{" "}
          {role} in this hospital.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => resetConfig(role)}
            disabled={isResetting}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="w-10" />
                <th className="px-4 py-3 text-left">Component</th>
                <th className="px-4 py-3 text-left">Custom label</th>
                <th className="px-4 py-3 text-center">Visible</th>
              </tr>
            </thead>
            <SortableContext
              items={rows.map((r) => r.component_key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <SortableRow key={row.component_key} id={row.component_key}>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.label_override}
                        placeholder={row.label}
                        onChange={(e) =>
                          updateRow(row.component_key, { label_override: e.target.value })
                        }
                        className="w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-sky-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          updateRow(row.component_key, { is_visible: !row.is_visible })
                        }
                        className={clsx(
                          "rounded-lg p-1.5 transition",
                          row.is_visible
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-300 hover:bg-slate-100"
                        )}
                        title={row.is_visible ? "Visible — click to hide" : "Hidden — click to show"}
                      >
                        {row.is_visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </SortableRow>
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

function LabelOverridesEditor() {
  const { labels, isLoading, saveLabels, isSavingLabels } = useTenantLabelsQuery();
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [statusEdits, setStatusEdits] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const effectiveRoleLabel = (key: string) =>
    roleEdits[key] ?? labels?.labels?.role?.[key] ?? key;
  const effectiveStatusLabel = (key: string) =>
    statusEdits[key] ?? labels?.labels?.visit_status?.[key] ?? DEFAULT_STATUS_LABELS[key] ?? key;

  const handleSave = () => {
    const overrides: LabelOverrideItem[] = [
      ...Object.entries(roleEdits)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => ({
          label_scope: "role" as const,
          label_key: key,
          label: value.trim(),
        })),
      ...Object.entries(statusEdits)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => ({
          label_scope: "visit_status" as const,
          label_key: key,
          label: value.trim(),
        })),
    ];
    if (overrides.length === 0) return;
    saveLabels(overrides);
    setRoleEdits({});
    setStatusEdits({});
    setDirty(false);
  };

  if (isLoading && !labels) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Rename what roles and visit statuses are called everywhere in this hospital&apos;s
          panels — e.g. call the examiner &quot;Nurse&quot; and &quot;Awaiting Examiner&quot;
          &quot;Waiting for Vitals&quot;.
        </p>
        <button
          onClick={handleSave}
          disabled={!dirty || isSavingLabels}
          className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {isSavingLabels ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save labels
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Role names */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Tag className="h-3.5 w-3.5" /> Role names
          </h3>
          <div className="space-y-2">
            {["examiner", "doctor"].map((roleKey) => (
              <div key={roleKey} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium capitalize text-slate-600">
                  {roleKey}
                </span>
                <input
                  type="text"
                  value={effectiveRoleLabel(roleKey)}
                  onChange={(e) => {
                    setRoleEdits((prev) => ({ ...prev, [roleKey]: e.target.value }));
                    setDirty(true);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Status labels */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Tag className="h-3.5 w-3.5" /> Visit status labels
          </h3>
          <div className="space-y-2">
            {RENAMEABLE_STATUSES.map((statusKey) => (
              <div key={statusKey} className="flex items-center gap-3">
                <span className="w-44 truncate text-xs font-mono text-slate-500">
                  {statusKey}
                </span>
                <input
                  type="text"
                  value={effectiveStatusLabel(statusKey)}
                  onChange={(e) => {
                    setStatusEdits((prev) => ({ ...prev, [statusKey]: e.target.value }));
                    setDirty(true);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PanelConfigPage() {
  const [activeRole, setActiveRole] = useState<"examiner" | "doctor">("examiner");
  const [activeSection, setActiveSection] = useState<"components" | "labels">("components");

  const roleTabs = useMemo(() => ROLES, []);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel Configuration</h1>
        <p className="text-slate-500">
          Configure which sections each role sees on the clinic panel, their order and labels —
          and rename roles and visit statuses for this hospital.
        </p>
      </div>

      {/* Section switcher */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
        <button
          onClick={() => setActiveSection("components")}
          className={clsx(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition",
            activeSection === "components"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          Panel Components
        </button>
        <button
          onClick={() => setActiveSection("labels")}
          className={clsx(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition",
            activeSection === "labels"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          Names &amp; Labels
        </button>
      </div>

      {activeSection === "components" ? (
        <div className="space-y-3">
          <div className="flex gap-1">
            {roleTabs.map((roleTab) => (
              <button
                key={roleTab.key}
                onClick={() => setActiveRole(roleTab.key)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  activeRole === roleTab.key
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                )}
              >
                {roleTab.label}
              </button>
            ))}
          </div>
          <RoleComponentsEditor key={activeRole} role={activeRole} />
        </div>
      ) : (
        <LabelOverridesEditor />
      )}
    </div>
  );
}
