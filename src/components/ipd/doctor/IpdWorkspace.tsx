"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  BedDouble,
  Pill,
  Clock,
  ClipboardList,
  FileText,
  Activity,
  FlaskConical,
  Stethoscope,
  HeartHandshake,
  RefreshCw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { IpdAdmittedPatient, IpdPatientChart } from "@/types/ipdDoctor";
import { IpdPatientList } from "./IpdPatientList";
import { IpdPatientHeader } from "./IpdPatientHeader";
import { IpdMedicationsTab } from "./IpdMedicationsTab";
import { IpdNursingMarTab } from "./IpdNursingMarTab";
import { IpdOrdersTab } from "./IpdOrdersTab";
import { IpdProgressNotesTab } from "./IpdProgressNotesTab";
import { IpdVitalsTab } from "./IpdVitalsTab";
import { IpdInvestigationsTab } from "./IpdInvestigationsTab";
import { IpdDischargeSummaryModal } from "./IpdDischargeSummaryModal";
import { toast } from "sonner";

import { usePermissions } from "@/hooks/usePermissions";

type TabKey = "medications" | "mar" | "orders" | "progress_notes" | "vitals" | "investigations";

export function IpdWorkspace() {
  const searchParams = useSearchParams();
  const admissionIdParam = searchParams.get("admission_id");

  // Auth and Role Detection
  const { userRole: permissionsRole } = usePermissions();
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const rawRole = typeof window !== "undefined" ? (localStorage.getItem("role") || localStorage.getItem("user_role")) : null;
  const userRole = (permissionsRole || rawRole || "").toLowerCase();
  const isDoctor = userRole === "doctor";
  const workspaceMode: "doctor" | "nursing" = isDoctor ? "doctor" : "nursing";
  const doctors = useAppSelector((state) => state.doctors.list);
  const currentDoctor = doctors.find((d) => d.user_id === userId);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>(
    isDoctor ? "medications" : "mar"
  );

  // Data state
  const [patients, setPatients] = useState<IpdAdmittedPatient[]>([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "discharged">("active");
  const [chart, setChart] = useState<IpdPatientChart | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile active subview: "queue" (patient list) vs "chart" (active patient clinical chart)
  const [mobileView, setMobileView] = useState<"queue" | "chart">("queue");

  // Fetch admitted or discharged patients
  const fetchPatients = useCallback(async (targetStatus?: "active" | "discharged") => {
    setLoadingPatients(true);
    try {
      const activeStatus = targetStatus || statusFilter;
      const list = await ipdDoctorApi.listAdmittedPatients({ status: activeStatus });
      setPatients(list);

      // Auto-select patient from query param or select first
      if (admissionIdParam && list.some((p) => p.admission_id === admissionIdParam)) {
        setSelectedAdmissionId(admissionIdParam);
        setMobileView("chart");
      } else if (list.length > 0) {
        if (!selectedAdmissionId || !list.some((p) => p.admission_id === selectedAdmissionId)) {
          const doctorPatient = list.find((p) => p.doctor_id === currentDoctor?.id);
          const autoSelected = doctorPatient ? doctorPatient.admission_id : list[0].admission_id;
          setSelectedAdmissionId(autoSelected);
        }
      } else {
        setSelectedAdmissionId(null);
        setChart(null);
      }
    } catch (err) {
      console.error("Failed to load patients", err);
      toast.error("Failed to load patient queue");
    } finally {
      setLoadingPatients(false);
    }
  }, [admissionIdParam, currentDoctor?.id, selectedAdmissionId, statusFilter]);

  const handleStatusFilterChange = (newStatus: "active" | "discharged") => {
    setStatusFilter(newStatus);
    fetchPatients(newStatus);
  };

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Fetch chart when patient selection changes
  const fetchChart = useCallback(async (admId: string) => {
    setLoadingChart(true);
    try {
      const data = await ipdDoctorApi.getPatientChart(admId);
      setChart(data);
    } catch (err) {
      console.error("Failed to load patient chart", err);
      toast.error("Failed to load patient clinical chart");
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAdmissionId) {
      fetchChart(selectedAdmissionId);
    }
  }, [selectedAdmissionId, fetchChart]);

  const handleSelectPatient = (admId: string) => {
    setSelectedAdmissionId(admId);
    // On mobile, navigate straight to the clinical chart
    setMobileView("chart");
  };

  const handleRefreshCurrentChart = () => {
    if (selectedAdmissionId) {
      fetchChart(selectedAdmissionId);
    }
    fetchPatients();
  };

  const selectedPatientObj = patients.find((p) => p.admission_id === selectedAdmissionId);

  interface WorkspaceTabItem {
    id: TabKey;
    label: string;
    icon: any;
    badge?: number;
  }

  // Tab definition
  const tabs: WorkspaceTabItem[] = useMemo(() => {
    const allTabs: WorkspaceTabItem[] = [
      {
        id: "medications",
        label: "Medications",
        icon: Pill,
        badge: chart?.active_medications.length,
      },
      {
        id: "mar",
        label: "MAR (Admin)",
        icon: Clock,
        badge: chart?.mar_timeline.length,
      },
      {
        id: "orders",
        label: "Doctor Orders",
        icon: ClipboardList,
        badge: chart?.orders.filter((o) => o.status === "active").length,
      },
      {
        id: "progress_notes",
        label: "Progress Notes",
        icon: FileText,
        badge: chart?.progress_notes.length,
      },
      {
        id: "vitals",
        label: "Vitals & Trends",
        icon: Activity,
        badge: chart?.vitals.length,
      },
      {
        id: "investigations",
        label: "Investigations",
        icon: FlaskConical,
        badge: chart?.lab_bookings.length,
      },
    ];

    if (workspaceMode === "nursing") {
      const nursingKeys: TabKey[] = ["mar", "vitals", "progress_notes", "orders", "investigations"];
      return nursingKeys
        .map((k) => allTabs.find((t) => t.id === k))
        .filter((t): t is WorkspaceTabItem => Boolean(t));
    }
    const doctorKeys: TabKey[] = ["medications", "orders", "progress_notes", "vitals", "investigations", "mar"];
    return doctorKeys
      .map((k) => allTabs.find((t) => t.id === k))
      .filter((t): t is WorkspaceTabItem => Boolean(t));
  }, [workspaceMode, chart]);


  // Keep activeTab valid within available tabs
  useEffect(() => {
    if (!tabs.some((t: WorkspaceTabItem) => t.id === activeTab)) {
      if (tabs.length > 0) {
        setActiveTab(tabs[0].id);
      }
    }
  }, [tabs, activeTab]);

  return (
    <div className="space-y-3 pb-8 max-w-full overflow-hidden">
      {/* Top Workspace Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-md">
            <BedDouble className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {workspaceMode === "nursing" ? "IPD Nursing Station" : "IPD Doctor Workspace"}
              </h1>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 shrink-0">
                {patients.length} Patients
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              {workspaceMode === "doctor"
                ? currentDoctor
                  ? `${currentDoctor.name} • ${currentDoctor.specialization || "Inpatient Care"}`
                  : "Doctor Clinical Station"
                : "Nursing & Examiner Station • Inpatient Care"}
            </p>
          </div>
        </div>

        {/* Header Actions (Refresh) */}
        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button
            onClick={() => fetchPatients()}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs shrink-0 cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Switcher Tab (Only visible on screens < lg) */}
      <div className="flex lg:hidden rounded-xl bg-slate-100 p-1 text-xs font-bold shadow-2xs">
        <button
          onClick={() => setMobileView("queue")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
            mobileView === "queue"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BedDouble className="h-4 w-4" />
          <span>Patient Queue ({patients.length})</span>
        </button>
        <button
          onClick={() => setMobileView("chart")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
            mobileView === "chart"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span className="truncate">
            {selectedPatientObj ? selectedPatientObj.patient_name.split(" ")[0] : "Chart"}
          </span>
        </button>
      </div>

      {/* Mobile back link if in chart view */}
      {mobileView === "chart" && (
        <div className="flex lg:hidden items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-xs">
          <button
            onClick={() => setMobileView("queue")}
            className="flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Switch Patient ({patients.length} available)</span>
          </button>
          {selectedPatientObj && (
            <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[160px]">
              🛏️ {selectedPatientObj.ward_name ? `${selectedPatientObj.ward_name}/` : ""}{selectedPatientObj.bed_number || "No Bed"}
            </span>
          )}
        </div>
      )}

      {/* Main Workspace Layout (Sidebar + Chart) */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Left Admitted Patient Queue */}
        <div
          className={`transition-all duration-200 ${
            // Mobile visibility: hide if mobileView === 'chart'
            mobileView === "chart" ? "hidden lg:block" : "col-span-12"
          } ${
            sidebarCollapsed
              ? "lg:col-span-1"
              : "lg:col-span-4 xl:col-span-3"
          }`}
        >
          {sidebarCollapsed ? (
            <div className="hidden lg:flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-4">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                title="Expand patient queue"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="[writing-mode:vertical-lr] font-bold text-xs text-slate-600 tracking-wider">
                ADMITTED PATIENTS ({patients.length})
              </span>
            </div>
          ) : (
            <div className="relative">
              <IpdPatientList
                patients={patients}
                selectedAdmissionId={selectedAdmissionId}
                onSelectPatient={handleSelectPatient}
                currentDoctorId={currentDoctor?.id || null}
                statusFilter={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                loading={loadingPatients}
              />
            </div>
          )}
        </div>

        {/* Right Patient Clinical Chart Workspace */}
        <div
          className={`space-y-3 sm:space-y-4 transition-all duration-200 ${
            // Mobile visibility: hide if mobileView === 'queue'
            mobileView === "queue" ? "hidden lg:block" : "col-span-12"
          } ${
            sidebarCollapsed
              ? "lg:col-span-11"
              : "lg:col-span-8 xl:col-span-9"
          }`}
        >
          {loadingChart && !chart ? (
            <div className="flex min-h-[40vh] sm:min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
              <div className="text-center space-y-3">
                <div className="h-10 w-10 mx-auto animate-spin rounded-full border-3 border-slate-200 border-t-sky-600" />
                <p className="text-xs font-semibold text-slate-600">Loading patient chart...</p>
              </div>
            </div>
          ) : !chart ? (
            <div className="flex min-h-[40vh] sm:min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
              <div className="space-y-2">
                <BedDouble className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="text-base font-bold text-slate-900">No Patient Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select an admitted patient from the patient queue to open their clinical chart.
                </p>
                <button
                  onClick={() => setMobileView("queue")}
                  className="mt-3 lg:hidden inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm"
                >
                  <BedDouble className="h-4 w-4" />
                  <span>Open Patient Queue</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Patient Banner */}
              <IpdPatientHeader
                chart={chart}
                onRefresh={handleRefreshCurrentChart}
                onOpenDischargeSummary={() => setShowDischargeModal(true)}
                loading={loadingChart}
                isDoctor={isDoctor}
              />

              {/* Discharged Read-Only Notice Banner */}
              {chart && ["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:px-4 sm:py-3 text-xs text-slate-700 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Discharged Patient Clinical Chart (Read-Only Mode)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        This patient has been discharged. All medication orders, administrations, clinical orders, and vitals are archived for record review only.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDischargeModal(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 font-bold text-sky-700 hover:bg-sky-50 transition shadow-2xs self-start sm:self-auto cursor-pointer"
                  >
                    <span>View Discharge Summary</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Chart Tabs Navigation */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 sm:p-2 shadow-xs text-xs scrollbar-none">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-bold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-700 font-semibold"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Display */}
              <div>
                {activeTab === "medications" && (
                  <IpdMedicationsTab
                    admissionId={chart.admission.id}
                    activeMedications={chart.active_medications}
                    discontinuedMedications={chart.discontinued_medications}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                    isDoctor={isDoctor}
                  />
                )}

                {activeTab === "mar" && (
                  <IpdNursingMarTab
                    admissionId={chart.admission.id}
                    activeMedications={chart.active_medications}
                    marTimeline={chart.mar_timeline}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                  />
                )}

                {activeTab === "orders" && (
                  <IpdOrdersTab
                    admissionId={chart.admission.id}
                    patientId={chart.patient.id}
                    doctorId={chart.admission.doctor_id || currentDoctor?.id}
                    orders={chart.orders}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                    isDoctor={isDoctor}
                  />
                )}

                {activeTab === "progress_notes" && (
                  <IpdProgressNotesTab
                    admissionId={chart.admission.id}
                    progressNotes={chart.progress_notes}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                    isDoctor={isDoctor}
                  />
                )}

                {activeTab === "vitals" && (
                  <IpdVitalsTab
                    patientId={chart.patient.id}
                    admissionId={chart.admission.id}
                    vitals={chart.vitals}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                  />
                )}

                {activeTab === "investigations" && (
                  <IpdInvestigationsTab
                    patientId={chart.patient.id}
                    admissionId={chart.admission.id}
                    labBookings={chart.lab_bookings}
                    orders={chart.orders}
                    onRefresh={handleRefreshCurrentChart}
                    isDischarged={["DISCHARGED", "discharged", "CANCELLED", "cancelled"].includes(chart.admission.status)}
                    isDoctor={isDoctor}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Populated Discharge Summary Modal */}
      {selectedAdmissionId && (
        <IpdDischargeSummaryModal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          admissionId={selectedAdmissionId}
          isDoctor={isDoctor}
          onSuccess={() => {
            setShowDischargeModal(false);
            handleRefreshCurrentChart();
          }}
        />
      )}
    </div>
  );
}
