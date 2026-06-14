"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Heart,
  Plus,
  Trash2,
  Calendar,
  CheckSquare,
  IndianRupee,
  User,
  Info,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileText,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Check,
  AlertCircle,
  FilePlus2
} from "lucide-react";
import { dayCareApi } from "@/services/dayCareApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { otConsumablesApi, OTConsumable } from "@/services/otConsumablesApi";
import { diagnosesApi, Diagnosis } from "@/services/diagnosesApi";
import { advicesApi, Advice } from "@/services/advicesApi";
import { medicinesApi, Medicine } from "@/services/medicinesApi";
import { Combobox } from "@/components/common/Combobox";
import { Surgery } from "@/types";
import {
  DayCareVisit,
  DayCareStatus,
  DayCareClinicalAssessment,
  DayCarePreparationChecklist,
  DayCareOTRecord,
  DayCareRecoveryRecord,
  DayCareDischargeRecord,
  ConsumableItem,
  MonitoringEntry,
  DischargeMedicationItem,
  DischargeSummaryPrintResponse
} from "@/types/dayCare";
import { useReactToPrint } from "react-to-print";
import { DischargeSummaryPrint } from "./DischargeSummaryPrint";
import { PaymentCollectionModal } from "@/components/payments/PaymentCollectionModal";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { Payment } from "@/services/paymentsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DayCareWorkflowWizardProps {
  visitId: string;
}

type TabType = "billing" | "clinical" | "checklist" | "ot" | "recovery" | "discharge";

const DOSAGES = [
  "1 drop", "2 drops", "1 tablet", "2 tablets", "1 capsule", "5ml", "10ml", "Apply locally"
];

const FREQUENCIES = [
  "OD (1x)", "BD (2x)", "TID (3x)", "QID (4x)", "SOS (As needed)", "STAT (Immediately)", "1-0-0", "1-0-1", "1-1-1-1", "0-1-0", "0-0-1"
];

const DURATIONS = [
  "1 day", "3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "Until finished", "Continuous"
];

const MEDICINE_INSTRUCTIONS = [
  "Before food",
  "After food",
  "Empty stomach",
  "With water",
  "With milk",
  "At bedtime",
  "Instill 1 drop",
  "Instill 2 drops",
  "Apply locally",
  "Apply at night",
  "Apply morning and night",
  "Shake well before use",
];

const STAGES: { id: TabType; label: string; icon: React.ReactNode; defaultStatus: DayCareStatus[] }[] = [
  { id: "billing", label: "Admission & Check-in", icon: <IndianRupee className="h-4 w-4" />, defaultStatus: ["scheduled"] },
  { id: "clinical", label: "Pre-Assessment", icon: <Heart className="h-4 w-4" />, defaultStatus: ["checked_in"] },
  { id: "checklist", label: "OT Prep", icon: <ClipboardList className="h-4 w-4" />, defaultStatus: ["pre_assessment_completed"] },
  { id: "ot", label: "OT Procedure", icon: <FileText className="h-4 w-4" />, defaultStatus: ["ready_for_ot", "in_ot"] },
  { id: "recovery", label: "Recovery", icon: <Activity className="h-4 w-4" />, defaultStatus: ["recovery"] },
  { id: "discharge", label: "Discharge", icon: <User className="h-4 w-4" />, defaultStatus: ["discharged"] }
];

export function DayCareWorkflowWizard({ visitId }: DayCareWorkflowWizardProps) {
  const router = useRouter();
  const [visit, setVisit] = useState<DayCareVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("billing");
  const [availableSurgeries, setAvailableSurgeries] = useState<Surgery[]>([]);
  const [availableConsumables, setAvailableConsumables] = useState<OTConsumable[]>([]);
  const [availableDiagnoses, setAvailableDiagnoses] = useState<Diagnosis[]>([]);
  const [availableAdvices, setAvailableAdvices] = useState<Advice[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);

  // Sub-resource states
  const [clinical, setClinical] = useState<Partial<DayCareClinicalAssessment>>({});
  const [checklist, setChecklist] = useState<Partial<DayCarePreparationChecklist>>({});
  const [ot, setOt] = useState<Partial<DayCareOTRecord>>({});
  const [recovery, setRecovery] = useState<Partial<DayCareRecoveryRecord>>({});
  const [discharge, setDischarge] = useState<Partial<DayCareDischargeRecord>>({});

  // Form lists
  const [otConsumables, setOtConsumables] = useState<ConsumableItem[]>([]);
  const [recoveryVitals, setRecoveryVitals] = useState<MonitoringEntry[]>([]);
  const [dischargeAdvices, setDischargeAdvices] = useState<string[]>([]);
  const [newAdvice, setNewAdvice] = useState<string>("");
  const [newVital, setNewVital] = useState<Partial<MonitoringEntry>>({
    time: "",
    bp_systolic: 120,
    bp_diastolic: 80,
    pulse: 72,
    spo2: 98
  });
  const [dischargeMeds, setDischargeMeds] = useState<DischargeMedicationItem[]>([]);
  const [newMed, setNewMed] = useState<DischargeMedicationItem>({
    name: "",
    dose: "",
    frequency: "",
    duration: "",
    instructions: ""
  });

  // Print state
  const printRef = React.useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<DischargeSummaryPrintResponse | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Discharge_Summary_${visit?.patient_name || "Patient"}`,
  });

  useEffect(() => {
    if (shouldPrint && printData && printRef.current) {
      const timer = setTimeout(() => {
        handlePrint();
        setShouldPrint(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, printData, handlePrint]);


  const getInitialTabForStatus = (status: DayCareStatus): TabType => {
    const stage = STAGES.find(s => s.defaultStatus.includes(status));
    return stage ? stage.id : "billing";
  };

  const fetchAllDetails = async (initialLoad: boolean = false) => {
    if (initialLoad) setLoading(true);
    try {
      const v = await dayCareApi.getVisit(visitId);
      setVisit(v);
      
      const tabToLoad = initialLoad ? getInitialTabForStatus(v.status) : activeTab;
      if (initialLoad) setActiveTab(tabToLoad);

      await loadTabResource(v, tabToLoad);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to load daycare visit details");
    } finally {
      setLoading(false);
    }
  };

  const loadTabResource = async (v: DayCareVisit, tab: TabType) => {
    try {
      if (tab === "clinical") {
        const data = await dayCareApi.getClinicalAssessment(v.id);
        if (data) {
          setClinical(data);
        } else {
          setClinical({
            bp_systolic: 120, bp_diastolic: 80, pulse: 75, temperature: 37, spo2: 98, weight: 70,
            has_diabetes: false, has_hypertension: false, has_cardiac_history: false,
            allergies: "", current_medications: "", risk_assessment_notes: ""
          });
        }
      } else if (tab === "checklist") {
        const data = await dayCareApi.getPreparationChecklist(v.id);
        if (data) {
          setChecklist(data);
        } else {
          setChecklist({
            identity_verified: false, consent_signed: false, payment_cleared: false,
            site_marked: false, investigations_reviewed: false, npo_status_verified: false,
            right_eye_details: { dilated: false, corneal_thickness: "", iol_details: "" },
            left_eye_details: { dilated: false, corneal_thickness: "", iol_details: "" },
            checklist_notes: ""
          });
        }
      } else if (tab === "ot") {
        const data = await dayCareApi.getOTRecord(v.id);
        if (data) {
          setOt(data);
          setOtConsumables(data.consumables || []);
        } else {
          setOt({
            procedure_name: v.surgery_name, surgeon_id: v.surgeon_id, assistant_name: "",
            scrub_nurse_name: "", anaesthetist_name: "", anaesthesia_type: "topical",
            findings: "", procedure_notes: "", complications: ""
          });
          setOtConsumables([]);
        }
      } else if (tab === "recovery") {
        const data = await dayCareApi.getRecoveryRecord(v.id);
        if (data) {
          setRecovery(data);
          setRecoveryVitals(data.monitoring_records || []);
        } else {
          setRecovery({
            recovery_notes: "", medication_given: "", stable_vitals: false, is_conscious: false,
            pain_controlled: false, no_active_bleeding: false, can_walk: false, attendant_present: false
          });
          setRecoveryVitals([]);
        }
      } else if (tab === "discharge") {
        const data = await dayCareApi.getDischargeRecord(v.id);
        if (data) {
          setDischarge(data);
          setDischargeMeds(data.medications || []);
          setDischargeAdvices(data.follow_up_instructions ? data.follow_up_instructions.split('\n').filter(Boolean) : []);
        } else {
          setDischarge({
            diagnosis: "", procedure_performed: v.surgery_name, discharge_summary: "", follow_up_instructions: ""
          });
          setDischargeMeds([]);
          setDischargeAdvices([]);
        }
      }
    } catch (err) {
      console.error(`Error loading resource for tab ${tab}:`, err);
    }
  };

  useEffect(() => {
    if (visitId) {
      fetchAllDetails(true);
      surgeriesApi.list({ is_active: true }).then(res => setAvailableSurgeries(res.items || [])).catch(console.error);
      otConsumablesApi.list({ is_active: true, page_size: 1000 }).then(res => setAvailableConsumables(res.items || [])).catch(console.error);
      diagnosesApi.list({ status: "active", page_size: 1000 }).then(res => setAvailableDiagnoses(res.items || [])).catch(console.error);
      advicesApi.list({ status: "active", page_size: 1000 }).then(res => setAvailableAdvices(res.items || [])).catch(console.error);
      medicinesApi.list({ is_active: true, page_size: 1000 }).then(res => setAvailableMedicines(res.items || [])).catch(console.error);
    }
  }, [visitId]);

  useEffect(() => {
    if (visit) {
      loadTabResource(visit, activeTab);
    }
  }, [activeTab]);

  // Invoice creation helper
  const handleGenerateInvoice = async () => {
    if (!visit) return;
    setSubmitting(true);
    try {
      const items = [
        { description: `${visit.surgery_name} package charges`, quantity: 1, unit_price: 25000 },
        { description: `OT Charges`, quantity: 1, unit_price: 5000 },
        { description: `Consumables & disposables`, quantity: 1, unit_price: 1500 }
      ];
      await dayCareApi.generateInvoice(visit.id, items);
      toast.success("Invoice generated successfully");
      await fetchAllDetails(false);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to generate invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (toStatus: DayCareStatus, nextTab: TabType, extraNotes?: string) => {
    if (!visit) return;
    try {
      await dayCareApi.transitionStatus(visit.id, {
        to_status: toStatus,
        notes: extraNotes || `Auto transitioned to ${toStatus.replace("_", " ")}`
      });
      toast.success(`Patient moved to ${toStatus.replace("_", " ").toUpperCase()}`);
      
      const v = await dayCareApi.getVisit(visitId);
      setVisit(v);
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Status transition failed");
    }
  };

  const handleSaveAndCheckIn = async () => {
    if (!visit) return;
    setSubmitting(true);
    try {
      if (visit.status === "scheduled") {
        await handleTransition("checked_in", "clinical");
      } else {
        toast.success("Admission details updated");
        setActiveTab("clinical");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveClinical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setSubmitting(true);
    try {
      await dayCareApi.upsertClinicalAssessment(visit.id, clinical);
      toast.success("Clinical assessment saved");
      if (visit.status === "checked_in") {
        await handleTransition("pre_assessment_completed", "checklist");
      } else {
        setActiveTab("checklist");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setSubmitting(true);
    try {
      await dayCareApi.upsertPreparationChecklist(visit.id, checklist);
      toast.success("Prep checklist saved");
      if (visit.status === "pre_assessment_completed") {
        await handleTransition("ready_for_ot", "ot");
      } else {
        setActiveTab("ot");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save prep checklist");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setSubmitting(true);
    try {
      await dayCareApi.upsertOTRecord(visit.id, {
        ...ot,
        consumables: otConsumables
      });
      toast.success("OT Record saved");
      
      // If currently ready_for_ot, advance to in_ot first, then to recovery
      if (visit.status === "ready_for_ot") {
        await dayCareApi.transitionStatus(visit.id, { to_status: "in_ot", notes: "Surgery Started" });
        await handleTransition("recovery", "recovery");
      } else if (visit.status === "in_ot") {
        await handleTransition("recovery", "recovery");
      } else {
        setActiveTab("recovery");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save OT record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setSubmitting(true);
    try {
      await dayCareApi.upsertRecoveryRecord(visit.id, {
        ...recovery,
        monitoring_records: recoveryVitals
      });
      toast.success("Recovery Record saved");
      setActiveTab("discharge");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save recovery record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setSubmitting(true);
    try {
      await dayCareApi.upsertDischargeRecord(visit.id, {
        ...discharge,
        follow_up_instructions: dischargeAdvices.join('\n'),
        medications: dischargeMeds
      });
      toast.success("Discharge Record saved");
      if (visit.status !== "discharged") {
        await dayCareApi.transitionStatus(visit.id, { to_status: "discharged", notes: "Discharged from workflow" });
      }
      await fetchAllDetails(false);

      // Fetch print data and trigger browser print dialog
      toast.info("Preparing Discharge Summary Print...");
      const res = await dayCareApi.getDischargeSummaryPrintData(visit.id);
      setPrintData(res);
      setShouldPrint(true);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save discharge record");
    } finally {
      setSubmitting(false);
    }
  };

  // List modifiers
  const addConsumable = () => {
    setOtConsumables([...otConsumables, { item: "", quantity: 1, unit_price: 0 }]);
  };
  const removeConsumable = (idx: number) => {
    setOtConsumables(otConsumables.filter((_, i) => i !== idx));
  };
  const addVitalLog = () => {
    if (!newVital.time) {
      toast.error("Vitals monitoring entry requires a timestamp (HH:MM)");
      return;
    }
    
    // Convert HH:mm to ISO string for backend compatibility
    let isoTime = newVital.time;
    if (!newVital.time.includes('T')) {
      const [hours, minutes] = newVital.time.split(':');
      const now = new Date();
      now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      isoTime = now.toISOString();
    }

    const vitalEntry = {
      ...newVital,
      time: isoTime
    } as MonitoringEntry;

    setRecoveryVitals([...recoveryVitals, vitalEntry]);
    setNewVital({ time: "", bp_systolic: 120, bp_diastolic: 80, pulse: 72, spo2: 98 });
  };
  const removeVitalLog = (idx: number) => {
    setRecoveryVitals(recoveryVitals.filter((_, i) => i !== idx));
  };
  const addDischargeMed = () => {
    if (!newMed.name) {
      toast.error("Medicine name is required");
      return;
    }
    setDischargeMeds([...dischargeMeds, newMed]);
    setNewMed({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
  };
  const removeDischargeMed = (idx: number) => {
    setDischargeMeds(dischargeMeds.filter((_, i) => i !== idx));
  };
  const addDischargeAdvice = () => {
    if (!newAdvice.trim()) return;
    setDischargeAdvices([...dischargeAdvices, newAdvice.trim()]);
    setNewAdvice("");
  };
  const removeDischargeAdvice = (idx: number) => {
    setDischargeAdvices(dischargeAdvices.filter((_, i) => i !== idx));
  };

  const handleOpenPayment = async () => {
    if (!visit?.invoice_id) return;
    try {
      const inv = await invoicesApi.getById(visit.invoice_id);
      setPaymentInvoice(inv);
      setIsPaymentModalOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to load invoice for payment");
    }
  };

  const handlePaymentSuccess = async (payment?: Payment) => {
    if (visit && payment) {
      try {
        await dayCareApi.updateVisitPayment(visit.id, payment.id);
        await fetchAllDetails(false);
      } catch (error) {
        console.error("Failed to update visit payment status:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 mt-4">Loading patient records...</p>
      </div>
    );
  }

  if (!visit) return null;

  const currentStageIndex = STAGES.findIndex(s => s.id === activeTab);
  const highestStageIndex = STAGES.findIndex(s => s.defaultStatus.includes(visit.status));
  
  // If visit is cancelled/postponed/no_show, allow navigating anywhere or show warning
  const isTerminalState = ["cancelled", "postponed", "no_show"].includes(visit.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="p-6 md:p-8 bg-gradient-to-br from-sky-50 to-white flex-1 border-b md:border-b-0 md:border-r border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{visit.patient_name}</h1>
            <span className={clsx(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              visit.status === "scheduled" && "bg-slate-100 text-slate-700",
              visit.status === "discharged" && "bg-teal-100 text-teal-800",
              visit.status === "cancelled" && "bg-rose-100 text-rose-800",
              !["scheduled", "discharged", "cancelled", "postponed", "no_show"].includes(visit.status) && "bg-emerald-100 text-emerald-800"
            )}>
              {visit.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mt-3 font-medium">
            <span className="flex items-center gap-1"><User className="w-4 h-4 text-slate-400" /> UHID: {visit.patient_uhid || "N/A"}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{visit.patient_age || "N/A"} yrs, {visit.patient_gender || "N/A"}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Surgeon: <strong className="text-slate-800">{visit.surgeon_name}</strong></span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Procedure: <strong className="text-slate-800">{visit.surgery_name}</strong></span>
          </div>
        </div>
        <div className="p-6 bg-slate-50 flex items-center justify-center shrink-0 min-w-[200px]">
          <Link href="/day-care" className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all">
            Exit Workflow
          </Link>
        </div>
      </div>

      {/* Read-only banner for terminal states */}
      {isTerminalState && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base">Visit is {visit.status}</h3>
            <p className="text-sm mt-1">{visit.cancellation_reason || "No reason provided."}</p>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-between min-w-[800px]">
          {STAGES.map((stage, idx) => {
            const isActive = activeTab === stage.id;
            const isCompleted = highestStageIndex > idx || visit.status === "discharged";
            const isPendingPaymentAction = stage.id === "billing" && !visit.payment_id;
            const isActuallyCompleted = isCompleted && !isPendingPaymentAction;
            const isSelectable = highestStageIndex >= idx || isTerminalState || isCompleted || (visit.status === "recovery" && idx === 5);

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => isSelectable && setActiveTab(stage.id)}
                  disabled={!isSelectable}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                    isActive ? "bg-sky-50" : (isSelectable ? "hover:bg-slate-50 cursor-pointer" : "opacity-50 cursor-not-allowed")
                  )}
                >
                  <div className={clsx(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all shrink-0",
                    isActive ? "border-sky-600 bg-white text-sky-600" :
                      isActuallyCompleted ? "border-emerald-500 bg-emerald-50 text-emerald-600" :
                        (isCompleted && isPendingPaymentAction) ? "border-amber-500 bg-amber-50 text-amber-600" :
                        "border-slate-200 bg-slate-50 text-slate-400"
                  )}>
                    {isActuallyCompleted && !isActive ? <Check className="w-5 h-5" /> : 
                     (isCompleted && isPendingPaymentAction && !isActive) ? <AlertCircle className="w-5 h-5" /> : stage.icon}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className={clsx("text-xs font-bold uppercase tracking-wider mb-0.5", isActive ? "text-sky-600" : isActuallyCompleted ? "text-emerald-600" : (isCompleted && isPendingPaymentAction) ? "text-amber-600" : "text-slate-500")}>
                      Step {idx + 1}
                    </p>
                    <p className={clsx("text-sm font-semibold", isActive ? "text-slate-900" : "text-slate-600")}>
                      {stage.label}
                    </p>
                  </div>
                </button>
                {idx < STAGES.length - 1 && (
                  <div className="flex-1 h-px bg-slate-200 mx-2">
                    <div className={clsx("h-full transition-all duration-500", isCompleted ? (isPendingPaymentAction ? "w-full bg-amber-400" : "w-full bg-emerald-400") : "w-0")} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 1. BILLING & ADMISSION */}
        {activeTab === "billing" && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Admission & Check-In</h2>
              <p className="text-slate-500 mt-2">Generate patient invoices and confirm admission</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Billing Information</h3>
                  <p className="text-sm text-slate-500">Day care surgery package</p>
                </div>
                {visit?.payment_id ? (
                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    Payment Confirmed
                  </span>
                ) : visit?.invoice_id ? (
                  <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                    Pending Payment
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    Invoice Not Generated
                  </span>
                )}
              </div>

              {!visit?.invoice_id ? (
                <div className="text-center py-8 bg-white border border-slate-200 rounded-xl">
                  <IndianRupee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-5">
                    Generate the day care package billing to proceed with admission.
                  </p>
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting ? "Generating..." : "Generate Invoice Now"}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-center p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-center sm:text-left">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Number</span>
                      <p className="font-mono text-xl font-bold text-slate-800 mt-1">{visit.invoice_number || visit.invoice_id}</p>
                    </div>
                    <div className="text-center sm:text-right mt-4 sm:mt-0">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total</span>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{currency(31500)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-sky-50 p-4 rounded-xl border border-sky-100 text-sky-800">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                      Collect payments via the central billing counter. You can proceed with the clinical pre-assessment while payment is pending.
                    </p>
                  </div>

                  {!visit.payment_id && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={handleOpenPayment}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all"
                      >
                        <IndianRupee className="w-5 h-5" />
                        Collect Payment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSaveAndCheckIn}
                disabled={submitting || isTerminalState}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {visit?.status === "scheduled" ? "Check-in & Continue" : "Save & Continue"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. CLINICAL ASSESSMENT */}
        {activeTab === "clinical" && (
          <form onSubmit={handleSaveClinical} className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Pre-Operative Assessment</h2>
              <p className="text-slate-500 mt-2">Record patient vitals and medical history</p>
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3">Baseline Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">BP (Systolic)</label>
                  <div className="relative">
                    <input type="number" value={clinical.bp_systolic || ""} onChange={(e) => setClinical({ ...clinical, bp_systolic: parseInt(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">mmHg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">BP (Diastolic)</label>
                  <div className="relative">
                    <input type="number" value={clinical.bp_diastolic || ""} onChange={(e) => setClinical({ ...clinical, bp_diastolic: parseInt(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">mmHg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Pulse Rate</label>
                  <div className="relative">
                    <input type="number" value={clinical.pulse || ""} onChange={(e) => setClinical({ ...clinical, pulse: parseInt(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">bpm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">SpO2</label>
                  <div className="relative">
                    <input type="number" value={clinical.spo2 || ""} onChange={(e) => setClinical({ ...clinical, spo2: parseInt(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Temperature</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={clinical.temperature || ""} onChange={(e) => setClinical({ ...clinical, temperature: parseFloat(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">°C</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Weight</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={clinical.weight || ""} onChange={(e) => setClinical({ ...clinical, weight: parseFloat(e.target.value) || null })} className="w-full text-sm font-semibold rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">kg</span>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pt-6 pb-3">Medical History</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "has_diabetes", label: "Diabetes Mellitus" },
                  { key: "has_hypertension", label: "Hypertension" },
                  { key: "has_cardiac_history", label: "Cardiac Disease" }
                ].map((hist) => (
                  <label key={hist.key} className={clsx(
                    "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    clinical[hist.key as keyof DayCareClinicalAssessment] ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200 hover:border-slate-300"
                  )}>
                    <input
                      type="checkbox"
                      checked={!!clinical[hist.key as keyof DayCareClinicalAssessment]}
                      onChange={(e) => setClinical({ ...clinical, [hist.key]: e.target.checked })}
                      className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-slate-700">{hist.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-5 pt-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Allergies</label>
                  <textarea value={clinical.allergies || ""} onChange={(e) => setClinical({ ...clinical, allergies: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="List any known drug or food allergies..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Medications</label>
                  <textarea value={clinical.current_medications || ""} onChange={(e) => setClinical({ ...clinical, current_medications: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Enter active prescriptions patient is taking..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Clinical Risk Assessment Notes</label>
                  <textarea value={clinical.risk_assessment_notes || ""} onChange={(e) => setClinical({ ...clinical, risk_assessment_notes: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Note any specific anesthesia risks or concerns..." />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || isTerminalState}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Save & Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}

        {/* 3. CHECKLIST */}
        {activeTab === "checklist" && (
          <form onSubmit={handleSaveChecklist} className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">OT Preparation Checklist</h2>
              <p className="text-slate-500 mt-2">Verify requirements before moving patient to OT</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "identity_verified", label: "Patient Identity Verified" },
                { key: "consent_signed", label: "Surgical Consent Form Signed" },
                { key: "payment_cleared", label: "Payment / Billing Confirmed" },
                { key: "site_marked", label: "Operation Site Marked" },
                { key: "investigations_reviewed", label: "Lab / Scan Reports Reviewed" },
                { key: "npo_status_verified", label: "NPO (Fasting) Status Verified" }
              ].map((chk) => (
                <label key={chk.key} className={clsx(
                  "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                  checklist[chk.key as keyof DayCarePreparationChecklist] ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className={clsx(
                    "flex items-center justify-center w-6 h-6 rounded border transition-all shrink-0",
                    checklist[chk.key as keyof DayCarePreparationChecklist] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-slate-50"
                  )}>
                    {checklist[chk.key as keyof DayCarePreparationChecklist] && <Check className="w-4 h-4" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!checklist[chk.key as keyof DayCarePreparationChecklist]}
                    onChange={(e) => setChecklist({ ...checklist, [chk.key]: e.target.checked })}
                  />
                  <span className="font-bold text-slate-800">{chk.label}</span>
                </label>
              ))}
            </div>

            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pt-6 pb-3">Eye-Specific Preparation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Right Eye */}
              <div className="bg-blue-50/50 border border-blue-200 p-6 rounded-2xl">
                <h4 className="font-bold text-blue-900 text-lg mb-5 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded text-blue-700">OD</div> Right Eye
                </h4>
                <div className="space-y-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!checklist.right_eye_details?.dilated} onChange={(e) => setChecklist({ ...checklist, right_eye_details: { corneal_thickness: checklist.right_eye_details?.corneal_thickness || "", iol_details: checklist.right_eye_details?.iol_details || "", dilated: e.target.checked } })} className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500" />
                    <span className="font-semibold text-slate-800">Pupil Dilated</span>
                  </label>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Corneal Thickness</label>
                    <input type="text" value={checklist.right_eye_details?.corneal_thickness || ""} onChange={(e) => setChecklist({ ...checklist, right_eye_details: { dilated: !!checklist.right_eye_details?.dilated, iol_details: checklist.right_eye_details?.iol_details || "", corneal_thickness: e.target.value } })} placeholder="e.g. 545 µm" className="w-full text-sm rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">IOL (Lens) Details</label>
                    <input type="text" value={checklist.right_eye_details?.iol_details || ""} onChange={(e) => setChecklist({ ...checklist, right_eye_details: { dilated: !!checklist.right_eye_details?.dilated, corneal_thickness: checklist.right_eye_details?.corneal_thickness || "", iol_details: e.target.value } })} placeholder="e.g. Alcon +21.5D" className="w-full text-sm rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              {/* Left Eye */}
              <div className="bg-purple-50/50 border border-purple-200 p-6 rounded-2xl">
                <h4 className="font-bold text-purple-900 text-lg mb-5 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded text-purple-700">OS</div> Left Eye
                </h4>
                <div className="space-y-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!checklist.left_eye_details?.dilated} onChange={(e) => setChecklist({ ...checklist, left_eye_details: { corneal_thickness: checklist.left_eye_details?.corneal_thickness || "", iol_details: checklist.left_eye_details?.iol_details || "", dilated: e.target.checked } })} className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500" />
                    <span className="font-semibold text-slate-800">Pupil Dilated</span>
                  </label>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Corneal Thickness</label>
                    <input type="text" value={checklist.left_eye_details?.corneal_thickness || ""} onChange={(e) => setChecklist({ ...checklist, left_eye_details: { dilated: !!checklist.left_eye_details?.dilated, iol_details: checklist.left_eye_details?.iol_details || "", corneal_thickness: e.target.value } })} placeholder="e.g. 540 µm" className="w-full text-sm rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">IOL (Lens) Details</label>
                    <input type="text" value={checklist.left_eye_details?.iol_details || ""} onChange={(e) => setChecklist({ ...checklist, left_eye_details: { dilated: !!checklist.left_eye_details?.dilated, corneal_thickness: checklist.left_eye_details?.corneal_thickness || "", iol_details: e.target.value } })} placeholder="e.g. Tecnis +20.0D" className="w-full text-sm rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Preparation Notes</label>
              <textarea value={checklist.checklist_notes || ""} onChange={(e) => setChecklist({ ...checklist, checklist_notes: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Note pre-op drops timing, patient anxiety levels, etc..." />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || isTerminalState}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Mark Ready for OT
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}

        {/* 4. OT RECORD */}
        {activeTab === "ot" && (
          <form onSubmit={handleSaveOT} className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Operation Theatre Record</h2>
              <p className="text-slate-500 mt-2">Log surgical details, staff, and consumables</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Procedure Performed</label>
                <Combobox
                  value={ot.procedure_name || ""}
                  onChange={(val) => setOt({ ...ot, procedure_name: val })}
                  options={availableSurgeries.map(s => ({ label: s.name, value: s.name }))}
                  placeholder="Type or select procedure..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Anaesthesia Type</label>
                <Combobox
                  value={ot.anaesthesia_type || ""}
                  onChange={(val) => setOt({ ...ot, anaesthesia_type: val as any })}
                  options={[
                    { label: "Topical (Eye drops)", value: "topical" },
                    { label: "Local Block", value: "local" },
                    { label: "General Anaesthesia", value: "general" },
                    { label: "IV Sedation", value: "sedation" },
                  ]}
                  placeholder="Select anaesthesia type..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Procedure Start Time</label>
                <input type="datetime-local" value={ot.procedure_start_time ? new Date(ot.procedure_start_time).toISOString().slice(0, 16) : ""} onChange={(e) => setOt({ ...ot, procedure_start_time: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Procedure End Time</label>
                <input type="datetime-local" value={ot.procedure_end_time ? new Date(ot.procedure_end_time).toISOString().slice(0, 16) : ""} onChange={(e) => setOt({ ...ot, procedure_end_time: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
              </div>
            </div>

            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pt-4 pb-3">Surgical Staff</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Anesthetist</label>
                <input type="text" value={ot.anaesthetist_name || ""} onChange={(e) => setOt({ ...ot, anaesthetist_name: e.target.value })} placeholder="Dr. Name" className="w-full text-sm rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Scrub Nurse</label>
                <input type="text" value={ot.scrub_nurse_name || ""} onChange={(e) => setOt({ ...ot, scrub_nurse_name: e.target.value })} placeholder="Nurse Name" className="w-full text-sm rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Surgical Assistant</label>
                <input type="text" value={ot.assistant_name || ""} onChange={(e) => setOt({ ...ot, assistant_name: e.target.value })} placeholder="Assistant Name" className="w-full text-sm rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-sky-400" />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-lg">OT Consumables Used</h3>
                <button type="button" onClick={addConsumable} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-700 hover:text-slate-900 rounded-lg transition">
                  <Plus className="h-4 w-4" /> Add Item
                </button>
              </div>
              {otConsumables.length === 0 ? (
                <div className="text-center py-6 bg-white border border-slate-200 border-dashed rounded-xl">
                  <p className="text-sm text-slate-400">No consumables logged yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otConsumables.map((c, i) => (
                    <div key={i} className="flex gap-3 items-center bg-white p-2 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <Combobox
                          value={c.item}
                          onChange={(val) => {
                            const updated = [...otConsumables];
                            updated[i].item = val;
                            const selected = availableConsumables.find(cons => cons.name === val);
                            if (selected && selected.selling_price) {
                              updated[i].unit_price = Number(selected.selling_price);
                            }
                            setOtConsumables(updated);
                          }}
                          options={availableConsumables.map(ac => ({ label: ac.name, value: ac.name }))}
                          placeholder="Item Name (e.g. Viscoelastic)"
                        />
                      </div>
                      <input type="number" value={c.quantity} onChange={(e) => { const updated = [...otConsumables]; updated[i].quantity = parseInt(e.target.value) || 0; setOtConsumables(updated); }} placeholder="Qty" className="w-20 text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                        <input type="number" value={c.unit_price} onChange={(e) => { const updated = [...otConsumables]; updated[i].unit_price = parseFloat(e.target.value) || 0; setOtConsumables(updated); }} placeholder="Price" className="w-28 text-sm rounded-lg border border-slate-200 pl-7 pr-3 py-2 outline-none focus:border-sky-400" />
                      </div>
                      <button type="button" onClick={() => removeConsumable(i)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Intra-Operative Findings</label>
                <textarea value={ot.findings || ""} onChange={(e) => setOt({ ...ot, findings: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Detail visual observations..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Procedure Notes</label>
                <textarea value={ot.procedure_notes || ""} onChange={(e) => setOt({ ...ot, procedure_notes: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Detail surgical steps completed..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Complications (if any)</label>
                <textarea value={ot.complications || ""} onChange={(e) => setOt({ ...ot, complications: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-20 bg-rose-50/30 focus:bg-white outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-slate-400" placeholder="Enter intra-operative difficulties or mark 'None'..." />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || isTerminalState}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Save & Move to Recovery
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}

        {/* 5. RECOVERY */}
        {activeTab === "recovery" && (
          <form onSubmit={handleSaveRecovery} className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Recovery Room</h2>
              <p className="text-slate-500 mt-2">Log periodic vitals and determine discharge readiness</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-4">Vitals Monitoring Log</h3>
              
              <div className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-5">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Time</label>
                  <input type="time" value={newVital.time} onChange={(e) => setNewVital({ ...newVital, time: e.target.value })} className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Sys BP</label>
                  <input type="number" value={newVital.bp_systolic} onChange={(e) => setNewVital({ ...newVital, bp_systolic: parseInt(e.target.value) || 0 })} className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Dia BP</label>
                  <input type="number" value={newVital.bp_diastolic} onChange={(e) => setNewVital({ ...newVital, bp_diastolic: parseInt(e.target.value) || 0 })} className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pulse</label>
                  <input type="number" value={newVital.pulse} onChange={(e) => setNewVital({ ...newVital, pulse: parseInt(e.target.value) || 0 })} className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">SpO2</label>
                  <input type="number" value={newVital.spo2} onChange={(e) => setNewVital({ ...newVital, spo2: parseInt(e.target.value) || 0 })} className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                </div>
                <button type="button" onClick={addVitalLog} className="px-5 py-2.5 h-[42px] bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow shrink-0 transition-all">
                  Log
                </button>
              </div>

              {recoveryVitals.length === 0 ? (
                <div className="text-center py-6 bg-white border border-slate-200 border-dashed rounded-xl">
                  <p className="text-sm text-slate-400">No periodic monitoring records added.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">BP (mmHg)</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pulse</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SpO2</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {recoveryVitals.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-bold text-slate-800">
                            {v.time.includes('T') ? new Date(v.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : v.time}
                          </td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{v.bp_systolic}/{v.bp_diastolic}</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{v.pulse} bpm</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{v.spo2}%</td>
                          <td className="px-5 py-3 text-right">
                            <button type="button" onClick={() => removeVitalLog(i)} className="text-slate-400 hover:text-rose-500 transition-colors">
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pt-2 pb-3 mb-5">Discharge Clearance Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "stable_vitals", label: "Stable Vitals for 30+ Mins" },
                  { key: "is_conscious", label: "Fully Conscious & Oriented" },
                  { key: "pain_controlled", label: "Pain Adequately Managed" },
                  { key: "no_active_bleeding", label: "No Active Bleeding/Oozing" },
                  { key: "can_walk", label: "Able to Ambulate (Walk) Safely" },
                  { key: "attendant_present", label: "Responsible Attendant Present" }
                ].map((chk) => (
                  <label key={chk.key} className={clsx(
                    "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                    recovery[chk.key as keyof DayCareRecoveryRecord] ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-slate-300"
                  )}>
                    <div className={clsx(
                      "flex items-center justify-center w-6 h-6 rounded border transition-all shrink-0",
                      recovery[chk.key as keyof DayCareRecoveryRecord] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-slate-50"
                    )}>
                      {recovery[chk.key as keyof DayCareRecoveryRecord] && <Check className="w-4 h-4" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!!recovery[chk.key as keyof DayCareRecoveryRecord]}
                      onChange={(e) => setRecovery({ ...recovery, [chk.key]: e.target.checked })}
                    />
                    <span className="font-bold text-slate-800">{chk.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Post-Op Medications Given</label>
                <textarea value={recovery.medication_given || ""} onChange={(e) => setRecovery({ ...recovery, medication_given: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-20 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Log active medicines given in recovery (e.g. Paracetamol IV)..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Recovery Notes</label>
                <textarea value={recovery.recovery_notes || ""} onChange={(e) => setRecovery({ ...recovery, recovery_notes: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Log nausea, pain complaints, or general assessment..." />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || isTerminalState}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Proceed to Discharge
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}

        {/* 6. DISCHARGE */}
        {activeTab === "discharge" && (
          <form onSubmit={handleSaveDischarge} className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Discharge Patient</h2>
              <p className="text-slate-500 mt-2">Finalize discharge summary and provide instructions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Primary Diagnosis</label>
                <Combobox
                  value={discharge.diagnosis || ""}
                  onChange={(val) => setDischarge({ ...discharge, diagnosis: val })}
                  options={Array.from(new Map(availableDiagnoses.map(d => [d.diagnosis_name, d])).values()).map(d => ({ label: d.diagnosis_name, value: d.diagnosis_name }))}
                  placeholder="Type or select diagnosis..."
                  allowCustomValue={true}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Follow-Up Appointment Date</label>
                <input type="date" value={discharge.follow_up_date || ""} onChange={(e) => setDischarge({ ...discharge, follow_up_date: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Procedure Completed</label>
                <input type="text" value={discharge.procedure_performed || ""} onChange={(e) => setDischarge({ ...discharge, procedure_performed: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Discharge Summary / Patient Condition</label>
                <textarea value={discharge.discharge_summary || ""} onChange={(e) => setDischarge({ ...discharge, discharge_summary: e.target.value })} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 h-24 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" placeholder="Describe patient's condition on discharge..." />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-4">Care Instructions</h3>
              
              <div className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-5">
                <div className="flex-1">
                  <Combobox
                    value={newAdvice}
                    onChange={(val) => setNewAdvice(val)}
                    options={Array.from(new Map(availableAdvices.map(a => [a.advice_name, a])).values()).map(a => ({ label: a.advice_name, value: a.advice_name }))}
                    placeholder="Select or type care instruction..."
                    allowCustomValue={true}
                  />
                </div>
                <button type="button" onClick={addDischargeAdvice} className="px-5 py-2.5 h-[42px] bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow shrink-0 transition-all">
                  Add
                </button>
              </div>

              {dischargeAdvices.length === 0 ? (
                <div className="text-center py-6 bg-white border border-slate-200 border-dashed rounded-xl">
                  <p className="text-sm text-slate-400">No care instructions added.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-2">
                  <ul className="divide-y divide-slate-100">
                    {dischargeAdvices.map((adv, i) => (
                      <li key={i} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded-lg">
                        <span className="text-slate-700 text-sm font-medium">{adv}</span>
                        <button type="button" onClick={() => removeDischargeAdvice(i)} className="text-slate-400 hover:text-rose-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-4">Discharge Home Medications</h3>
              
              <div className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-5">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Medicine Name</label>
                  <Combobox
                    value={newMed.name}
                    onChange={(val) => {
                      const selected = availableMedicines.find(m => m.name === val);
                      if (selected) {
                        setNewMed({
                          ...newMed,
                          name: val,
                          dose: selected.default_dosage || newMed.dose,
                          frequency: selected.default_frequency || newMed.frequency,
                          duration: selected.default_duration || newMed.duration,
                          instructions: selected.default_instructions || newMed.instructions,
                        });
                      } else {
                        setNewMed({ ...newMed, name: val });
                      }
                    }}
                    options={Array.from(new Map(availableMedicines.map(m => [m.name, m])).values()).map(m => ({ label: m.name, value: m.name }))}
                    placeholder="e.g. Tobradex Drops"
                    allowCustomValue={true}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Dose</label>
                  <Combobox
                    value={newMed.dose}
                    onChange={(val) => setNewMed({ ...newMed, dose: val })}
                    options={DOSAGES.map(d => ({ label: d, value: d }))}
                    placeholder="1 drop"
                    allowCustomValue={true}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Frequency</label>
                  <Combobox
                    value={newMed.frequency}
                    onChange={(val) => setNewMed({ ...newMed, frequency: val })}
                    options={FREQUENCIES.map(f => ({ label: f, value: f }))}
                    placeholder="QID (4x)"
                    allowCustomValue={true}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Duration</label>
                  <Combobox
                    value={newMed.duration}
                    onChange={(val) => setNewMed({ ...newMed, duration: val })}
                    options={DURATIONS.map(d => ({ label: d, value: d }))}
                    placeholder="7 days"
                    allowCustomValue={true}
                  />
                </div>
                <div className="w-36">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Instructions</label>
                  <Combobox
                    value={newMed.instructions || ""}
                    onChange={(val) => setNewMed({ ...newMed, instructions: val })}
                    options={MEDICINE_INSTRUCTIONS.map(i => ({ label: i, value: i }))}
                    placeholder="e.g. After food"
                    allowCustomValue={true}
                  />
                </div>
                <button type="button" onClick={addDischargeMed} className="px-5 py-2.5 h-[42px] bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow shrink-0 transition-all">
                  Add
                </button>
              </div>

              {dischargeMeds.length === 0 ? (
                <div className="text-center py-6 bg-white border border-slate-200 border-dashed rounded-xl">
                  <p className="text-sm text-slate-400">No home medications prescribed.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase text-left">
                      <tr>
                        <th className="px-5 py-3 font-bold tracking-wider">Medicine</th>
                        <th className="px-5 py-3 font-bold tracking-wider">Dose</th>
                        <th className="px-5 py-3 font-bold tracking-wider">Frequency</th>
                        <th className="px-5 py-3 font-bold tracking-wider">Duration</th>
                        <th className="px-5 py-3 font-bold tracking-wider">Instructions</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {dischargeMeds.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-bold text-slate-800">{m.name}</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{m.dose}</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{m.frequency}</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{m.duration}</td>
                          <td className="px-5 py-3 text-slate-600 font-medium">{m.instructions}</td>
                          <td className="px-5 py-3 text-right">
                            <button type="button" onClick={() => removeDischargeMed(i)} className="text-slate-400 hover:text-rose-500 transition-colors">
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              {visit?.status === "discharged" ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!visit) return;
                    try {
                      toast.info("Preparing Discharge Summary Print...");
                      const res = await dayCareApi.getDischargeSummaryPrintData(visit.id);
                      setPrintData(res);
                      setShouldPrint(true);
                    } catch (err) {
                      console.error("Print Data Fetch error:", err);
                      toast.error("Failed to load print data.");
                    }
                  }}
                  className="w-full md:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <FilePlus2 className="w-5 h-5" />
                  Print Discharge Summary
                </button>
              ) : <div />}
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-500 transition-all disabled:opacity-50"
              >
                {visit?.status === "discharged" ? "Update and Print Discharge Summary" : "Discharge and Print Discharge Summary"}
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Hidden printable content */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
        <div ref={printRef} className="print-content">
          {printData && (
            <DischargeSummaryPrint data={printData} />
          )}
        </div>
      </div>

      <PaymentCollectionModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={paymentInvoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
