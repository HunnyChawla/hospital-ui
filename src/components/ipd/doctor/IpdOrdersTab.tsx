"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { IpdOrder, OrderCategory } from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { labTestsApi, LabTest } from "@/services/labTestsApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { currency } from "@/utils/format";

interface IpdOrdersTabProps {
  admissionId: string;
  orders: IpdOrder[];
  onRefresh: () => void;
}

const CATEGORIES: { id: string; label: string; icon: any }[] = [
  { id: "all", label: "All Orders", icon: ClipboardList },
  { id: "medication", label: "Medication", icon: Activity },
  { id: "lab", label: "Lab Orders", icon: FlaskConical },
  { id: "radiology", label: "Radiology", icon: Radio },
  { id: "procedure", label: "Procedure", icon: Activity },
  { id: "diet", label: "Diet Orders", icon: Utensils },
  { id: "nursing_instruction", label: "Nursing Instructions", icon: HeartHandshake },
  { id: "other", label: "Other", icon: FileText },
];

export function IpdOrdersTab({
  admissionId,
  orders,
  onRefresh,
}: IpdOrdersTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [discontinuingOrder, setDiscontinuingOrder] = useState<IpdOrder | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState("");

  // Add Order form state
  const [orderCategory, setOrderCategory] = useState<string>("lab");
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

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await labTestsApi.list({ is_active: true, page_size: 150 });
        setAvailableLabTests(res.items || []);
      } catch (err) {
        console.error("Failed to load catalog in OrdersTab:", err);
      }
    };
    loadCatalog();
  }, []);

  const filteredLabCatalog = useMemo(() => {
    const q = labSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return availableLabTests.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.test_code.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [availableLabTests, labSearchQuery]);

  // Quick preset chips for convenience
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

  const LAB_PRESETS = [
    "Complete Blood Count (CBC) with ESR",
    "Serum Electrolytes (Na+, K+, Cl-)",
    "Liver Function Test (LFT)",
    "Renal Function Test / Serum Creatinine",
    "Blood Culture & Sensitivity",
    "Arterial Blood Gas (ABG)",
  ];

  const handleCategorySelectForAdd = (cat: string) => {
    setOrderCategory(cat);
    setSelectedLabTest(null);
    setLabSearchQuery("");
    if (cat === "diet" && !orderTitle) setOrderTitle(DIET_PRESETS[0]);
    if (cat === "nursing_instruction" && !orderTitle) setOrderTitle(NURSING_PRESETS[0]);
    if (cat === "lab" && !orderTitle) setOrderTitle(LAB_PRESETS[0]);
  };

  const handleSelectLabTest = (t: LabTest) => {
    setSelectedLabTest(t);
    setOrderTitle(t.test_name);
    setLabSearchQuery(t.test_name);
  };

  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = selectedLabTest ? selectedLabTest.test_name : orderTitle.trim();
    if (!finalTitle) {
      toast.error("Please enter order title or select from catalog");
      return;
    }

    setSubmittingAdd(true);
    try {
      await ipdDoctorApi.createOrder(admissionId, {
        order_category: orderCategory,
        order_title: finalTitle,
        instructions: instructions.trim() || null,
        priority,
        lab_test_id: selectedLabTest ? selectedLabTest.id : null,
      });

      toast.success("Order created successfully");
      setShowAddModal(false);
      setOrderTitle("");
      setSelectedLabTest(null);
      setLabSearchQuery("");
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
      case "lab":
        return <FlaskConical className="h-4 w-4 text-sky-600" />;
      case "radiology":
        return <Radio className="h-4 w-4 text-purple-600" />;
      case "diet":
        return <Utensils className="h-4 w-4 text-amber-600" />;
      case "nursing_instruction":
        return <HeartHandshake className="h-4 w-4 text-emerald-600" />;
      default:
        return <ClipboardList className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Header & Add Button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Doctor Orders & Instructions</h3>
              <p className="text-xs text-slate-500">
                Lab orders, radiology, diet, and nursing care instructions
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setOrderCategory("lab");
              setOrderTitle("");
              setInstructions("");
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Doctor Order</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === "all"
              ? orders.length
              : orders.filter((o) => o.order_category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
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
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No orders in this category</p>
            <p className="text-[11px] text-slate-400">Click &quot;Add Doctor Order&quot; to create a new order.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredOrders.map((order) => {
              const isActive = order.status === "active";
              const isStat = order.priority === "stat";
              const isUrgent = order.priority === "urgent";

              return (
                <div
                  key={order.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border p-3.5 transition ${
                    isActive
                      ? "border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm"
                      : "border-slate-100 bg-slate-50/60 opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      {getCategoryIcon(order.order_category)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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

                        {/* If category is lab, show booking status badge */}
                        {order.order_category === "lab" && (
                          order.has_results || order.booking_status === "completed" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Results Ready
                            </span>
                          ) : order.booking_id ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold border border-sky-200">
                              <Clock className="h-3 w-3" />
                              Booked ({order.booking_status || "In Progress"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                              <Clock className="h-3 w-3" />
                              Pending Lab Booking
                            </span>
                          )
                        )}
                      </div>

                      {order.instructions && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {order.instructions}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
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

                  {isActive && (
                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => {
                          const isLab = order.order_category === "lab";
                          setDiscontinuingOrder(order);
                          setDiscontinueReason(
                            isLab ? "Cancelled by doctor" : "Goal achieved / Completed"
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                      >
                        {order.order_category === "lab" ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        ) : (
                          <StopCircle className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>{order.order_category === "lab" ? "Cancel Order" : "Discontinue"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Doctor Order */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-sky-600" />
                <h3 className="font-bold text-slate-900">Add Doctor Order</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrderSubmit} className="mt-4 space-y-4 text-xs">
              {/* Category Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Order Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "lab", label: "Lab Order", icon: FlaskConical },
                    { id: "radiology", label: "Radiology", icon: Radio },
                    { id: "procedure", label: "Procedure", icon: Activity },
                    { id: "diet", label: "Diet Order", icon: Utensils },
                    { id: "nursing_instruction", label: "Nursing Care", icon: HeartHandshake },
                    { id: "other", label: "Other", icon: FileText },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelectForAdd(cat.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition ${
                          orderCategory === cat.id
                            ? "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-400"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Title or Searchable Lab Test Catalog */}
              {orderCategory === "lab" ? (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Catalog Lab Test <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search lab test by name, test code, or category..."
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
                  </div>

                  {isLabSearchFocused && !selectedLabTest && filteredLabCatalog.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md divide-y divide-slate-100">
                      {filteredLabCatalog.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            handleSelectLabTest(t);
                            setIsLabSearchFocused(false);
                          }}
                          className="p-2 hover:bg-sky-50 transition cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{t.test_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Code: {t.test_code} • {t.category || "General"}
                            </p>
                          </div>
                          <span className="font-bold text-slate-700">{currency(t.price || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}

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

                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Common Lab Tests:</p>
                    <div className="flex flex-wrap gap-1">
                      {LAB_PRESETS.map((preset) => {
                        const isSelected =
                          selectedLabTest?.test_name.toLowerCase().includes(preset.toLowerCase().slice(0, 10)) ||
                          orderTitle.toLowerCase() === preset.toLowerCase();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedLabTest(null);
                                setOrderTitle("");
                                setLabSearchQuery("");
                                setIsLabSearchFocused(false);
                                return;
                              }
                              const matched = availableLabTests.find((t) =>
                                t.test_name.toLowerCase().includes(preset.toLowerCase().slice(0, 10))
                              );
                              if (matched) {
                                handleSelectLabTest(matched);
                              } else {
                                setSelectedLabTest(null);
                                setOrderTitle(preset);
                                setLabSearchQuery(preset);
                              }
                            }}
                            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer border ${
                              isSelected
                                ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                                : "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100"
                            }`}
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
                    placeholder="e.g. Complete Blood Count, Diabetic Diet, Q2H Vitals..."
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
                        className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 transition"
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
                        className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100 transition"
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
                <div className="flex gap-2">
                  {["routine", "urgent", "stat"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold capitalize transition ${
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
                  Specific Instructions (for Lab, Nursing, or Dietary Staff)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Draw sample before starting morning antibiotics; fasting sample required; check temp every 2 hours..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:shadow disabled:opacity-50"
                >
                  {submittingAdd ? "Placing Order..." : "Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Discontinue / Cancel Order */}
      {discontinuingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                {discontinuingOrder.order_category === "lab" ? (
                  <XCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <StopCircle className="h-5 w-5 text-rose-600" />
                )}
                <h3 className="font-bold text-slate-900">
                  {discontinuingOrder.order_category === "lab"
                    ? "Cancel Lab Investigation"
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
                  {discontinuingOrder.order_category === "lab"
                    ? "Reason for Cancellation"
                    : "Reason for Discontinuation"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    discontinuingOrder.order_category === "lab"
                      ? "e.g. Test not required, Ordered in error, Duplicate test..."
                      : "e.g. Completed, No longer required, Patient stable..."
                  }
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setDiscontinuingOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDiscontinue}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDiscontinue
                    ? discontinuingOrder.order_category === "lab"
                      ? "Cancelling..."
                      : "Discontinuing..."
                    : discontinuingOrder.order_category === "lab"
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
