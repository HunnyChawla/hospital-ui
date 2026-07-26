"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition, Switch } from "@headlessui/react";
import {
  X,
  IndianRupee,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Package,
  Stethoscope,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  AnatomySite,
  CreateSurgeryRequest,
  Surgery,
  SurgeryPackage,
  UpdateSurgeryRequest,
} from "@/types";
import { anatomySitesApi } from "@/services/anatomySitesApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { toast } from "sonner";
import { handleError } from "@/utils/errorHandler";

interface SurgeryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSurgeryRequest | UpdateSurgeryRequest) => Promise<void>;
  initialData?: Surgery | null;
}

interface PackageItemInput {
  id?: string;
  name: string;
  description: string;
  price: string;
  bilateral_price: string;
  is_default: boolean;
}

export function SurgeryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SurgeryFormModalProps) {
  // Core Fields
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Ophthalmology"]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Anatomy Specificity Fields
  const [isAnatomySpecific, setIsAnatomySpecific] = useState(true);
  const [defaultAnatomySiteId, setDefaultAnatomySiteId] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [anatomySites, setAnatomySites] = useState<AnatomySite[]>([]);

  // Multi-Package State
  const [packages, setPackages] = useState<PackageItemInput[]>([
    {
      name: "Basic / Monofocal Package",
      description: "Standard surgical procedure package including post-op medication.",
      price: "25000",
      bilateral_price: "45000",
      is_default: true,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);

  // Fetch Anatomy Sites
  useEffect(() => {
    if (isOpen) {
      setLoadingSites(true);
      anatomySitesApi
        .list({ is_active_only: true })
        .then((res) => {
          setAnatomySites(res);
        })
        .catch((err) => {
          console.error("Failed to load anatomy sites", err);
        })
        .finally(() => {
          setLoadingSites(false);
        });
    }
  }, [isOpen]);

  // Load existing data when editing
  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name);
      const loadedCats = initialData.categories && initialData.categories.length > 0
        ? initialData.categories
        : initialData.category ? [initialData.category] : ["Ophthalmology"];
      setSelectedCategories(loadedCats);
      setDescription(initialData.description || "");
      setIsActive(initialData.is_active);
      setIsAnatomySpecific(initialData.is_anatomy_specific ?? true);
      setDefaultAnatomySiteId(initialData.default_anatomy_site_id || "");
      setSelectedSiteIds(initialData.applicable_anatomy_site_ids || []);
    } else if (!initialData && isOpen) {
      setName("");
      setSelectedCategories(["Ophthalmology"]);
      setCustomCategoryInput("");
      setDescription("");
      setIsActive(true);
      setIsAnatomySpecific(true);
      setDefaultAnatomySiteId("");
      setSelectedSiteIds([]);
      setPackages([
        {
          name: "Basic / Monofocal Package",
          description: "Standard surgical procedure package including post-op medication.",
          price: "25000",
          bilateral_price: "45000",
          is_default: true,
        },
      ]);
    }
  }, [initialData, isOpen]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomCategory = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    if (customCategoryInput.trim() && !selectedCategories.includes(customCategoryInput.trim())) {
      setSelectedCategories((prev) => [...prev, customCategoryInput.trim()]);
      setCustomCategoryInput("");
    }
  };

  // Package Management Handlers
  const handleAddPackage = () => {
    setPackages((prev) => [
      ...prev,
      {
        name: `Package ${prev.length + 1}`,
        description: "",
        price: "35000",
        bilateral_price: "65000",
        is_default: false,
      },
    ]);
  };

  const handleRemovePackage = (index: number) => {
    if (packages.length === 1) {
      toast.error("At least one surgery package is required.");
      return;
    }
    const removedWasDefault = packages[index].is_default;
    const updated = packages.filter((_, i) => i !== index);
    if (removedWasDefault && updated.length > 0) {
      updated[0].is_default = true;
    }
    setPackages(updated);
  };

  const handleUpdatePackage = (
    index: number,
    field: keyof PackageItemInput,
    val: any
  ) => {
    setPackages((prev) =>
      prev.map((pkg, i) => {
        if (i === index) {
          const updatedPkg = { ...pkg, [field]: val };
          // Auto-calculate bilateral price if single price changes and bilateral is empty
          if (field === "price" && val) {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
              updatedPkg.bilateral_price = Math.round(num * 1.8).toString();
            }
          }
          return updatedPkg;
        }
        if (field === "is_default" && val === true) {
          return { ...pkg, is_default: false };
        }
        return pkg;
      })
    );
  };

  const toggleAnatomySite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Surgery name is required.");
      return;
    }

    if (packages.length === 0) {
      toast.error("Please add at least one surgery package.");
      return;
    }

    // Determine primary base price from default package
    const defaultPkg = packages.find((p) => p.is_default) || packages[0];
    const basePriceNum = parseFloat(defaultPkg.price) || 0;
    const bilateralPriceNum =
      parseFloat(defaultPkg.bilateral_price) || basePriceNum * 2;

    const payloadPackages = packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name.trim() || "Standard Package",
      description: pkg.description.trim() || undefined,
      price: parseFloat(pkg.price) || 0,
      bilateral_price:
        parseFloat(pkg.bilateral_price) || (parseFloat(pkg.price) || 0) * 2,
      is_default: pkg.is_default,
    }));

    try {
      setIsSubmitting(true);
      const primaryCat = selectedCategories.length > 0 ? selectedCategories[0] : "Ophthalmology";

      await onSubmit({
        name: name.trim(),
        category: primaryCat,
        categories: selectedCategories,
        description: description.trim() || null,
        price: basePriceNum,
        base_price: basePriceNum,
        bilateral_price: bilateralPriceNum,
        default_anatomy_site_id: defaultAnatomySiteId || null,
        is_anatomy_specific: isAnatomySpecific,
        applicable_anatomy_site_ids: isAnatomySpecific ? selectedSiteIds : [],
        packages: payloadPackages,
        is_active: isActive,
      });
      // Only close on success
      onClose();
    } catch (error) {
      // Surface backend error (e.g. duplicate surgery name) as toast
      handleError(error, {
        defaultMessage: `Failed to ${initialData ? "update" : "create"} surgery. Please try again.`,
      });
      // Do NOT close modal — let user correct the issue
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all border border-slate-100">
                {/* Theme-Matched OPD Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-sky-600" />
                      {initialData ? "Edit Surgery Master" : "Add New Surgery Master"}
                    </Dialog.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure procedure name, anatomy specificity, and package rates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Section 1: Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      1. General Details
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Surgery Name */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          Surgery Procedure Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Phaco Cataract Surgery, Vitrectomy, Knee Replacement"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                      {/* Categories Multi-Select List */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Specialty Categories (Select multiple categories)</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {selectedCategories.length} selected
                          </span>
                        </label>

                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200">
                          {[
                            "Ophthalmology",
                            "Cataract",
                            "Glaucoma",
                            "Cornea",
                            "Retina",
                            "Refractive",
                            "Oculoplasty",
                            "Pediatric",
                            "Orthopedics",
                            "General Surgery",
                          ].map((cat) => {
                            const isSelected = selectedCategories.includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition flex items-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? "bg-sky-50 border-sky-400 text-sky-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <span>{cat}</span>
                                {isSelected && <CheckCircle2 className="h-3 w-3 text-sky-600" />}
                              </button>
                            );
                          })}
                          {selectedCategories
                            .filter(
                              (c) =>
                                ![
                                  "Ophthalmology",
                                  "Cataract",
                                  "Glaucoma",
                                  "Cornea",
                                  "Retina",
                                  "Refractive",
                                  "Oculoplasty",
                                  "Pediatric",
                                  "Orthopedics",
                                  "General Surgery",
                                ].includes(c)
                            )
                            .map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                className="px-2.5 py-1 text-xs rounded-lg border font-semibold bg-sky-50 border-sky-400 text-sky-800 flex items-center gap-1 cursor-pointer"
                              >
                                <span>{cat}</span>
                                <X className="h-3 w-3 text-sky-600" />
                              </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add custom category tag..."
                            value={customCategoryInput}
                            onChange={(e) => setCustomCategoryInput(e.target.value)}
                            onKeyDown={handleAddCustomCategory}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomCategory}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                          >
                            + Add Tag
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Clinical Notes / Overview
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief description of procedure..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Anatomy Specificity & Applicable Sites */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900">
                            Anatomy Specific Procedure?
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Does this surgery apply to specific anatomical sites (e.g. Eyes OD/OS/OU, Knees)?
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isAnatomySpecific}
                        onChange={setIsAnatomySpecific}
                        className={`${
                          isAnatomySpecific ? "bg-sky-600" : "bg-slate-200"
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600`}
                      >
                        <span
                          className={`${
                            isAnatomySpecific ? "translate-x-5" : "translate-x-0"
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </Switch>
                    </div>

                    {isAnatomySpecific && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        {/* Default Anatomy Site */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Default Anatomy Site
                          </label>
                          <select
                            value={defaultAnatomySiteId}
                            onChange={(e) => setDefaultAnatomySiteId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium outline-none focus:border-sky-400"
                          >
                            <option value="">Select default site...</option>
                            {anatomySites.map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name} ({site.short_code}) — {site.department || "General"}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Applicable Sites Pills Checklist */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>Applicable Anatomy Sites / Eyes (Select all that apply)</span>
                            <span className="text-[10px] text-slate-400">
                              {selectedSiteIds.length} selected
                            </span>
                          </label>

                          {loadingSites ? (
                            <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sites...
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                              {anatomySites.map((site) => {
                                const isSelected = selectedSiteIds.includes(site.id);
                                return (
                                  <button
                                    key={site.id}
                                    type="button"
                                    onClick={() => toggleAnatomySite(site.id)}
                                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition flex items-center gap-1 cursor-pointer ${
                                      isSelected
                                        ? "bg-sky-50 border-sky-400 text-sky-800 font-bold"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    <span>{site.name}</span>
                                    <span className="font-mono text-[10px] opacity-75">
                                      ({site.short_code})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Multiple Packages & Pricing Setup */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-sky-600" />
                          2. Surgery Packages & Inclusions
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Define single eye/side rate vs bilateral rate for each package.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPackage}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl hover:bg-sky-100 transition shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Package
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {packages.map((pkg, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border p-4 transition-colors space-y-3 ${
                            pkg.is_default
                              ? "border-sky-300 bg-sky-50/30"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-bold text-xs text-slate-400">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                required
                                value={pkg.name}
                                onChange={(e) =>
                                  handleUpdatePackage(idx, "name", e.target.value)
                                }
                                placeholder="Package Name (e.g. Basic Monofocal, Premium Multifocal)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-400"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-slate-600 font-medium">
                                <input
                                  type="radio"
                                  name="default_package_radio"
                                  checked={pkg.is_default}
                                  onChange={() =>
                                    handleUpdatePackage(idx, "is_default", true)
                                  }
                                  className="text-sky-600 focus:ring-sky-500"
                                />
                                Default
                              </label>

                              {packages.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePackage(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete Package"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Single Side Rate */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                                Single Side / Eye Rate (₹) *
                              </label>
                              <input
                                type="number"
                                required
                                min="0"
                                value={pkg.price}
                                onChange={(e) =>
                                  handleUpdatePackage(idx, "price", e.target.value)
                                }
                                placeholder="25000"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-sky-400"
                              />
                            </div>

                            {/* Bilateral / Dual Side Rate */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-600" /> Bilateral / Dual Side Rate (OU / Both) (₹) *
                              </label>
                              <input
                                type="number"
                                required
                                min="0"
                                value={pkg.bilateral_price}
                                onChange={(e) =>
                                  handleUpdatePackage(idx, "bilateral_price", e.target.value)
                                }
                                placeholder="45000"
                                className="w-full rounded-xl border border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs font-bold text-amber-950 outline-none focus:border-amber-500"
                              />
                              <p className="text-[10px] text-slate-500">
                                Package rate when operating on Both Eyes (OU) or bilateral sites.
                              </p>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={pkg.description}
                            onChange={(e) =>
                              handleUpdatePackage(idx, "description", e.target.value)
                            }
                            placeholder="Package inclusions (e.g., Includes IOL lens, 3 follow-ups)..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-sky-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900">
                        Active Surgery Master
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Enable this surgery for OPD doctor prescription and counselling
                      </span>
                    </span>
                    <Switch
                      checked={isActive}
                      onChange={setIsActive}
                      className={`${
                        isActive ? "bg-sky-600" : "bg-slate-200"
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600`}
                    >
                      <span
                        className={`${
                          isActive ? "translate-x-5" : "translate-x-0"
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </Switch>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-teal-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      )}
                      {initialData ? "Save Surgery Master Changes" : "Create Surgery Master"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
