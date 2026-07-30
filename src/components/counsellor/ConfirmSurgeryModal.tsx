"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Loader2, Calendar, Clock, IndianRupee, Tag, CheckCircle2, Sparkles } from "lucide-react";
import { PlannedSurgery, SurgeryPackage } from "@/types";
import { counsellorApi } from "@/services/counsellorApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { getTodayDateLocal } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface ConfirmSurgeryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plannedSurgery: PlannedSurgery;
}

export function ConfirmSurgeryModal({
  isOpen,
  onClose,
  onSuccess,
  plannedSurgery,
}: ConfirmSurgeryModalProps) {
  const [packages, setPackages] = useState<SurgeryPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState(plannedSurgery.package_id || "");
  const [agreedPrice, setAgreedPrice] = useState<string>(plannedSurgery.agreed_price ? plannedSurgery.agreed_price.toString() : "");
  const [plannedDate, setPlannedDate] = useState<string>(plannedSurgery.planned_date || "");
  const [plannedTime, setPlannedTime] = useState<string>(plannedSurgery.planned_time || "");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<"upi" | "cash" | "card" | "cheque">("upi");

  const isBilateral = plannedSurgery.eye === "OU";

  const getSuggestedPackagePrice = (pkg: SurgeryPackage) => {
    let price = pkg.price;
    if (plannedSurgery.anatomy_site_id && pkg.anatomy_prices?.[plannedSurgery.anatomy_site_id]) {
      const p = pkg.anatomy_prices[plannedSurgery.anatomy_site_id];
      price = typeof p === "number" ? p : (p as any)?.price || pkg.price;
    }
    return isBilateral ? price * 2 : price;
  };

  // Reset all form fields whenever the modal opens (or a different surgery is opened)
  useEffect(() => {
    if (isOpen) {
      setSelectedPackageId(plannedSurgery.package_id || "");
      setPlannedDate(plannedSurgery.planned_date || "");
      setPlannedTime(plannedSurgery.planned_time || "");
      setAdvanceAmount("");
      setPaymentReference("");
      setNotes("");
      setPackages([]);
      setDiscount("0");
      setAdvancePaymentMethod("upi");
    }
  }, [isOpen, plannedSurgery.id]);

  useEffect(() => {
    if (isOpen && plannedSurgery.surgery_id) {
      surgeriesApi
        .listPackages(plannedSurgery.surgery_id)
        .then((pkgs) => {
          setPackages(pkgs);

          if (pkgs.length === 0) return;

          // Determine which package to show selected
          const currentPkgId = selectedPackageId || plannedSurgery.package_id || "";
          const matchedPkg = pkgs.find((p) => p.id === currentPkgId);
          const defaultPkg = pkgs.find((p) => p.is_default) || pkgs[0];
          const activePkg = matchedPkg || defaultPkg;

          // Always set the package id if not already set
          if (!selectedPackageId) {
            setSelectedPackageId(activePkg.id);
          }

          // Sync suggested price and set initial discount
          const basePrice = getSuggestedPackagePrice(activePkg);
          const currentAgreed = plannedSurgery.agreed_price ? Number(plannedSurgery.agreed_price) : basePrice;
          const initDiscount = Math.max(0, basePrice - currentAgreed);
          setDiscount(String(initDiscount));
          setAgreedPrice(String(currentAgreed));
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, plannedSurgery.surgery_id]);

  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const selected = packages.find((p) => p.id === pkgId);
    if (selected) {
      const basePrice = getSuggestedPackagePrice(selected);
      setAgreedPrice(basePrice.toString());
      setDiscount("0");
    }
  };

  const handleDiscountChange = (val: string) => {
    setDiscount(val);
    const dVal = parseFloat(val) || 0;
    const selected = packages.find((p) => p.id === selectedPackageId);
    if (selected) {
      const basePrice = getSuggestedPackagePrice(selected);
      setAgreedPrice(String(Math.max(0, basePrice - dVal)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId) {
      toast.error("Please select a package");
      return;
    }
    if (!agreedPrice || parseFloat(agreedPrice) < 0) {
      toast.error("Please enter a valid agreed price");
      return;
    }

    setSaving(true);
    try {
      await counsellorApi.confirm(plannedSurgery.id, {
        package_id: selectedPackageId,
        agreed_price: parseFloat(agreedPrice),
        planned_date: plannedDate || undefined,
        planned_time: plannedTime || undefined,
        notes: notes.trim() || undefined,
      });

      // If advance payment was recorded, log interaction
      if (advanceAmount && parseFloat(advanceAmount) > 0) {
        const formattedRef = `[${advancePaymentMethod.toUpperCase()}] ${paymentReference.trim()}`.trim();
        await counsellorApi.logInteraction(plannedSurgery.id, {
          interaction_type: "advance_payment",
          package_id: selectedPackageId,
          payment_amount: parseFloat(advanceAmount),
          payment_reference: formattedRef || undefined,
          notes: `Advance payment of ₹${parseFloat(advanceAmount).toLocaleString("en-IN")} collected via ${advancePaymentMethod.toUpperCase()} during confirmation. ${notes.trim()}`.trim(),
        });
      }

      toast.success("Surgery confirmed successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-emerald-950 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      {["confirmed", "in_ot_preparation"].includes(plannedSurgery.status)
                        ? "Update Surgery Booking"
                        : "Confirm Surgery Booking"}
                    </Dialog.Title>
                    <p className="text-xs text-emerald-700">
                      {plannedSurgery.patient_name} — {plannedSurgery.surgery_name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {isBilateral && (
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Sparkles className="h-4 w-4 text-amber-600" /> Bilateral Surgery Selected (OU - Both Eyes)
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        Base package rate is automatically set to 2x for bilateral procedure. You may adjust the final negotiated price below.
                      </p>
                    </div>
                  )}

                  {/* Select Package */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Tag className="h-4 w-4 text-slate-400" />
                      Selected Package <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedPackageId}
                      onChange={(e) => handlePackageChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Select a package...</option>
                      {packages.map((pkg) => {
                        const activeRate = getSuggestedPackagePrice(pkg);
                        return (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} — ₹{activeRate.toLocaleString("en-IN")}{" "}
                            {isBilateral ? "(Bilateral Rate)" : "(Single Eye Rate)"}{" "}
                            {pkg.is_default ? "[Default]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Pricing and Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        Base Price
                      </label>
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800">
                        ₹{(selectedPackageId && packages.length > 0 ? getSuggestedPackagePrice(packages.find(p => p.id === selectedPackageId)!) : 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Agreed Price */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <IndianRupee className="h-4 w-4 text-emerald-600" />
                      Agreed Price (Calculated)
                    </label>
                    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-base font-extrabold text-emerald-800">
                      ₹{(parseFloat(agreedPrice) || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Surgery Date
                        <span className="text-[10px] font-medium text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={plannedDate}
                        onChange={(e) => setPlannedDate(e.target.value)}
                        min={getTodayDateLocal()}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                      {!plannedDate && (
                        <p className="text-[10px] text-slate-400 italic">Date can be set later after confirmation</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Time (Optional)
                      </label>
                      <input
                        type="time"
                        value={plannedTime}
                        onChange={(e) => setPlannedTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  {/* Advance Payment (Optional) */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                        Advance Payment (Optional)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        OPTIONAL
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-600 block">Amount (₹)</label>
                        <input
                          type="number"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-600 block">Mode</label>
                        <select
                          value={advancePaymentMethod}
                          onChange={(e) => setAdvancePaymentMethod(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                        >
                          <option value="upi">UPI</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-600 block">Ref / Receipt #</label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Ref"
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Confirmation Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any specific confirmation remarks..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {["confirmed", "in_ot_preparation"].includes(plannedSurgery.status)
                            ? "Updating..."
                            : "Confirming..."}
                        </>
                      ) : (
                        ["confirmed", "in_ot_preparation"].includes(plannedSurgery.status)
                          ? "Update Booking"
                          : "Confirm Surgery"
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
