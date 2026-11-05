"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  RotateCcw,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  Columns,
  Sparkles,
  LayoutDashboard,
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
import { DashboardWidgetConfigItem } from "@/services/dashboardConfigApi";
import { WIDGET_REGISTRY } from "./widgets/WidgetRegistry";
import { usePermissions } from "@/hooks/usePermissions";
import clsx from "clsx";

interface DashboardCustomizerProps {
  open: boolean;
  onClose: () => void;
  configuredWidgets: DashboardWidgetConfigItem[];
  onSave: (widgets: DashboardWidgetConfigItem[]) => void;
  onReset: () => Promise<void>;
  scope?: string;
  hasTenantOverride?: boolean;
}

function SortableWidgetItem({
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
        "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
        widget.is_visible
          ? "border-slate-200/90 bg-white shadow-2xs"
          : "border-dashed border-slate-200 bg-slate-50/60 opacity-60",
        isDragging && "shadow-lg border-sky-400 bg-sky-50/50"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
            {def?.name || widget.widget_key}
          </p>
          <p className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[180px]">
            {def?.description || ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Column Width Selector */}
        {widget.is_visible && (
          <select
            value={widget.col_span}
            onChange={(e) => onChangeSpan(widget.widget_key, Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-sky-500"
            title="Widget width"
          >
            <option value={1}>1 Col (1x)</option>
            <option value={2}>2 Col (2x)</option>
            <option value={3}>3 Col (3x)</option>
            <option value={4}>4 Col (Full)</option>
          </select>
        )}

        {/* Height / Row Span Selector */}
        {widget.is_visible && (
          <select
            value={widget.row_span || 1}
            onChange={(e) => onChangeRowSpan(widget.widget_key, Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-sky-500"
            title="Widget height"
          >
            <option value={1}>1x Height</option>
            <option value={2}>2x Height</option>
            <option value={3}>3x Height</option>
            <option value={4}>4x Height</option>
          </select>
        )}

        {/* Toggle Visibility */}
        <button
          type="button"
          onClick={() => onToggle(widget.widget_key)}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
            widget.is_visible
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200"
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

export function DashboardCustomizer({
  open,
  onClose,
  configuredWidgets,
  onSave,
  onReset,
  scope,
  hasTenantOverride,
}: DashboardCustomizerProps) {
  const { hasAccess, userRole } = usePermissions();
  const [items, setItems] = useState<DashboardWidgetConfigItem[]>([]);

  const canAccessDashboardConfig =
    hasAccess("/dashboard-config") ||
    userRole === "admin" ||
    userRole === "platform_owner";

  useEffect(() => {
    if (open) {
      // Ensure all registered widgets that are permitted exist in the editor
      const existingKeys = new Set(configuredWidgets.map((w) => w.widget_key));
      const fullList = [...configuredWidgets];

      Object.keys(WIDGET_REGISTRY).forEach((key) => {
        const def = WIDGET_REGISTRY[key];
        const isPermitted =
          !def.requiredScreens ||
          def.requiredScreens.length === 0 ||
          def.requiredScreens.some((path) => hasAccess(path));

        if (isPermitted && !existingKeys.has(key)) {
          fullList.push({
            widget_key: key,
            is_visible: true,
            display_order: fullList.length * 10,
            col_span: def.defaultColSpan,
            row_span: def.defaultRowSpan || 1,
          });
        }
      });

      // Filter only permitted widgets for the current tenant
      const permittedOnly = fullList.filter((w) => {
        const def = WIDGET_REGISTRY[w.widget_key];
        if (!def) return false;
        return (
          !def.requiredScreens ||
          def.requiredScreens.length === 0 ||
          def.requiredScreens.some((path) => hasAccess(path))
        );
      });

      setItems(permittedOnly);
    }
  }, [open, configuredWidgets, hasAccess]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
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
    setItems((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, is_visible: !w.is_visible } : w))
    );
  };

  const handleChangeSpan = (key: string, span: number) => {
    setItems((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, col_span: span } : w))
    );
  };

  const handleChangeRowSpan = (key: string, rowSpan: number) => {
    setItems((curr) =>
      curr.map((w) => (w.widget_key === key ? { ...w, row_span: rowSpan } : w))
    );
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Customize My Dashboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag to reorder, toggle visibility, and adjust widths &amp; heights
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Admin/Platform Owner Shortcut to Hospital-wide Settings */}
        {canAccessDashboardConfig && (
          <div className="border-b border-sky-100 bg-sky-50/70 px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-sky-900">
              <LayoutDashboard className="h-4 w-4 text-sky-600 shrink-0" />
              <span>Configure hospital & role defaults</span>
            </div>
            <Link
              href="/dashboard-config"
              onClick={onClose}
              className="font-semibold text-sky-700 hover:text-sky-900 hover:underline shrink-0"
            >
              Dashboard Settings &rarr;
            </Link>
          </div>
        )}

        {/* Content - Sortable List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.widget_key)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((widget) => (
                <SortableWidgetItem
                  key={widget.widget_key}
                  widget={widget}
                  onToggle={handleToggle}
                  onChangeSpan={handleChangeSpan}
                  onChangeRowSpan={handleChangeRowSpan}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <button
            type="button"
            onClick={async () => {
              await onReset();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-100 hover:bg-sky-600 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
