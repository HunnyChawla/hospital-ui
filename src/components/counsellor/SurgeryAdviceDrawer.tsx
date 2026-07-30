"use client";

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X, Calendar, Clock, Stethoscope, IndianRupee,
  MessageSquare, CheckCircle2, FileText, Tag, MapPin,
  Flame, ChevronRight, Phone, Lock, Printer, ChevronDown, ChevronUp,
  AlertCircle, ArrowRight, Loader2,
} from "lucide-react";
import {
  CounsellorInteraction, PlannedSurgery, PlannedSurgeryStatus,
  SurgeryAdviceHistory, SurgeryPackage,
} from "@/types";
import { counsellorApi } from "@/services/counsellorApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { useAppSelector } from "@/redux/hooks";
import { toast } from "sonner";
import { LogInteractionModal } from "./LogInteractionModal";
import { PostponeCancelModal } from "./PostponeCancelModal";
import { AdvancePaymentReceipt } from "./AdvancePaymentReceipt";
import { dayCareApi } from "@/services/dayCareApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { paymentsApi, Payment, PaymentMethod } from "@/services/paymentsApi";
import { formatDateDisplay, getTodayDateLocal } from "@/utils/format";
import { useReactToPrint } from "react-to-print";
import { getErrorMessage } from "@/utils/errorHandler";
import Link from "next/link";

interface SurgeryAdviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plannedSurgery: PlannedSurgery | null;
  onRefresh: () => void;
}

const URGENCY_BADGES: Record<string, string> = {
  elective: "bg-emerald-50 text-emerald-700 border-emerald-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LABELS: Record<string, string> = {
  advised: "New Advice",
  counselling_in_progress: "In Counselling",
  pending_patient_decision: "Pending Decision",
  pending_insurance: "Pending Insurance",
  pending_investigations: "Pending Reports",
  pending_fitness: "Pending Fitness",
  confirmed: "Planned",
  released_to_daycare: "Released to Day Care",
  pre_op_started: "Pre-Op Started",
  in_ot_preparation: "Pre-Op Started",
  surgery_completed: "Completed",
  completed: "Completed",
  postponed: "Postponed",
  cancelled_by_patient: "Cancelled (Patient)",
  cancelled_by_hospital: "Cancelled (Hospital)",
  cancelled: "Cancelled",
  lost_to_followup: "Lost to Follow-up",
};

const STATUS_BADGE: Record<string, string> = {
  advised: "bg-sky-50 text-sky-700 border-sky-200",
  counselling_in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pending_patient_decision: "bg-amber-50 text-amber-700 border-amber-200",
  pending_insurance: "bg-purple-50 text-purple-700 border-purple-200",
  pending_investigations: "bg-cyan-50 text-cyan-700 border-cyan-200",
  pending_fitness: "bg-teal-50 text-teal-700 border-teal-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  released_to_daycare: "bg-violet-50 text-violet-800 border-violet-300",
  pre_op_started: "bg-blue-50 text-blue-800 border-blue-300",
  in_ot_preparation: "bg-blue-50 text-blue-800 border-blue-300",
  surgery_completed: "bg-slate-100 text-slate-700 border-slate-300",
  postponed: "bg-amber-50 text-amber-800 border-amber-300",
  cancelled_by_patient: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled_by_hospital: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  lost_to_followup: "bg-slate-50 text-slate-500 border-slate-200",
};

function cx(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}
function currency(v: number): string {
  return "\u20b9" + v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function getPackagePrice(pkg: SurgeryPackage, ps: PlannedSurgery): { price: number | null, error?: string } {
  const hasAnatomyOverrides = pkg.anatomy_prices && Object.keys(pkg.anatomy_prices).length > 0;
  
  if (hasAnatomyOverrides) {
    if (!ps.anatomy_site_id) {
        return { price: null, error: "Anatomy site is missing on the planned surgery. Please update the surgery details." };
    }
    
    if (pkg.anatomy_prices?.[ps.anatomy_site_id] === undefined) {
        return { price: null, error: "This package does not have a price defined for the selected anatomy site." };
    }
    
    const p = pkg.anatomy_prices[ps.anatomy_site_id];
    const resolvedPrice = typeof p === "number" ? p : Number((p as any)?.price || 0);
    return { price: ps.eye === "OU" ? resolvedPrice * 2 : resolvedPrice };
  }

  const basePrice = Number(pkg.price);
  return { price: ps.eye === "OU" ? basePrice * 2 : basePrice };
}

// StepCard
interface StepCardProps {
  n: number; title: string; done: boolean; active: boolean; blocked: boolean;
  blockedLabel?: string; warning?: string; doneSummary?: React.ReactNode; children?: React.ReactNode;
}
function StepCard({ n, title, done, active, blocked, blockedLabel, warning, doneSummary, children }: StepCardProps) {
  return (
    <div className={cx(
      "rounded-2xl border transition-all",
      done ? "border-emerald-200 bg-emerald-50/30" :
        warning ? "border-amber-300 bg-amber-50/30" :
          active ? "border-sky-200 bg-sky-50/20" :
            "border-slate-100 bg-slate-50/50 opacity-60"
    )}>
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className={cx(
          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2",
          done ? "bg-emerald-500 border-emerald-400 text-white" :
            warning ? "bg-amber-500 border-amber-400 text-white" :
              active ? "bg-sky-500 border-sky-400 text-white" :
                "bg-slate-200 border-slate-300 text-slate-500"
        )}>
          {done ? <CheckCircle2 className="h-4 w-4" /> :
            warning ? <AlertCircle className="h-4 w-4" /> :
              blocked && !active ? <Lock className="h-3 w-3" /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cx("text-sm font-bold",
            done ? "text-emerald-800" : warning ? "text-amber-800" : active ? "text-slate-900" : "text-slate-400")}>
            {title}
            {done && <span className="ml-2 text-xs font-normal text-emerald-600">Done</span>}
            {warning && <span className="ml-2 text-xs font-normal text-amber-600">{warning}</span>}
            {blocked && !active && blockedLabel && <span className="ml-2 text-xs font-normal text-slate-400">{blockedLabel}</span>}
          </h3>
          {done && doneSummary && <div className="mt-0.5">{doneSummary}</div>}
        </div>
      </div>
      {active && !blocked && (
        <div className="px-4 pb-4 border-t border-slate-100/80 pt-4">{children}</div>
      )}
    </div>
  );
}

// Main
export function SurgeryAdviceDrawer({ isOpen, onClose, plannedSurgery, onRefresh }: SurgeryAdviceDrawerProps) {
  const authState = useAppSelector((s: any) => s.auth);
  const currentUserId = authState.user?.user_id;
  const currentUserName = authState.userDetails?.full_name || "Counsellor";

  const [interactions, setInteractions] = useState<CounsellorInteraction[]>([]);
  const [history, setHistory] = useState<SurgeryAdviceHistory[]>([]);
  const [dayCareVisit, setDayCareVisit] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [packages, setPackages] = useState<SurgeryPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageError, setPackageError] = useState<string | null>(null);
  const [agreedPrice, setAgreedPrice] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [savingConfirm, setSavingConfirm] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<"upi" | "cash" | "card" | "cheque">("upi");

  // Invoice & Payment states
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Payment Collection fields
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [payReference, setPayReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [selectedInteraction, setSelectedInteraction] = useState<CounsellorInteraction | null>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Advance_Receipt_${plannedSurgery?.patient_name || "Patient"}`,
  });

  const fetchInvoiceAndPayments = async (visitId: string, invoiceId?: string | null) => {
    if (!visitId) return;
    setLoadingInvoice(true);
    try {
      if (invoiceId) {
        const inv = await invoicesApi.getById(invoiceId);
        setInvoice(inv);
        const pList = await paymentsApi.getByInvoiceId(invoiceId);
        setPayments(pList || []);
      } else {
        setInvoice(null);
        setPayments([]);
      }
    } catch (err) {
      console.error("Failed to load invoice/payments:", err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  useEffect(() => {
    if (isOpen && plannedSurgery) {
      setLoadingData(true);
      Promise.all([
        counsellorApi.getInteractions(plannedSurgery.id),
        counsellorApi.getHistory(plannedSurgery.id),
        dayCareApi.listVisits({ planned_surgery_id: plannedSurgery.id }),
      ]).then(async ([intRows, histRows, visits]) => {
        setInteractions(intRows || []);
        setHistory(histRows || []);
        const dcVisit = visits?.length ? visits[0] : null;
        setDayCareVisit(dcVisit);
        if (dcVisit) {
          await fetchInvoiceAndPayments(dcVisit.id, dcVisit.invoice_id);
        } else {
          setInvoice(null);
          setPayments([]);
        }
      }).catch(console.error).finally(() => setLoadingData(false));
    }
  }, [isOpen, plannedSurgery?.id, plannedSurgery?.status]);

  useEffect(() => {
    if (isOpen && plannedSurgery) {
      setSelectedPackageId(plannedSurgery.package_id || "");
      setAgreedPrice(plannedSurgery.agreed_price ? String(plannedSurgery.agreed_price) : "");
      setPlannedDate(plannedSurgery.planned_date || "");
      setPlannedTime(plannedSurgery.planned_time || "");
      setAdvanceAmount(""); setPaymentReference(""); setConfirmNotes("");
    }
  }, [isOpen, plannedSurgery?.id]);

  const handleDiscountChange = (val: string) => {
    setDiscount(val);
    const dVal = parseFloat(val) || 0;
    const pkg = packages.find((p: SurgeryPackage) => p.id === selectedPackageId);
    if (pkg && plannedSurgery) {
      const { price: basePrice, error } = getPackagePrice(pkg, plannedSurgery);
      setPackageError(error || null);
      if (basePrice !== null) {
        setAgreedPrice(String(Math.max(0, basePrice - dVal)));
      }
    }
  };

  useEffect(() => {
    if (isOpen && plannedSurgery?.surgery_id) {
      setLoadingPackages(true);
      surgeriesApi.listPackages(plannedSurgery.surgery_id).then((pkgs: SurgeryPackage[]) => {
        setPackages(pkgs || []);
        if (pkgs?.length) {
          const cp = pkgs.find((p: SurgeryPackage) => p.id === plannedSurgery.package_id);
          const dp = pkgs.find((p: SurgeryPackage) => p.is_default) || pkgs[0];
          const ap = cp || dp;
          if (ap) {
            setSelectedPackageId(ap.id);
            const { price: basePrice, error } = getPackagePrice(ap, plannedSurgery);
            setPackageError(error || null);
            if (basePrice !== null) {
                const currentAgreed = plannedSurgery.agreed_price ? Number(plannedSurgery.agreed_price) : basePrice;
                const initDiscount = Math.max(0, basePrice - currentAgreed);
                setDiscount(String(initDiscount));
                setAgreedPrice(String(currentAgreed));
            } else {
                setAgreedPrice("");
                setDiscount("0");
            }
          }
        }
      }).catch(console.error).finally(() => setLoadingPackages(false));
    }
  }, [isOpen, plannedSurgery?.surgery_id]);

  // Re-sync agreed price whenever the selected package changes
  useEffect(() => {
    if (selectedPackageId && packages.length > 0) {
      const pkg = packages.find((p: SurgeryPackage) => p.id === selectedPackageId);
      if (pkg && plannedSurgery) {
        const { price: basePrice, error } = getPackagePrice(pkg, plannedSurgery);
        setPackageError(error || null);
        if (basePrice !== null) {
            const dVal = parseFloat(discount) || 0;
            setAgreedPrice(String(Math.max(0, basePrice - dVal)));
        } else {
            setAgreedPrice("");
        }
      }
    }
  }, [selectedPackageId, packages]);

  if (!plannedSurgery) return null;
  const status = plannedSurgery.status;
  const isTerminal = ["surgery_completed","completed","cancelled_by_patient","cancelled_by_hospital","cancelled","lost_to_followup"].includes(status);
  const isPending = status.startsWith("pending_");
  const isAssigned = !!plannedSurgery.counsellor_id;
  const step1Done = isAssigned && status !== "advised";
  const sessionLogs = (interactions || []).filter(i =>
    ["call_logged","counselling_discussion","blocker_marked","blocker_cleared","status_update","case_claimed"].includes(i.interaction_type));
  const step2Done = sessionLogs.length > 0;
  const step3Done = ["confirmed","released_to_daycare","pre_op_started","in_ot_preparation","surgery_completed","completed"].includes(status);
  const step4Done = step3Done;
  const step5Done = ["released_to_daycare","pre_op_started","in_ot_preparation","surgery_completed","completed"].includes(status);
  const totalAdvancePaid = (interactions||[]).filter(i=>i.interaction_type==="advance_payment"&&Number(i.payment_amount)>0).reduce((s,i)=>s+Number(i.payment_amount),0);
  const totalRefunded = (interactions||[]).filter(i=>i.interaction_type==="refund_payment"&&i.payment_amount).reduce((s,i)=>s+Math.abs(Number(i.payment_amount)),0);
  const netAdvancePaid = Math.max(0, totalAdvancePaid - totalRefunded);
  const agreedPriceNum = parseFloat(agreedPrice)||0;
  const remainingBalance = Math.max(0, agreedPriceNum - netAdvancePaid);
  const advanceNum = parseFloat(advanceAmount)||0;
  const advanceExceedsBalance = advanceNum > 0 && advanceNum > remainingBalance;

  const handleClaimCase = async () => {
    if (!currentUserId) { toast.error("Not logged in"); return; }
    setClaiming(true);
    try {
      await plannedSurgeriesApi.update(plannedSurgery.id, { counsellor_id: currentUserId, status: "counselling_in_progress" as PlannedSurgeryStatus });
      await counsellorApi.logInteraction(plannedSurgery.id, { interaction_type: "case_claimed", notes: `Case claimed by ${currentUserName}.`, to_status: "counselling_in_progress" });
      toast.success("Case claimed — counselling started"); onRefresh();
    } catch (err) { toast.error(getErrorMessage(err)||"Failed"); } finally { setClaiming(false); }
  };

  const handleConfirmSave = async () => {
    if (!selectedPackageId) { toast.error("Select a package"); return; }
    if (!agreedPrice||agreedPriceNum<=0) { toast.error("Enter agreed price"); return; }
    if (advanceExceedsBalance) { toast.error(`Advance cannot exceed ${currency(remainingBalance)}`); return; }
    setSavingConfirm(true);
    try {
      await counsellorApi.confirm(plannedSurgery.id, { package_id: selectedPackageId, agreed_price: agreedPriceNum, planned_date: plannedDate||undefined, planned_time: plannedTime||undefined, notes: confirmNotes.trim()||undefined });
      if (advanceNum>0) {
        const formattedRef = `[${advancePaymentMethod.toUpperCase()}] ${paymentReference.trim()}`.trim();
        const interaction = await counsellorApi.logInteraction(plannedSurgery.id, { 
          interaction_type: "advance_payment", 
          package_id: selectedPackageId, 
          payment_amount: advanceNum, 
          payment_reference: formattedRef || undefined, 
          notes: `Advance ${currency(advanceNum)} collected via ${advancePaymentMethod.toUpperCase()}.` 
        });
        if (interaction.payment_number) {
          toast.success(`Advance payment recorded! Receipt No: ${interaction.payment_number}`);
        } else {
          toast.success(`Advance ${currency(advanceNum)} recorded.`);
        }
        // Store latest interaction for receipt printing
        setSelectedInteraction(interaction);
      } else {
        toast.success("Booking confirmed!");
      }
      setAdvanceAmount(""); setPaymentReference(""); setConfirmNotes(""); onRefresh();
    } catch (err) { toast.error(getErrorMessage(err)||"Failed"); } finally { setSavingConfirm(false); }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await plannedSurgeriesApi.update(plannedSurgery.id, { status: "released_to_daycare" as PlannedSurgeryStatus });
      await counsellorApi.logInteraction(plannedSurgery.id, { interaction_type: "status_update", notes: `Released to Day Care by ${currentUserName}.`, to_status: "released_to_daycare" });
      toast.success("Released to Day Care"); onRefresh();
    } catch (err) { toast.error(getErrorMessage(err)||"Failed"); } finally { setReleasing(false); }
  };

  const handleGenerateInvoice = async () => {
    if (!dayCareVisit) return;
    setGeneratingInvoice(true);
    try {
      const priceToUse = parseFloat(String(plannedSurgery.agreed_price)) || parseFloat(agreedPrice) || 0;
      if (priceToUse <= 0) {
        toast.error("Agreed price is invalid or not set. Please set the agreed price first.");
        return;
      }
      const lineItems = [
        {
          description: `${plannedSurgery.surgery_name} (${plannedSurgery.package_name || "Default"} Package)`,
          quantity: 1,
          unit_price: priceToUse,
        }
      ];
      const res = await dayCareApi.generateInvoice(dayCareVisit.id, lineItems);
      toast.success("Invoice generated! Advance payments automatically applied.");

      const invoiceId = res.id || res.invoice_id;
      onRefresh();
      if (invoiceId) {
        await fetchInvoiceAndPayments(dayCareVisit.id, invoiceId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to generate invoice");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!invoice || !dayCareVisit) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      toast.error("Please enter a valid amount to collect");
      return;
    }
    const balance = Math.max(0, invoice.total_amount - invoice.paid_amount);
    if (amt > balance) {
      toast.error(`Payment amount cannot exceed remaining balance of ${currency(balance)}`);
      return;
    }

    setSavingPayment(true);
    try {
      await paymentsApi.create({
        invoice_id: invoice.id,
        amount: amt,
        payment_method: paymentMethod,
        payment_reference: payReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      toast.success("Payment collected successfully!");
      setPaymentAmount("");
      setPayReference("");
      setPaymentNotes("");
      setIsCollectingPayment(false);
      onRefresh();
      await fetchInvoiceAndPayments(dayCareVisit.id, invoice.id);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to save payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const stepDone = [step1Done, step2Done, step3Done, step4Done, step5Done];
  const stepLabels = ["Claim","Log Session","Confirm Booking","Planned","Day Care"];

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child as={Fragment} enter="ease-in-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in-out duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4">
                <Transition.Child as={Fragment} enter="transform transition ease-in-out duration-300" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition ease-in-out duration-300" leaveFrom="translate-x-0" leaveTo="translate-x-full">
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full">

                    {/* Header */}
                    <div className="shrink-0 border-b border-slate-200 bg-slate-900 text-white px-6 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cx("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border", URGENCY_BADGES[plannedSurgery.urgency||"elective"])}>
                              <Flame className="h-3 w-3" />{(plannedSurgery.urgency||"elective").toUpperCase()}
                            </span>
                            <span className={cx("inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border", STATUS_BADGE[status]||"bg-slate-100 text-slate-700 border-slate-300")}>
                              {STATUS_LABELS[status]||status.replace(/_/g," ")}
                            </span>
                            {isPending && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800"><AlertCircle className="h-3 w-3"/>Blocked</span>}
                          </div>
                          <h2 className="text-xl font-bold">{plannedSurgery.patient_name||"Patient"}</h2>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-300 mt-1">
                            {plannedSurgery.patient_uhid && <span className="bg-slate-800 text-sky-300 px-2 py-0.5 rounded font-mono font-semibold border border-slate-700">UHID: {plannedSurgery.patient_uhid}</span>}
                            {plannedSurgery.patient_mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-sky-400"/>{plannedSurgery.patient_mobile}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isTerminal && (<>
                            <button onClick={()=>setPostponeModalOpen(true)} className="rounded-lg px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition">Postpone</button>
                            <button onClick={()=>setCancelModalOpen(true)} className="rounded-lg px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold transition">Cancel</button>
                          </>)}
                          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"><X className="h-5 w-5"/></button>
                        </div>
                      </div>
                      {/* Stepper */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1">
                        {stepDone.map((done, idx) => (
                          <Fragment key={idx}>
                            <div className="flex flex-col items-center gap-1">
                              <div className={cx("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                                done ? "bg-emerald-500 border-emerald-400 text-white" :
                                  stepDone.findIndex(d=>!d)===idx ? "bg-sky-500 border-sky-400 text-white" :
                                    "bg-slate-700 border-slate-600 text-slate-400")}>
                                {done ? <CheckCircle2 className="h-3.5 w-3.5"/> : idx+1}
                              </div>
                              <span className="text-[9px] font-medium text-center w-12 hidden sm:block leading-tight"
                                style={{color: done?"#6ee7b7": stepDone.findIndex(d=>!d)===idx?"#93c5fd":"#64748b"}}>
                                {stepLabels[idx]}
                              </span>
                            </div>
                            {idx<stepDone.length-1 && <div className={cx("flex-1 h-0.5 mb-3", done?"bg-emerald-500":"bg-slate-700")}/>}
                          </Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">

                      {/* Surgery summary card */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><FileText className="h-3 w-3"/>Surgery</span><p className="font-semibold text-slate-900">{plannedSurgery.surgery_name}</p></div>
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><MapPin className="h-3 w-3"/>Site</span><p className="font-semibold text-slate-900">{plannedSurgery.anatomy_site_name||plannedSurgery.eye||"—"}</p></div>
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><Stethoscope className="h-3 w-3"/>Surgeon</span><p className="font-medium text-slate-800">{plannedSurgery.surgeon_name||"—"}</p></div>
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><Tag className="h-3 w-3"/>Package</span><p className="font-semibold text-teal-700">{plannedSurgery.package_name||"Not selected"}</p></div>
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><IndianRupee className="h-3 w-3"/>Agreed Price</span><p className="font-bold text-slate-900">{plannedSurgery.agreed_price?currency(plannedSurgery.agreed_price):"—"}</p></div>
                        <div><span className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><Calendar className="h-3 w-3"/>Planned Date</span><p className="font-medium text-slate-800">{plannedSurgery.planned_date?formatDateDisplay(plannedSurgery.planned_date):"TBD"}{plannedSurgery.planned_time&&` at ${plannedSurgery.planned_time.slice(0,5)}`}</p></div>
                      </div>

                      {plannedSurgery.notes&&(
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                          <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">Doctor Notes</h4>
                          <p className="text-sm text-amber-950 whitespace-pre-line">{plannedSurgery.notes}</p>
                        </div>
                      )}

                      {dayCareVisit&&(
                        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-sky-900">Day Care Visit Active</span>
                            <span className="ml-2 bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{dayCareVisit.status?.replace(/_/g," ")}</span>
                          </div>
                          <Link href={`/day-care/workflow?id=${dayCareVisit.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline">
                            View Workflow <ChevronRight className="h-3.5 w-3.5"/>
                          </Link>
                        </div>
                      )}

                      {/* STEP 1 */}
                      <StepCard n={1} title="Claim This Case" done={step1Done} active={!step1Done&&!isTerminal} blocked={false}
                        doneSummary={<p className="text-xs text-slate-600">Assigned to <strong>{plannedSurgery.counsellor_name||"You"}</strong></p>}>
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600">Claim this case to start counselling. Status will automatically move to <strong>In Counselling</strong>.</p>
                          <button onClick={handleClaimCase} disabled={claiming} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow transition">
                            {claiming&&<Loader2 className="h-4 w-4 animate-spin"/>}Claim and Start Counselling
                          </button>
                        </div>
                      </StepCard>

                      {/* STEP 2 */}
                      <StepCard n={2} title="Log Counselling Session" done={step2Done&&!isPending} active={step1Done&&!isTerminal} blocked={!step1Done} blockedLabel="Claim case first"
                        warning={isPending?`Blocked: ${STATUS_LABELS[status]||status}`:undefined}
                        doneSummary={<p className="text-xs text-slate-600">{sessionLogs.length} session log{sessionLogs.length!==1?"s":""}</p>}>
                        <div className="space-y-3">
                          {isPending&&(
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"/>
                              <div><p className="text-xs font-bold text-amber-800">Blocked: {STATUS_LABELS[status]}</p><p className="text-xs text-amber-700 mt-0.5">Clear this blocker via the interaction log.</p></div>
                            </div>
                          )}
                          {!step2Done&&!isPending&&<p className="text-sm text-slate-500">Log your counselling discussion before confirming the package.</p>}
                          <button onClick={()=>setLogModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow transition">
                            <MessageSquare className="h-4 w-4"/>
                            {isPending?"Log Interaction / Clear Blocker":step2Done?"Add Another Interaction":"Log First Interaction"}
                          </button>
                        </div>
                      </StepCard>

                      {/* STEP 3 */}
                      <StepCard n={3} title="Confirm Package and Advance" done={step3Done} active={step1Done&&(step2Done||step3Done)&&!isPending} blocked={!step1Done||(!step2Done&&!step3Done)||isPending}
                        blockedLabel={isPending?"Clear blocker first":!step2Done?"Log a session first":""}
                        doneSummary={
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <p>Package: <strong>{plannedSurgery.package_name||"—"}</strong></p>
                            <p className="flex items-center gap-1.5 flex-wrap">
                              <span>Agreed: <strong className="text-emerald-700">{plannedSurgery.agreed_price?currency(plannedSurgery.agreed_price):"—"}</strong></span>
                              <span>&bull; Advance: <strong className="text-sky-700">{currency(totalAdvancePaid)}</strong></span>
                              {totalRefunded > 0 && <span>&bull; Refunded: <strong className="text-rose-700">{currency(totalRefunded)}</strong> &bull; Net: <strong className="text-indigo-700">{currency(netAdvancePaid)}</strong></span>}
                              {totalAdvancePaid > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const latestAdvance = (interactions || [])
                                      .find(i => i.interaction_type === "advance_payment" && Number(i.payment_amount) > 0);
                                    if (latestAdvance) {
                                      setSelectedInteraction(latestAdvance);
                                      setTimeout(() => handlePrintReceipt(), 150);
                                    } else {
                                      toast.error("No advance payment record found to print.");
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition ml-2"
                                >
                                  Print Receipt
                                </button>
                              )}
                            </p>
                          </div>
                        }>
                        {loadingPackages?(
                          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading packages...</div>
                        ):(
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><Tag className="h-3.5 w-3.5 text-slate-400"/>Package <span className="text-rose-500">*</span></label>
                              <select value={selectedPackageId} onChange={e=>{
                                setSelectedPackageId(e.target.value);
                                const pkg=packages.find((p:SurgeryPackage)=>p.id===e.target.value);
                                if(pkg) { 
                                  const { price, error } = getPackagePrice(pkg,plannedSurgery);
                                  setPackageError(error || null);
                                  if (price !== null) {
                                    setAgreedPrice(String(price)); setDiscount("0"); 
                                  } else {
                                    setAgreedPrice(""); setDiscount("0");
                                  }
                                }
                              }} className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-emerald-400">
                                <option value="">Select package...</option>
                                {packages.map((pkg:SurgeryPackage)=>{
                                  const { price } = getPackagePrice(pkg,plannedSurgery);
                                  return (
                                    <option key={pkg.id} value={pkg.id}>{pkg.name} — {price !== null ? currency(price) : "Price Error"}{pkg.is_default?" [Default]":""}</option>
                                  );
                                })}
                              </select>
                            </div>
                            
                            {packageError && (
                              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-rose-800">Cannot determine package price</p>
                                  <p className="text-xs text-rose-700 mt-0.5">{packageError}</p>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><Tag className="h-3.5 w-3.5 text-slate-400"/>Base Price</label>
                                <div className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
                                  {selectedPackageId && packages.length > 0 ? (
                                      getPackagePrice(packages.find((p: SurgeryPackage) => p.id === selectedPackageId)!, plannedSurgery).price !== null ? currency(getPackagePrice(packages.find((p: SurgeryPackage) => p.id === selectedPackageId)!, plannedSurgery).price!) : "Error"
                                  ) : "—"}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><Tag className="h-3.5 w-3.5 text-slate-400"/>Discount (₹)</label>
                                <input type="number" value={discount} onChange={e => handleDiscountChange(e.target.value)} className="w-full text-sm font-semibold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-emerald-400" placeholder="Discount"/>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><IndianRupee className="h-3.5 w-3.5 text-slate-400"/>Agreed Price (Calculated)</label>
                              <div className="text-base font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                                {currency(parseFloat(agreedPrice) || 0)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400"/>Date <span className="text-slate-400 font-normal">(opt)</span></label>
                                <input type="date" value={plannedDate} onChange={e=>setPlannedDate(e.target.value)} min={getTodayDateLocal()} className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-emerald-400"/>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5"><Clock className="h-3.5 w-3.5 text-slate-400"/>Time <span className="text-slate-400 font-normal">(opt)</span></label>
                                <input type="time" value={plannedTime} onChange={e=>setPlannedTime(e.target.value)} className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-emerald-400"/>
                              </div>
                            </div>
                            {/* Advance */}
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Advance Payment</span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">OPTIONAL</span>
                              </div>
                              {totalAdvancePaid>0&&(
                                <div className="text-xs bg-white border border-emerald-200 rounded-lg p-2.5 space-y-1">
                                  <div className="flex justify-between"><span className="text-slate-500">Total advance paid:</span><span className="font-bold text-emerald-700">{currency(totalAdvancePaid)}</span></div>
                                  {totalRefunded>0&&(
                                    <>
                                      <div className="flex justify-between"><span className="text-slate-500">Total refunded:</span><span className="font-bold text-rose-700">-{currency(totalRefunded)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-500">Net advance:</span><span className="font-bold text-indigo-700">{currency(netAdvancePaid)}</span></div>
                                    </>
                                  )}
                                  <div className="flex justify-between"><span className="text-slate-500">Remaining balance:</span><span className="font-bold text-slate-800">{currency(remainingBalance)}</span></div>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">New Advance (₹)</label>
                                  <input type="number" value={advanceAmount} onChange={e=>setAdvanceAmount(e.target.value)} placeholder="e.g. 5000" max={remainingBalance}
                                    className={cx("w-full text-xs rounded-xl border px-2 py-2 outline-none font-semibold",advanceExceedsBalance?"border-rose-400 bg-rose-50 text-rose-800":"border-slate-200 bg-white focus:border-emerald-400")}/>
                                  {advanceExceedsBalance&&<p className="text-[9px] text-rose-600 font-semibold mt-1">Max: {currency(remainingBalance)}</p>}
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Payment Mode</label>
                                  <select value={advancePaymentMethod} onChange={e=>setAdvancePaymentMethod(e.target.value as any)} className="w-full text-xs rounded-xl border border-slate-200 bg-white px-2 py-2 outline-none focus:border-emerald-400 font-semibold">
                                    <option value="upi">UPI</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="cheque">Cheque</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Reference / Txn #</label>
                                  <input type="text" value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Txn Ref" className="w-full text-xs rounded-xl border border-slate-200 bg-white px-2 py-2 outline-none focus:border-emerald-400"/>
                                </div>
                              </div>
                              {advanceExceedsBalance&&(
                                <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0"/><p className="text-xs font-semibold text-rose-700">Advance cannot exceed {currency(remainingBalance)}.</p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Notes (Optional)</label>
                              <textarea rows={2} value={confirmNotes} onChange={e=>setConfirmNotes(e.target.value)} placeholder="Any remarks..." className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-emerald-400 resize-none"/>
                            </div>
                            <button onClick={handleConfirmSave} disabled={savingConfirm||!selectedPackageId||!agreedPrice||advanceExceedsBalance||!!packageError} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow transition">
                              {savingConfirm?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}
                              {step3Done?"Update Booking":"Save and Confirm Booking"}
                            </button>
                          </div>
                        )}
                      </StepCard>

                      {/* STEP 4 */}
                      <StepCard n={4} title="Mark as Planned" done={step4Done} active={step3Done&&!step4Done} blocked={!step3Done} blockedLabel="Confirm booking first"
                        doneSummary={<p className="text-xs text-slate-600">Surgery is <strong className="text-emerald-700">Planned</strong> — ready for release</p>}>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs">
                          <p className="text-slate-500 italic">Status is automatically set to Planned when you save the booking in Step 3.</p>
                        </div>
                      </StepCard>

                      {/* STEP 5 */}
                      <StepCard n={5} title="Release to Day Care" done={step5Done} active={step4Done&&!step5Done} blocked={!step4Done} blockedLabel="Complete booking first"
                        doneSummary={<p className="text-xs text-slate-600">Patient <strong className="text-violet-700">released to Day Care</strong></p>}>
                        <div className="space-y-3">
                          <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3.5 space-y-2">
                            <p className="text-xs font-semibold text-violet-800">Pre-release checklist</p>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/><span>Counselling session documented</span></div>
                              <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/><span>Package and agreed price confirmed</span></div>
                              <div className={cx("flex items-center gap-2",totalAdvancePaid===0?"text-slate-400":"")}>
                                {totalAdvancePaid>0?<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>:<div className="h-3.5 w-3.5 rounded-full border border-slate-300"/>}
                                <span>Advance collected ({currency(totalAdvancePaid)}){totalAdvancePaid===0?" — optional":""}</span>
                              </div>
                              <div className={cx("flex items-center gap-2",!plannedSurgery.planned_date?"text-slate-400":"")}>
                                {plannedSurgery.planned_date?<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>:<div className="h-3.5 w-3.5 rounded-full border border-slate-300"/>}
                                <span>Surgery date set ({plannedSurgery.planned_date?formatDateDisplay(plannedSurgery.planned_date):"not set"}){!plannedSurgery.planned_date?" — optional":""}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={handleRelease} disabled={releasing} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow transition">
                            {releasing?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowRight className="h-4 w-4"/>}Release to Day Care
                          </button>
                        </div>
                      </StepCard>

                      {/* Day Care Billing & Payment Section */}
                      {dayCareVisit && (
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/20 p-4 space-y-4">
                          <h3 className="text-sm font-bold text-sky-950 flex items-center gap-1.5 border-b border-sky-100 pb-2">
                            <IndianRupee className="h-4 w-4 text-sky-600" />
                            Surgery Billing & Payments (Counsellor View)
                          </h3>
                          
                          {loadingInvoice ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin" /> Loading billing records...
                            </div>
                          ) : invoice ? (
                            <div className="space-y-3">
                              {/* Invoice Details */}
                              <div className="grid grid-cols-2 gap-3 text-xs bg-white border border-sky-100 rounded-xl p-3">
                                <div><span className="text-slate-400">Invoice No.</span><p className="font-bold text-slate-800">{invoice.invoice_number}</p></div>
                                <div><span className="text-slate-400">Invoice Date</span><p className="font-medium text-slate-800">{formatDateDisplay(invoice.invoice_date)}</p></div>
                                <div><span className="text-slate-400">Total Billed Amount</span><p className="font-bold text-slate-900">{currency(invoice.total_amount)}</p></div>
                                <div><span className="text-slate-400">Status</span>
                                  <p className="mt-0.5">
                                    <span className={cx(
                                      "inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                                      invoice.status === "paid" ? "bg-emerald-100 text-emerald-800" :
                                        invoice.status === "partial" ? "bg-amber-100 text-amber-800" :
                                          "bg-rose-100 text-rose-800"
                                    )}>
                                      {invoice.status}
                                    </span>
                                  </p>
                                </div>
                                <div className="col-span-2 flex justify-between pt-1 border-t border-slate-100 mt-1">
                                  <span className="font-semibold text-slate-600">Total Paid Amount:</span>
                                  <span className="font-bold text-emerald-700">{currency(invoice.paid_amount)}</span>
                                </div>
                                <div className="col-span-2 flex justify-between">
                                  <span className="font-semibold text-slate-600">Remaining Balance:</span>
                                  <span className="font-bold text-rose-700">{currency(Math.max(0, invoice.total_amount - invoice.paid_amount))}</span>
                                </div>
                              </div>

                              {/* Payments History List */}
                              {payments.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Payment Collection Logs</span>
                                  <div className="space-y-1.5">
                                    {payments.map(p => (
                                      <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-white border border-slate-100 rounded-lg">
                                        <div>
                                          <span className="font-semibold text-slate-800 capitalize">{p.payment_method} Payment</span>
                                          {p.payment_reference && <span className="text-slate-500 ml-1">({p.payment_reference})</span>}
                                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(p.payment_date).toLocaleString()}</p>
                                        </div>
                                        <span className="font-bold text-emerald-700">+{currency(p.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Collect Payment trigger/form */}
                              {invoice.status !== "paid" && (
                                <div className="pt-2">
                                  {!isCollectingPayment ? (
                                    <button
                                      onClick={() => setIsCollectingPayment(true)}
                                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                                    >
                                      Collect Remaining Balance
                                    </button>
                                  ) : (
                                    <div className="bg-white border border-sky-100 rounded-xl p-3.5 space-y-3 shadow-xs">
                                      <div className="flex items-center justify-between border-b pb-2 mb-1">
                                        <span className="text-xs font-bold text-slate-700">Collect Surgery Payment</span>
                                        <button onClick={() => setIsCollectingPayment(false)} className="text-[10px] text-slate-400 hover:underline">Cancel</button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Amount (₹)</label>
                                          <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            placeholder="e.g. 15000"
                                            className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-sky-400 font-semibold"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Payment Method</label>
                                          <select
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                                            className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white outline-none focus:border-sky-400 font-medium"
                                          >
                                            <option value="upi">UPI / QR</option>
                                            <option value="cash">Cash</option>
                                            <option value="card">Debit/Credit Card</option>
                                            <option value="cheque">Cheque</option>
                                          </select>
                                        </div>
                                        <div className="col-span-2">
                                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Payment Ref / UPI Trans ID</label>
                                          <input
                                            type="text"
                                            value={payReference}
                                            onChange={e => setPayReference(e.target.value)}
                                            placeholder="e.g. TXN987241"
                                            className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-sky-400"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="text-[11px] font-medium text-slate-500 block mb-1">Remarks</label>
                                          <input
                                            type="text"
                                            value={paymentNotes}
                                            onChange={e => setPaymentNotes(e.target.value)}
                                            placeholder="e.g. Balance payment cleared"
                                            className="w-full text-xs rounded-lg border border-slate-200 p-2 outline-none focus:border-sky-400"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={handleCollectPayment}
                                        disabled={savingPayment || !paymentAmount}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                                      >
                                        {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save Collected Payment
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500 bg-white border border-sky-100 rounded-xl p-3">
                                No invoice has been generated for the surgery package yet. You can generate the final invoice now using the negotiated package price.
                              </p>
                              <button
                                onClick={handleGenerateInvoice}
                                disabled={generatingInvoice}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-700 hover:bg-sky-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                              >
                                {generatingInvoice && <Loader2 className="h-4 w-4 animate-spin" />}
                                Generate Surgery Invoice ({currency(plannedSurgery.agreed_price || 0)})
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {plannedSurgery.postponement_reason&&(
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                          <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">Postponement Reason</h4>
                          <p className="text-sm text-amber-950">{plannedSurgery.postponement_reason}</p>
                        </div>
                      )}
                      {plannedSurgery.cancellation_reason&&(
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                          <h4 className="text-xs font-semibold text-rose-900 uppercase tracking-wider mb-1">Cancellation Reason</h4>
                          <p className="text-sm text-rose-950">{plannedSurgery.cancellation_reason}</p>
                        </div>
                      )}

                      {/* Interaction History */}
                      {loadingData?(
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading...</div>
                      ):(
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                          <button onClick={()=>setHistoryOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700 transition">
                            <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400"/>Interaction History ({interactions.length})</span>
                            {historyOpen?<ChevronUp className="h-4 w-4 text-slate-400"/>:<ChevronDown className="h-4 w-4 text-slate-400"/>}
                          </button>
                          {historyOpen&&(
                            <div className="p-4 space-y-3">
                              {interactions.length===0?(
                                <p className="text-xs text-slate-400 text-center py-4">No interactions yet.</p>
                              ):(
                                <div className="relative pl-4 border-l-2 border-slate-200 space-y-3">
                                  {interactions.map((item:CounsellorInteraction)=>(
                                    <div key={item.id} className="relative">
                                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-4 ring-white"/>
                                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                          <span className="font-semibold text-slate-800">{item.counsellor_name||"Counsellor"} — <span className="capitalize text-sky-700">{item.interaction_type.replace(/_/g," ")}</span></span>
                                          <span>{new Date(item.interaction_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-800 whitespace-pre-line">{item.notes}</p>
                                        <div className="flex flex-wrap gap-2 text-xs items-center">
                                          {item.package_name&&<span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">Pkg: {item.package_name}</span>}
                                          {item.payment_amount&&Number(item.payment_amount)!==0&&<span className={cx("px-2 py-0.5 rounded border font-semibold", Number(item.payment_amount)>0?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-rose-50 text-rose-700 border-rose-200")}>{Number(item.payment_amount)>0?"Advance: ":"Refund: "}{currency(Math.abs(Number(item.payment_amount)))}</span>}
                                          {item.to_status&&<span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">to: {STATUS_LABELS[item.to_status]||item.to_status}</span>}
                                          {item.interaction_type==="advance_payment"&&Number(item.payment_amount)>0&&(
                                            <button onClick={()=>{setSelectedInteraction(item);setTimeout(()=>handlePrintReceipt(),150);}} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-semibold transition">
                                              <Printer className="h-3 w-3"/>Print Receipt
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {history.length>0&&(
                                <details className="mt-2">
                                  <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">Audit Trail ({history.length})</summary>
                                  <div className="mt-2 space-y-1.5">
                                    {history.map((h:SurgeryAdviceHistory)=>(
                                      <div key={h.id} className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                        <div>
                                          <span className="font-semibold capitalize">{h.action_type.replace(/_/g," ")}</span>
                                          {h.changed_by_name&&<span className="text-slate-500 ml-1">by {h.changed_by_name}</span>}
                                          {h.old_value&&h.new_value&&<p className="font-mono text-slate-500 mt-0.5">{h.old_value} to {h.new_value}</p>}
                                        </div>
                                        <span className="text-slate-400 shrink-0 ml-2">{new Date(h.changed_at).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
        {plannedSurgery && (
          <AdvancePaymentReceipt
            ref={receiptRef}
            interaction={selectedInteraction || { id: "", interaction_type: "advance_payment", payment_amount: 0, notes: "", interaction_at: new Date().toISOString() } as CounsellorInteraction}
            plannedSurgery={plannedSurgery}
            totalAdvancePaid={totalAdvancePaid}
          />
        )}
      </div>
      {logModalOpen&&<LogInteractionModal isOpen={logModalOpen} onClose={()=>setLogModalOpen(false)} onSuccess={()=>{onRefresh();setLogModalOpen(false);}} plannedSurgery={plannedSurgery}/>}
      {(postponeModalOpen||cancelModalOpen)&&<PostponeCancelModal isOpen={postponeModalOpen||cancelModalOpen} onClose={()=>{setPostponeModalOpen(false);setCancelModalOpen(false);}} onSuccess={onRefresh} plannedSurgery={plannedSurgery} mode={postponeModalOpen?"postpone":"cancel"} totalAdvancePaid={totalAdvancePaid}/>}
    </>
  );
}
