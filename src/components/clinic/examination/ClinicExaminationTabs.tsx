"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import clsx from "clsx";
import {
  useResolvedPanelComponents,
  type ResolvedPanelComponent,
} from "@/context/PanelConfigContext";
import type { ClinicComponentProps } from "@/components/clinic/panelRegistry";

interface ClinicExaminationTabsProps extends ClinicComponentProps {
  activeKey: string;
  onTabChange: (key: string) => void;
  /** Per-user hidden keys (layered under the tenant config). */
  userHiddenKeys?: string[];
}

/**
 * The clinic panel's tab strip + body, rendered FROM the resolved registry —
 * no hardcoded tab list, no `activeTab === "x" && <XTab/>` ladder. Hiding,
 * reordering or relabelling a component in /panel-config changes this strip
 * for every user of the tenant.
 */
export function ClinicExaminationTabs({
  activeKey,
  onTabChange,
  userHiddenKeys = [],
  ...componentProps
}: ClinicExaminationTabsProps) {
  const resolved = useResolvedPanelComponents();

  const visibleTabs = useMemo(
    () => resolved.filter((tab) => !userHiddenKeys.includes(tab.key)),
    [resolved, userHiddenKeys]
  );

  // Keep the active tab valid when config or user hiding changes
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.key === activeKey)) {
      onTabChange(visibleTabs[0].key);
    }
  }, [visibleTabs, activeKey, onTabChange]);

  // Horizontal scroll affordances (kept from ExaminationTabs)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollButtons);
    window.addEventListener("resize", checkScrollButtons);
    return () => {
      el.removeEventListener("scroll", checkScrollButtons);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [visibleTabs.length]);

  const scrollTabs = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  const active: ResolvedPanelComponent | undefined = visibleTabs.find(
    (tab) => tab.key === activeKey
  );

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No sections enabled</p>
          <p className="mt-1 text-xs text-slate-400">
            An administrator can enable sections in Panel Configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab strip */}
      <div className="relative flex items-center border-b border-slate-200 bg-slate-50/60">
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs("left")}
            className="absolute left-0 z-10 h-full bg-gradient-to-r from-slate-50 to-transparent px-1"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-1 overflow-x-auto px-2 py-1.5"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={clsx(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  activeKey === tab.key
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/70"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.resolvedLabel}
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scrollTabs("right")}
            className="absolute right-0 z-10 h-full bg-gradient-to-l from-slate-50 to-transparent px-1"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Tab body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {active ? <active.Component {...componentProps} /> : null}
      </div>
    </div>
  );
}
