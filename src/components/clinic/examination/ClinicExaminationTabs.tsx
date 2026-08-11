"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Circle,
  HeartPulse,
  MessageSquare,
  FileHeart,
  AlertTriangle,
  History,
  FlaskConical,
} from "lucide-react";
import clsx from "clsx";
import { useExaminationViewPreference } from "@/hooks/useExaminationViewPreference";
import { SingleViewSection } from "@/components/optometrist/patient-examination/SingleViewSection";
import {
  useResolvedPanelComponents,
  type ResolvedPanelComponent,
} from "@/context/PanelConfigContext";
import type { ClinicComponentProps } from "@/components/clinic/panelRegistry";
import { useClinicalRecords } from "@/hooks/useClinicalRecords";
import { usePatientDetails } from "@/hooks/usePatientDetails";
import { labBookingsApi } from "@/services/labBookingsApi";
import {
  CompactDataSummary,
  ComplaintsSummary,
  MedicalHistorySummary,
  DrugAllergiesSummary,
  HistorySummary,
} from "@/components/optometrist/patient-examination/CompactDataSummary";
import { DataEditModal } from "@/components/optometrist/patient-examination/DataEditModal";

interface ClinicExaminationTabsProps extends ClinicComponentProps {
  activeKey: string;
  onTabChange: (key: string) => void;
  /** Per-user hidden keys (layered under the tenant config). */
  userHiddenKeys?: string[];
}

const sectionConfigs: Record<
  string,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    colorScheme: "sky" | "emerald" | "amber" | "purple" | "rose" | "blue" | "green" | "violet";
    modalSize: "md" | "lg" | "xl" | "full";
  }
> = {
  vitals: { title: "Vitals", icon: HeartPulse, colorScheme: "rose", modalSize: "lg" },
  chief_complaint: { title: "Chief Complaints", icon: MessageSquare, colorScheme: "sky", modalSize: "lg" },
  medical_history: { title: "Medical History", icon: FileHeart, colorScheme: "purple", modalSize: "xl" },
  drug_allergies: { title: "Drug Allergies", icon: AlertTriangle, colorScheme: "rose", modalSize: "lg" },
  previous_history: { title: "Previous Visits", icon: History, colorScheme: "emerald", modalSize: "xl" },
  lab_results: { title: "Lab Results", icon: FlaskConical, colorScheme: "emerald", modalSize: "lg" },
};

// Vitals Summary
export function VitalsSummary({ record }: { record: any }) {
  if (!record) return null;
  const items = [];
  if (record.systolic_bp && record.diastolic_bp) {
    items.push(`BP: ${record.systolic_bp}/${record.diastolic_bp} mmHg`);
  }
  if (record.pulse_rate) {
    items.push(`Pulse: ${record.pulse_rate} bpm`);
  }
  if (record.temperature) {
    items.push(`Temp: ${record.temperature}°F`);
  }
  if (record.spo2) {
    items.push(`SpO₂: ${record.spo2}%`);
  }
  if (record.weight) {
    items.push(`Weight: ${record.weight} kg`);
  }
  if (record.height) {
    items.push(`Height: ${record.height} cm`);
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-100"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// Lab Results Summary
export function LabResultsSummary({ bookings }: { bookings: any[] }) {
  if (!bookings || bookings.length === 0) return null;

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex flex-col gap-1.5 pl-2.5 border-l-2 border-teal-200">
        {bookings.slice(0, 3).map((b: any, index: number) => {
          const testName = b.test_name || b.name || "Lab Test";
          const status = b.status || "Pending";
          return (
            <div key={b.id || index} className="text-xs text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700 truncate max-w-[150px]">{testName}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                status.toLowerCase() === "completed"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Clinic History Summary
export function ClinicHistorySummary({ history }: { history: any }) {
  const rawEvents = Array.isArray(history?.events) ? (history.events as any[]) : [];
  if (rawEvents.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-1">
        No previous visit history found.
      </div>
    );
  }

  // Filter events that represent visits or consultations
  const visits = rawEvents.filter((e) => e.event_type === "visit" || e.event_type === "consultation" || e.type === "visit");
  const displayEvents = visits.length > 0 ? visits : rawEvents;

  return (
    <div className="space-y-1.5 py-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Events</p>
      <div className="flex flex-col gap-1.5 pl-2.5 border-l-2 border-teal-200">
        {displayEvents.slice(0, 3).map((e: any, index: number) => {
          const dateStr = e.timestamp || e.date
            ? new Date(e.timestamp || e.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Unknown Date";
          const title = e.title || e.event_type || "Visit";
          return (
            <div key={e.event_id || index} className="text-xs text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700 truncate max-w-[150px]">{title}</span>
              <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-bold shrink-0 font-mono">
                {dateStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const { viewMode, toggleSection, isSectionCollapsed } = useExaminationViewPreference();

  const visibleTabs = useMemo(
    () => resolved.filter((tab) => !userHiddenKeys.includes(tab.key)),
    [resolved, userHiddenKeys]
  );

  // Fetch clinical records for chief complaints, medical history, drug allergies
  const {
    complaints,
    medicalConditions,
    drugAllergies,
    refresh: refreshClinicalRecords,
  } = useClinicalRecords(componentProps.patientId, componentProps.visitId);

  // Fetch vitals and history using usePatientDetails hook
  const {
    vitalSigns,
    patientHistory,
    refreshVitals,
    refreshHistory,
  } = usePatientDetails({
    patientId: componentProps.patientId,
    autoFetch: true,
  });

  // Local state for lab bookings
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [labLoading, setLabLoading] = useState(false);

  const loadLabBookings = React.useCallback(async () => {
    if (!componentProps.patientId) return;
    setLabLoading(true);
    try {
      const response = await labBookingsApi.list({ patient_id: componentProps.patientId });
      setLabBookings(
        Array.isArray(response) ? response : ((response as { items?: any[] })?.items ?? [])
      );
    } catch {
      setLabBookings([]);
    } finally {
      setLabLoading(false);
    }
  }, [componentProps.patientId]);

  useEffect(() => {
    if (visibleTabs.some((t) => t.key === "lab_results")) {
      loadLabBookings();
    }
  }, [loadLabBookings, visibleTabs]);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleModalClose = () => {
    setActiveModal(null);
    // Refresh all clinical and patient data to ensure summary cards are updated
    refreshClinicalRecords();
    refreshVitals();
    refreshHistory();
    loadLabBookings();
  };

  const activeModalTab = useMemo(() => {
    return visibleTabs.find((t) => t.key === activeModal);
  }, [visibleTabs, activeModal]);

  const activeModalConfig = useMemo(() => {
    if (!activeModal) return null;
    return sectionConfigs[activeModal] || {
      title: activeModalTab?.resolvedLabel || "Edit Section",
      icon: activeModalTab?.icon || LayoutGrid,
      colorScheme: "sky" as const,
      modalSize: "lg" as const,
    };
  }, [activeModal, activeModalTab]);

  const sectionStatuses = useMemo(() => {
    const statuses: Record<string, "empty" | "partial" | "complete"> = {};

    visibleTabs.forEach((tab) => {
      if (tab.key === "vitals") {
        const latest = vitalSigns[0];
        const hasVitalsForVisit = latest && latest.visit_id === componentProps.visitId;
        statuses[tab.key] = hasVitalsForVisit
          ? "complete"
          : (vitalSigns.length > 0 ? "partial" : "empty");
      } else if (tab.key === "chief_complaint") {
        statuses[tab.key] = complaints.length > 0 ? "complete" : "empty";
      } else if (tab.key === "medical_history") {
        statuses[tab.key] = medicalConditions.length > 0 ? "complete" : "empty";
      } else if (tab.key === "drug_allergies") {
        statuses[tab.key] = drugAllergies.length > 0 ? "complete" : "empty";
      } else if (tab.key === "previous_history") {
        const rawEvents = Array.isArray(patientHistory?.events) ? patientHistory.events : [];
        statuses[tab.key] = rawEvents.length > 0 ? "complete" : "empty";
      } else if (tab.key === "lab_results") {
        statuses[tab.key] = labBookings.length > 0 ? "complete" : "empty";
      } else {
        statuses[tab.key] = "empty";
      }
    });

    return statuses;
  }, [visibleTabs, vitalSigns, complaints, medicalConditions, drugAllergies, patientHistory, labBookings, componentProps.visitId]);

  const completedCount = useMemo(() => {
    return visibleTabs.filter((tab) => sectionStatuses[tab.key] === "complete").length;
  }, [visibleTabs, sectionStatuses]);

  const progressPercent = useMemo(() => {
    return visibleTabs.length > 0
      ? Math.round((completedCount / visibleTabs.length) * 100)
      : 0;
  }, [completedCount, visibleTabs.length]);

  const getStatusText = (key: string): string | undefined => {
    switch (key) {
      case "vitals": {
        const latest = vitalSigns[0];
        if (!latest) return undefined;
        const items = [];
        if (latest.temperature) items.push(`${latest.temperature}°F`);
        if (latest.systolic_bp && latest.diastolic_bp) items.push(`${latest.systolic_bp}/${latest.diastolic_bp}`);
        if (latest.pulse_rate) items.push(`${latest.pulse_rate} bpm`);
        return items.length > 0 ? items.join(", ") : "Recorded";
      }
      case "chief_complaint":
        return complaints.length > 0
          ? `${complaints.length} item${complaints.length > 1 ? "s" : ""}`
          : undefined;
      case "medical_history":
        return medicalConditions.length > 0
          ? `${medicalConditions.length} condition${medicalConditions.length > 1 ? "s" : ""}`
          : undefined;
      case "drug_allergies":
        return drugAllergies.length > 0
          ? `${drugAllergies.length} item${drugAllergies.length > 1 ? "s" : ""}`
          : undefined;
      case "previous_history": {
        const rawEvents = Array.isArray(patientHistory?.events) ? patientHistory.events : [];
        return rawEvents.length > 0
          ? `${rawEvents.length} event${rawEvents.length > 1 ? "s" : ""}`
          : "No history";
      }
      case "lab_results":
        return labBookings.length > 0
          ? `${labBookings.length} booking${labBookings.length > 1 ? "s" : ""}`
          : undefined;
      default:
        return undefined;
    }
  };

  const getSummaryContent = (key: string) => {
    switch (key) {
      case "vitals":
        return <VitalsSummary record={vitalSigns[0]} />;
      case "chief_complaint":
        return <ComplaintsSummary complaints={complaints} />;
      case "medical_history":
        return <MedicalHistorySummary conditions={medicalConditions} />;
      case "drug_allergies":
        return <DrugAllergiesSummary allergies={drugAllergies} />;
      case "previous_history":
        return <ClinicHistorySummary history={patientHistory} />;
      case "lab_results":
        return <LabResultsSummary bookings={labBookings} />;
      default:
        return null;
    }
  };

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

  if (viewMode === "single") {
    return (
      <div className="space-y-6 pb-8 h-full overflow-y-auto px-4 py-3 scrollbar-hide">
        {/* Sticky Header with Quick Jump */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-50/95 via-sky-50/80 to-slate-50/95 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-3 mb-3 flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <a
              key={tab.key}
              href={`#section-${tab.key}`}
              className="bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 rounded-full px-2.5 py-1 text-xs font-medium transition-all shadow-sm"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`section-${tab.key}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {tab.resolvedLabel}
            </a>
          ))}
        </div>

        {visibleTabs.map((tab) => {
          const isExpanded = !isSectionCollapsed(tab.key);
          const Icon = tab.icon;

          return (
            <SingleViewSection
              key={tab.key}
              id={`section-${tab.key}`}
              title={tab.resolvedLabel}
              icon={<Icon className="h-5 w-5" />}
              status="complete"
              isExpanded={isExpanded}
              onToggle={() => toggleSection(tab.key)}
            >
              <div className="p-4">
                <tab.Component {...componentProps} />
              </div>
            </SingleViewSection>
          );
        })}
      </div>
    );
  }

  if (viewMode === "compact") {
    return (
      <div className="space-y-4 pb-8 h-full overflow-y-auto px-4 py-3 scrollbar-hide animate-in fade-in duration-300">
        {/* Progress Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Examination Progress</h2>
              <p className="text-xs text-slate-500">Track and fill all examination components</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-sky-600">{progressPercent}%</span>
              <span className="text-xs font-semibold text-slate-400">({completedCount}/{visibleTabs.length})</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Navigation */}
          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => {
              const status = sectionStatuses[tab.key];
              const isComplete = status === "complete";
              const isPartial = status === "partial";

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveModal(tab.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isComplete
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : isPartial
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  <span>{tab.resolvedLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {visibleTabs.map((tab) => {
            const status = sectionStatuses[tab.key];
            const config = sectionConfigs[tab.key] || {
              title: tab.resolvedLabel,
              icon: tab.icon || LayoutGrid,
              colorScheme: "sky" as const,
              modalSize: "lg" as const,
            };
            const SectionIcon = config.icon;

            return (
              <CompactDataSummary
                key={tab.key}
                id={tab.key}
                title={tab.resolvedLabel}
                icon={<SectionIcon className="h-5 w-5" />}
                status={status}
                statusText={getStatusText(tab.key)}
                summary={
                  tab.key === "previous_history"
                    ? getSummaryContent(tab.key)
                    : status !== "empty"
                    ? getSummaryContent(tab.key)
                    : undefined
                }
                onEdit={() => setActiveModal(tab.key)}
                colorScheme={config.colorScheme}
                buttonTextOverride={tab.key === "previous_history" ? "View" : undefined}
              />
            );
          })}
        </div>

        {/* Modal rendering */}
        {activeModalTab && activeModalConfig && (
          <DataEditModal
            isOpen={activeModal !== null}
            onClose={handleModalClose}
            title={activeModalConfig.title}
            icon={React.createElement(activeModalConfig.icon, { className: "h-5 w-5" })}
            colorScheme={activeModalConfig.colorScheme}
            size={activeModalConfig.modalSize}
          >
            <div className="p-1">
              <activeModalTab.Component {...componentProps} />
            </div>
          </DataEditModal>
        )}
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
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50/50 to-transparent p-2 sm:p-4">
        {active ? <active.Component {...componentProps} /> : null}
      </div>
    </div>
  );
}
