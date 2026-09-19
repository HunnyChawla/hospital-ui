"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ClipboardList,
  PlusCircle,
  FlaskConical,
  Radio,
  Activity,
  Utensils,
  HeartHandshake,
  FileText,
  AlertCircle,
  CheckCircle2,
  StopCircle,
  XCircle,
  X,
  Search,
  Clock,
  Scissors,
  Loader2,
} from "lucide-react";
import { IpdOrder } from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { labTestsApi, LabTest } from "@/services/labTestsApi";
import { surgeriesApi, SurgeryPrescriptionOption } from "@/services/surgeriesApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { BodyPartPicker } from "@/components/planned-surgeries/BodyPartPicker";
import { BodyPartBadge } from "@/components/shared/BodyPartBadge";
import { toast } from "sonner";
import { getErrorMessage, handleError } from "@/utils/errorHandler";
import { currency, getTodayDateLocal } from "@/utils/format";
import { ScrollableContainer } from "@/components/common/ScrollableContainer";

interface IpdOrdersTabProps {
  admissionId: string;
  patientId?: string;
  doctorId?: string;
  orders: IpdOrder[];
  onRefresh: () => void;
  isDischarged?: boolean;
  isDoctor?: boolean;
}

const CATEGORIES: { id: string; label: string; icon: any }[] = [
  { id: "all", label: "All Orders", icon: ClipboardList },
  { id: "procedure", label: "Procedure / Surgery", icon: Scissors },
  { id: "lab", label: "Lab Orders", icon: FlaskConical },
  { id: "radiology", label: "Radiology", icon: Radio },
  { id: "diet", label: "Diet Orders", icon: Utensils },
  { id: "nursing_instruction", label: "Nursing Instructions", icon: HeartHandshake },
  { id: "medication", label: "Medication", icon: Activity },
  { id: "other", label: "Other", icon: FileText },
];

export function IpdOrdersTab({
  admissionId,
  patientId,
  doctorId,
  orders,
  onRefresh,
  isDischarged = false,
  isDoctor = true,
}: IpdOrdersTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [discontinuingOrder, setDiscontinuingOrder] = useState<IpdOrder | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState("");

  // Add Order form state
  const [orderCategory, setOrderCategory] = useState<string>("procedure");
  const [orderTitle, setOrderTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<string>("routine");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingDiscontinue, setSubmittingDiscontinue] = useState(false);

  // Lab Catalog search state
  const [availableLabTests, setAvailableLabTests] = useState<LabTest[]>([]);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [isLabSearchFocused, setIsLabSearchFocused] = useState(false);

  // Radiology Catalog search state
  const [availableRadiologyTests, setAvailableRadiologyTests] = useState<LabTest[]>([]);
  const [selectedRadiologyTest, setSelectedRadiologyTest] = useState<LabTest | null>(null);
  const [radiologySearchQuery, setRadiologySearchQuery] = useState("");
  const [isRadiologySearchFocused, setIsRadiologySearchFocused] = useState(false);

  // Surgery Catalog search state (identical surgery-first architecture to prescription panel)
  const [surgerySearchQuery, setSurgerySearchQuery] = useState("");
  const [surgeryResults, setSurgeryResults] = useState<SurgeryPrescriptionOption[]>([]);
  const [searchingSurgeries, setSearchingSurgeries] = useState(false);
  const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<SurgeryPrescriptionOption | null>(null);
  const [selectedBodyPartId, setSelectedBodyPartId] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState("");
  const [advisedDate, setAdvisedDate] = useState(getTodayDateLocal());
  const [saveToPlannedSchedule, setSaveToPlannedSchedule] = useState(true);
  const surgerySearchRef = useRef<HTMLDivElement>(null);
  const labSearchRef = useRef<HTMLDivElement>(null);
  const radiologySearchRef = useRef<HTMLDivElement>(null);

  const minDate = getTodayDateLocal();

  // Load Lab & Radiology Catalog on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [labRes, radioRes] = await Promise.all([
          labTestsApi.list({ is_active: true, page_size: 200, test_type: "lab" }),
          labTestsApi.list({ is_active: true, page_size: 200, test_type: "radiology" }),
        ]);
        setAvailableLabTests(labRes.items || []);
        setAvailableRadiologyTests(radioRes.items || []);
      } catch (err) {
        console.error("Failed to load catalog in OrdersTab:", err);
      }
    };
    loadCatalog();
  }, []);

  // Debounced backend search for surgery catalog
  useEffect(() => {
    if (!showAddModal || orderCategory !== "procedure") return;
    const handler = setTimeout(async () => {
      setSearchingSurgeries(true);
      try {
        const response = await surgeriesApi.listForPrescription({
          search: surgerySearchQuery.trim() || undefined,
          page_size: 20,
        });
        setSurgeryResults(response.items || []);
      } catch (error) {
        handleError(error, { defaultMessage: "Failed to search surgeries", logError: true });
      } finally {
        setSearchingSurgeries(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [surgerySearchQuery, showAddModal, orderCategory]);

  // Close surgery, lab, and radiology dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (surgerySearchRef.current && !surgerySearchRef.current.contains(e.target as Node)) {
        setShowSurgeryDropdown(false);
      }
      if (labSearchRef.current && !labSearchRef.current.contains(e.target as Node)) {
        setIsLabSearchFocused(false);
      }
      if (radiologySearchRef.current && !radiologySearchRef.current.contains(e.target as Node)) {
        setIsRadiologySearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLabCatalog = useMemo(() => {
    const q = labSearchQuery.trim().toLowerCase();
    if (!q) return availableLabTests.slice(0, 15);
    return availableLabTests.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.test_code.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [availableLabTests, labSearchQuery]);

  const filteredRadiologyCatalog = useMemo(() => {
    const q = radiologySearchQuery.trim().toLowerCase();
    if (!q) return availableRadiologyTests.slice(0, 15);
    return availableRadiologyTests.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.test_code.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [availableRadiologyTests, radiologySearchQuery]);

  // Quick preset chips for convenience
  const PROCEDURE_PRESETS = [
    "Phacoemulsification with Foldable IOL",
    "Small Incision Cataract Surgery (SICS)",
    "Trabeculectomy with MMC",
    "Pterygium Excision with Conjunctival Autograft",
    "Intravitreal Anti-VEGF Injection",
    "Pars Plana Vitrectomy (PPV)",
    "Chalazion Incision & Curettage",
    "Dacryocystorhinostomy (DCR)",
    "Nd:YAG Laser Capsulotomy",
    "Wound Debridement & Dressing",
  ];

  const RADIOLOGY_PRESETS = [
    "X-Ray Chest PA View",
    "Ultrasound (USG) Whole Abdomen & Pelvis",
    "CT Scan Head / Brain (Plain / NCCT)",
    "High Resolution CT Chest (HRCT)",
    "MRI Brain (Plain)",
    "2D Echocardiography with Color Doppler",
  ];

  const DIET_PRESETS = [
    "Diabetic Diet (Low glycemic index, no refined sugar)",
    "Low Sodium Diet (Salt restricted < 2g/day)",
    "NPO (Nil by mouth / Fasting for procedure)",
    "Soft / Semi-solid Diet",
    "High Protein Diet",
    "Clear Liquid Diet",
  ];

  const NURSING_PRESETS = [
    "Q2H Vitals Monitoring (BP, Pulse, Temp, SpO2)",
    "Strict Intake & Output (I/O) Charting",
    "Elevate Head of Bed 30-45 Degrees",
    "Continuous Cardiac & Pulse Oximetry Monitoring",
    "2 hourly position changes / DVT prophylaxis",
    "Blood Sugar Monitoring (QID before meals)",
  ];

  const handleCategorySelectForAdd = (cat: string) => {
    setOrderCategory(cat);
    setSelectedLabTest(null);
    setLabSearchQuery("");
    setSelectedRadiologyTest(null);
    setRadiologySearchQuery("");
    setSelectedSurgery(null);
    setSurgerySearchQuery("");
    setSelectedBodyPartId(null);
    setPlannedDate("");
    setAdvisedDate(getTodayDateLocal());
    setOrderTitle("");
    if (cat === "diet") setOrderTitle(DIET_PRESETS[0]);
    if (cat === "nursing_instruction") setOrderTitle(NURSING_PRESETS[0]);
  };

  const handleSelectLabTest = (t: LabTest) => {
    setSelectedLabTest(t);
    setOrderTitle(t.test_name);
    setLabSearchQuery(t.test_name);
  };

  const handleSelectRadiologyTest = (t: LabTest) => {
    setSelectedRadiologyTest(t);
    setOrderTitle(t.test_name);
    setRadiologySearchQuery(t.test_name);
    setIsRadiologySearchFocused(false);
  };

  const handleSelectSurgery = (surgery: SurgeryPrescriptionOption) => {
    setSelectedSurgery(surgery);
    setSurgerySearchQuery(surgery.name);
    setOrderTitle(surgery.name);
    setShowSurgeryDropdown(false);
    // 0/1/2+ body part convention matching prescription panel
    setSelectedBodyPartId(surgery.body_parts.length === 1 ? surgery.body_parts[0].id : null);
  };

  const handleSelectProcedurePreset = (preset: string) => {
    setOrderTitle(preset);
    setSurgerySearchQuery(preset);
    const matched = surgeryResults.find((s) =>
      s.name.toLowerCase().includes(preset.toLowerCase().slice(0, 10))
    );
    if (matched) {
      handleSelectSurgery(matched);
    } else {
      setSelectedSurgery(null);
      setSelectedBodyPartId(null);
    }
  };

  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDoctor) {
      toast.error("Only attending doctors can create clinical orders.");
      return;
    }

    let finalTitle = orderTitle.trim();
    let labTestIdToSave: string | null = null;
    if (orderCategory === "lab" && selectedLabTest) {
      finalTitle = selectedLabTest.test_name;
      labTestIdToSave = selectedLabTest.id;
    } else if (orderCategory === "radiology" && selectedRadiologyTest) {
      finalTitle = selectedRadiologyTest.test_name;
      labTestIdToSave = selectedRadiologyTest.id;
    } else if (orderCategory === "procedure" && selectedSurgery) {
      const bp = selectedSurgery.body_parts.find((b) => b.id === selectedBodyPartId);
      finalTitle = bp ? `${selectedSurgery.name} (${bp.name})` : selectedSurgery.name;
    }

    if (!finalTitle) {
      toast.error("Please enter order title or select from catalog");
      return;
    }

    // Validation for multi-body-part surgery
    if (orderCategory === "procedure" && selectedSurgery && selectedSurgery.body_parts.length > 1 && !selectedBodyPartId) {
      toast.error("Please select the applicable body part for this surgery");
      return;
    }

    setSubmittingAdd(true);
    try {
      // 1. Create IPD Doctor Order
      await ipdDoctorApi.createOrder(admissionId, {
        order_category: orderCategory,
        order_title: finalTitle,
        instructions: instructions.trim() || null,
        priority,
        lab_test_id: labTestIdToSave,
      });

      // 2. If procedure selected from catalog & saveToPlannedSchedule is enabled, also create Planned Surgery
      if (orderCategory === "procedure" && selectedSurgery && patientId && saveToPlannedSchedule) {
        try {
          await plannedSurgeriesApi.create({
            patient_id: patientId,
            visit_id: null,
            surgery_id: selectedSurgery.id,
            surgery_name: selectedSurgery.name,
            body_part_id: selectedBodyPartId,
            planned_date: plannedDate || null,
            advised_date: advisedDate || getTodayDateLocal(),
            surgeon_id: doctorId || "",
            notes: instructions.trim() || null,
          });
          toast.success("Procedure order placed & surgery planned successfully");
        } catch (planErr: any) {
          console.warn("Planned surgery schedule creation notice:", planErr);
          toast.success("Procedure order placed in patient chart");
        }
      } else {
        toast.success("Doctor order placed successfully");
      }

      setShowAddModal(false);
      setOrderTitle("");
      setSelectedLabTest(null);
      setLabSearchQuery("");
      setSelectedRadiologyTest(null);
      setRadiologySearchQuery("");
      setSelectedSurgery(null);
      setSurgerySearchQuery("");
      setSelectedBodyPartId(null);
      setPlannedDate("");
      setAdvisedDate(getTodayDateLocal());
      setInstructions("");
      setPriority("routine");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to create order");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleDiscontinueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDoctor) {
      toast.error("Only attending doctors can discontinue clinical orders.");
      return;
    }
    if (!discontinuingOrder) return;
    if (!discontinueReason.trim()) {
      toast.error("Please provide a discontinue reason");
      return;
    }

    setSubmittingDiscontinue(true);
    try {
      await ipdDoctorApi.discontinueOrder(discontinuingOrder.id, discontinueReason.trim());
      toast.success(
        discontinuingOrder.order_category === "lab"
          ? "Lab order cancelled"
          : discontinuingOrder.order_category === "procedure"
          ? "Procedure order cancelled"
          : "Order discontinued"
      );
      setDiscontinuingOrder(null);
      setDiscontinueReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err) ||
          (discontinuingOrder.order_category === "lab"
            ? "Failed to cancel lab order"
            : "Failed to discontinue order")
      );
    } finally {
      setSubmittingDiscontinue(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedCategory === "all") return true;
    return o.order_category === selectedCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "procedure":
        return <Scissors className="h-4 w-4 text-amber-600" />;
      case "lab":
        return <FlaskConical className="h-4 w-4 text-sky-600" />;
      case "radiology":
        return <Radio className="h-4 w-4 text-purple-600" />;
      case "diet":
        return <Utensils className="h-4 w-4 text-emerald-600" />;
      case "nursing_instruction":
        return <HeartHandshake className="h-4 w-4 text-teal-600" />;
      case "medication":
        return <Activity className="h-4 w-4 text-indigo-600" />;
      default:
        return <ClipboardList className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        {/* Header & Add Button */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Doctor Orders & Instructions</h3>
                <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5">
                  {orders.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Procedures, surgery planning, lab orders, radiology, diet, and nursing care instructions
              </p>
            </div>
          </div>

          {!isDischarged && isDoctor && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleCategorySelectForAdd("procedure");
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs transition hover:bg-amber-100 cursor-pointer"
              >
                <Scissors className="h-3.5 w-3.5 text-amber-700" />
                <span>Plan Surgery / Procedure</span>
              </button>

              <button
                onClick={() => {
                  handleCategorySelectForAdd("procedure");
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Doctor Order</span>
              </button>
            </div>
          )}
        </div>

        {!isDoctor && (
          <div className="mt-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 flex items-center gap-2">
            <span>Clinical Instructions (View Only) — Review doctor orders, nursing instructions, diet plans, and procedure schedules. Creating or discontinuing clinical orders is restricted to attending doctors.</span>
          </div>
        )}

        {/* Category Pills */}
        <ScrollableContainer
          className="mt-3 flex items-center gap-1 sm:gap-1.5"
          contentClassName="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-hide min-w-0"
          buttonClassName="h-7 w-7 rounded-lg text-xs"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count =
              cat.id === "all"
                ? orders.length
                : orders.filter((o) => o.order_category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </ScrollableContainer>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No orders in this category</p>
            <p className="text-[11px] text-slate-400">Click &quot;Add Doctor Order&quot; to create a new order.</p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-2.5 sm:space-y-3">
            {filteredOrders.map((order) => {
              const isActive = order.status === "active";
              const isStat = order.priority === "stat";
              const isUrgent = order.priority === "urgent";
              const isProcedure = order.order_category === "procedure";

              return (
                <div
                  key={order.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 rounded-xl border p-3 sm:p-3.5 transition ${
                    isProcedure
                      ? isActive
                        ? "border-amber-200 bg-amber-50/20 hover:border-amber-400 hover:shadow-sm"
                        : "border-slate-100 bg-slate-50/60 opacity-80"
                      : isActive
                      ? "border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm"
                      : "border-slate-100 bg-slate-50/60 opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl ${
                        isProcedure ? "bg-amber-100 text-amber-700" : "bg-slate-100"
                      }`}
                    >
                      {getCategoryIcon(order.order_category)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          #{order.order_number}
                        </span>
                        <h4
                          className={`font-bold text-xs sm:text-sm text-slate-900 ${
                            !isActive ? "line-through text-slate-500" : ""
                          }`}
                        >
                          {order.order_title}
                        </h4>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isStat
                              ? "bg-rose-100 text-rose-800 animate-pulse"
                              : isUrgent
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.priority}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>

                        {isProcedure && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                            <Scissors className="h-3 w-3" />
                            Procedure / Surgery Order
                          </span>
                        )}

                        {/* If category is lab or radiology, show booking status badge */}
                        {(order.order_category === "lab" || order.order_category === "radiology") && (
                          order.has_results || order.booking_status === "completed" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Results Ready
                            </span>
                          ) : order.booking_id ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold border border-purple-200">
                              <Clock className="h-3 w-3" />
                              Booked ({order.booking_status || "In Progress"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                              <Clock className="h-3 w-3" />
                              {order.order_category === "radiology" ? "Pending Radiology Booking" : "Pending Lab Booking"}
                            </span>
                          )
                        )}
                      </div>

                      {order.instructions && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {order.instructions}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-1">
                        <span>Ordered by: <strong>{order.doctor_name || "Doctor"}</strong></span>
                        <span>
                          ⏱️ {new Date(order.ordered_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {order.discontinue_reason && (
                          <span className="text-rose-700">
                            Discontinued reason: {order.discontinue_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isActive && !isDischarged && isDoctor && (
                    <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                      <button
                        onClick={() => {
                          const isLab = order.order_category === "lab";
                          const isRadio = order.order_category === "radiology";
                          const isProc = order.order_category === "procedure";
                          setDiscontinuingOrder(order);
                          setDiscontinueReason(
                            isLab
                              ? "Cancelled by doctor"
                              : isRadio
                              ? "Radiology order cancelled"
                              : isProc
                              ? "Procedure cancelled / postponed"
                              : "Goal achieved / Completed"
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer shadow-2xs"
                      >
                        {order.order_category === "lab" || order.order_category === "radiology" || order.order_category === "procedure" ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        ) : (
                          <StopCircle className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>
                          {order.order_category === "lab" || order.order_category === "radiology" || order.order_category === "procedure"
                            ? "Cancel Order"
                            : "Discontinue"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Doctor Order / Plan Surgery */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {orderCategory === "procedure" ? (
                  <Scissors className="h-5 w-5 text-amber-600" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-sky-600" />
                )}
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {orderCategory === "procedure" ? "Plan Surgery / Order Procedure" : "Add Doctor Order"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrderSubmit} className="mt-4 space-y-3.5 sm:space-y-4 text-xs">
              {/* Category Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Order Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "procedure", label: "Procedure / Surgery", icon: Scissors },
                    { id: "lab", label: "Lab Order", icon: FlaskConical },
                    { id: "radiology", label: "Radiology", icon: Radio },
                    { id: "diet", label: "Diet Order", icon: Utensils },
                    { id: "nursing_instruction", label: "Nursing Care", icon: HeartHandshake },
                    { id: "other", label: "Other", icon: FileText },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = orderCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelectForAdd(cat.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? cat.id === "procedure"
                              ? "border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-400"
                              : "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Procedure / Surgery Search (Identical to Prescription Panel) */}
              {orderCategory === "procedure" ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Search Surgery Catalog <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative" ref={surgerySearchRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={surgerySearchQuery}
                          onChange={(e) => {
                            setSurgerySearchQuery(e.target.value);
                            setOrderTitle(e.target.value);
                            setSelectedSurgery(null);
                            setShowSurgeryDropdown(true);
                          }}
                          onFocus={() => setShowSurgeryDropdown(true)}
                          placeholder="Search surgeries by name, category..."
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                          required
                        />
                        {surgerySearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSurgery(null);
                              setSurgerySearchQuery("");
                              setOrderTitle("");
                              setSelectedBodyPartId(null);
                              setShowSurgeryDropdown(false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {showSurgeryDropdown && (
                        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                          {searchingSurgeries ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                            </div>
                          ) : surgeryResults.length === 0 ? (
                            <p className="px-3 py-2.5 text-xs text-slate-500">
                              No matching surgeries found in catalog. You can still order by typing custom name.
                            </p>
                          ) : (
                            surgeryResults.map((surg) => (
                              <button
                                key={surg.id}
                                type="button"
                                onClick={() => handleSelectSurgery(surg)}
                                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-amber-50/80 transition cursor-pointer"
                              >
                                <span className="font-bold text-slate-900 text-xs">{surg.name}</span>
                                {surg.category && (
                                  <span className="text-[10px] text-slate-500">{surg.category}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Surgery Banner */}
                  {selectedSurgery && (
                    <div className="flex items-center justify-between rounded-xl bg-white border border-amber-300 p-2.5 shadow-2xs">
                      <div>
                        <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wide">
                          Selected Surgery
                        </span>
                        <p className="font-bold text-slate-900 text-xs">{selectedSurgery.name}</p>
                        {selectedSurgery.category && (
                          <p className="text-[10px] text-slate-500">{selectedSurgery.category}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSurgery(null);
                          setSurgerySearchQuery("");
                          setOrderTitle("");
                          setSelectedBodyPartId(null);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Remove surgery"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Body Part Selection (surfaced when selected surgery has 2+ body parts) */}
                  {selectedSurgery && selectedSurgery.body_parts.length > 1 && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Body Part / Eye <span className="text-rose-500">*</span>
                      </label>
                      <BodyPartPicker
                        bodyParts={selectedSurgery.body_parts}
                        value={selectedBodyPartId}
                        onChange={setSelectedBodyPartId}
                      />
                    </div>
                  )}

                  {selectedSurgery && selectedSurgery.body_parts.length === 1 && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold">Body Part:</span>
                      <BodyPartBadge
                        name={selectedSurgery.body_parts[0].name}
                        laterality={selectedSurgery.body_parts[0].laterality}
                        department={selectedSurgery.body_parts[0].department}
                      />
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Advised Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={advisedDate}
                        onChange={(e) => setAdvisedDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Planned Surgery Date <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={plannedDate}
                        onChange={(e) => setPlannedDate(e.target.value)}
                        min={minDate}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Common Presets */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600 mb-1">Common Procedures & Surgeries:</p>
                    <div className="flex flex-wrap gap-1">
                      {PROCEDURE_PRESETS.map((preset) => {
                        const isSelected =
                          selectedSurgery?.name.toLowerCase().includes(preset.toLowerCase().slice(0, 10)) ||
                          orderTitle.toLowerCase() === preset.toLowerCase();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSelectProcedurePreset(preset)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer border ${
                              isSelected
                                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                : "bg-white border-amber-200 text-amber-900 hover:bg-amber-100"
                            }`}
                          >
                            {preset.split("(")[0].trim()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Checkbox: Add to Planned Surgeries Schedule */}
                  {patientId && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={saveToPlannedSchedule}
                        onChange={(e) => setSaveToPlannedSchedule(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        Record in Patient&apos;s Planned Surgeries / OT Schedule
                      </span>
                    </label>
                  )}
                </div>
              ) : orderCategory === "lab" ? (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Catalog Lab Test <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative" ref={labSearchRef}>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search lab test by name, code, category..."
                      value={labSearchQuery}
                      onFocus={() => setIsLabSearchFocused(true)}
                      onChange={(e) => {
                        setLabSearchQuery(e.target.value);
                        setOrderTitle(e.target.value);
                        setSelectedLabTest(null);
                        setIsLabSearchFocused(true);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs focus:border-sky-500 focus:outline-none"
                      required
                    />
                    {labSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLabTest(null);
                          setOrderTitle("");
                          setLabSearchQuery("");
                          setIsLabSearchFocused(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        title="Clear selection"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {isLabSearchFocused && !selectedLabTest && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                        {filteredLabCatalog.length === 0 ? (
                          <div className="p-3 text-center text-slate-500 text-xs">
                            {labSearchQuery.trim()
                              ? `No matching lab tests found in catalog.`
                              : "No lab tests found in database catalog."}
                          </div>
                        ) : (
                          filteredLabCatalog.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                handleSelectLabTest(t);
                                setIsLabSearchFocused(false);
                              }}
                              className="flex w-full items-center justify-between p-2.5 hover:bg-sky-50 transition cursor-pointer text-left text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{t.test_name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Code: {t.test_code} • {t.category || "General"}
                                </p>
                              </div>
                              <span className="font-bold text-sky-700">{currency(t.price || 0)}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedLabTest && (
                    <div className="flex items-center justify-between rounded-xl bg-sky-50 border border-sky-200 p-2.5">
                      <div>
                        <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wide">Selected Catalog Test</span>
                        <p className="font-bold text-slate-900 text-xs">{selectedLabTest.test_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Code: {selectedLabTest.test_code} • {selectedLabTest.category || "General"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-700">{currency(selectedLabTest.price || 0)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLabTest(null);
                            setOrderTitle("");
                            setLabSearchQuery("");
                            setIsLabSearchFocused(false);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          title="Remove / Unselect test"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : orderCategory === "radiology" ? (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Search & Select Radiology Test <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative" ref={radiologySearchRef}>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search X-Ray, USG, CT Scan, MRI, Echo..."
                      value={radiologySearchQuery}
                      onFocus={() => setIsRadiologySearchFocused(true)}
                      onChange={(e) => {
                        setRadiologySearchQuery(e.target.value);
                        setOrderTitle(e.target.value);
                        setSelectedRadiologyTest(null);
                        setIsRadiologySearchFocused(true);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                      required
                    />
                    {radiologySearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRadiologyTest(null);
                          setOrderTitle("");
                          setRadiologySearchQuery("");
                          setIsRadiologySearchFocused(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        title="Clear selection"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {isRadiologySearchFocused && !selectedRadiologyTest && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                        {filteredRadiologyCatalog.length === 0 ? (
                          <div className="p-3 text-center text-slate-500 text-xs">
                            {radiologySearchQuery.trim()
                              ? "No matching radiology tests found in catalog."
                              : "No radiology tests found in database catalog."}
                          </div>
                        ) : (
                          filteredRadiologyCatalog.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSelectRadiologyTest(t)}
                              className="flex w-full items-center justify-between p-2.5 hover:bg-purple-50 transition cursor-pointer text-left text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{t.test_name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Code: {t.test_code} • {t.category || "Radiology"}
                                </p>
                              </div>
                              <span className="font-bold text-purple-700">{currency(t.price || 0)}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedRadiologyTest && (
                    <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-200 p-2.5">
                      <div>
                        <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wide">Selected Radiology Investigation</span>
                        <p className="font-bold text-slate-900 text-xs">{selectedRadiologyTest.test_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Code: {selectedRadiologyTest.test_code} • {selectedRadiologyTest.category || "Radiology"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-700">{currency(selectedRadiologyTest.price || 0)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRadiologyTest(null);
                            setOrderTitle("");
                            setRadiologySearchQuery("");
                            setIsRadiologySearchFocused(false);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          title="Remove / Unselect test"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Common Presets */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Quick Radiology Presets:</p>
                    <div className="flex flex-wrap gap-1">
                      {RADIOLOGY_PRESETS.map((preset) => {
                        const matched = availableRadiologyTests.find((t) =>
                          t.test_name.toLowerCase().includes(preset.toLowerCase().slice(0, 10))
                        );
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (matched) {
                                handleSelectRadiologyTest(matched);
                              } else {
                                setOrderTitle(preset);
                                setRadiologySearchQuery(preset);
                              }
                            }}
                            className="rounded-lg bg-purple-50 border border-purple-200 px-2 py-1 text-[11px] font-medium text-purple-900 hover:bg-purple-100 transition cursor-pointer"
                          >
                            {preset.split("(")[0].trim()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Order Title / Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Diabetic Diet, Q2H Vitals, Physiotherapy..."
                    value={orderTitle}
                    onChange={(e) => setOrderTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Presets based on selected category */}
              {orderCategory === "diet" && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Quick Diet Presets:</p>
                  <div className="flex flex-wrap gap-1">
                    {DIET_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOrderTitle(preset)}
                        className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                      >
                        {preset.split(" ")[0]} {preset.split(" ")[1]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {orderCategory === "nursing_instruction" && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Quick Care Instructions:</p>
                  <div className="flex flex-wrap gap-1">
                    {NURSING_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOrderTitle(preset)}
                        className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        {preset.split("(")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {["routine", "urgent", "stat"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`rounded-xl border py-2 text-xs font-bold capitalize transition cursor-pointer ${
                        priority === p
                          ? p === "stat"
                            ? "border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                            : p === "urgent"
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-400"
                            : "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p === "stat" ? "STAT (Immediate)" : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {orderCategory === "procedure"
                    ? "Pre-operative / Procedure Instructions"
                    : "Specific Instructions (for Lab, Nursing, or Dietary Staff)"}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    orderCategory === "procedure"
                      ? "e.g. NPO after 10 PM; pre-op antibiotic eye drops Q1H; obtain cardiac & anesthesia fitness; prepare right eye..."
                      : "e.g. Draw sample before starting morning antibiotics; fasting sample required; check temp every 2 hours..."
                  }
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
                    orderCategory === "procedure"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                      : "bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700"
                  }`}
                >
                  {submittingAdd
                    ? "Placing Order..."
                    : orderCategory === "procedure"
                    ? "Plan Surgery / Place Order"
                    : "Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Discontinue / Cancel Order */}
      {discontinuingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                {discontinuingOrder.order_category === "lab" || discontinuingOrder.order_category === "procedure" ? (
                  <XCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <StopCircle className="h-5 w-5 text-rose-600" />
                )}
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {discontinuingOrder.order_category === "lab"
                    ? "Cancel Lab Investigation"
                    : discontinuingOrder.order_category === "procedure"
                    ? "Cancel Procedure Order"
                    : "Discontinue Order"}
                </h3>
              </div>
              <button
                onClick={() => setDiscontinuingOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDiscontinueSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold text-slate-900">{discontinuingOrder.order_title}</p>
                <p className="text-slate-600 capitalize">
                  Category: {discontinuingOrder.order_category.replace("_", " ")}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {discontinuingOrder.order_category === "lab" || discontinuingOrder.order_category === "procedure"
                    ? "Reason for Cancellation"
                    : "Reason for Discontinuation"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    discontinuingOrder.order_category === "lab"
                      ? "e.g. Test not required, Ordered in error, Duplicate test..."
                      : discontinuingOrder.order_category === "procedure"
                      ? "e.g. Surgery postponed, Patient not fit, Ordered in error..."
                      : "e.g. Completed, No longer required, Patient stable..."
                  }
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setDiscontinuingOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDiscontinue}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDiscontinue
                    ? "Processing..."
                    : discontinuingOrder.order_category === "lab" || discontinuingOrder.order_category === "procedure"
                    ? "Confirm Cancel"
                    : "Confirm Discontinue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
