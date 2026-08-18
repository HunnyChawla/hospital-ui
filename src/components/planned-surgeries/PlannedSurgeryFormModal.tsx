"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Loader2, Calendar, User, Stethoscope, Clock, FileText, Building2, CheckCircle2, Package, CreditCard, ChevronDown, ChevronUp, Split, Edit2, AlertCircle, Search } from "lucide-react";
import { PlannedSurgery, CreatePlannedSurgeryRequest, UpdatePlannedSurgeryRequest, Surgery, SurgeryPackage, PlannedSurgeryStatus } from "@/types";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { surgeryPackagesApi } from "@/services/surgeryPackagesApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { useAppSelector } from "@/redux/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { plannedSurgeryKeys } from "@/hooks/queries/usePlannedSurgeries";
import { useSurgeryPaymentSummary, useSurgeryPayments, surgeryBillingKeys } from "@/hooks/queries/useSurgeryBilling";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTodayDateLocal, formatDate } from "@/utils/format";
import { BodyPartPicker } from "./BodyPartPicker";
import { BodyPartBadge } from "@/components/shared/BodyPartBadge";

interface PlannedSurgeryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: PlannedSurgery | null;
}

// Section eyebrow header — same label convention as the Surgery/Surgical Plan
// eyebrows in SurgeryDetailModal, so the plan flow reads as one system with
// the detail view instead of an undifferentiated stack of fields.
function FormSection({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            {children}
        </div>
    );
}

// Read-only value display — for facts that were fixed at the "advised" stage
// (patient, prescribed surgery, surgeon) and can no longer be edited here.
// Rendering these as plain labeled text instead of disabled input-look boxes
// keeps the form from implying they're editable fields.
function InfoTile({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon className="h-3 w-3" />
                {label}
            </span>
            <div className="mt-1 truncate text-sm font-semibold text-slate-800">{children}</div>
        </div>
    );
}

export function PlannedSurgeryFormModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
}: PlannedSurgeryFormModalProps) {
    const queryClient = useQueryClient();
    const doctors = useAppSelector((s) => s.doctors.list);
    const activeDoctors = useMemo(() => {
        return doctors.filter((d) => d.is_active !== false && d.status !== "inactive");
    }, [doctors]);
    const currentTenant = useAppSelector((s) => s.tenant.tenant);
    const isEditing = !!initialData;
    const surgeryIdForBilling = initialData?.id || null;
    const { data: summary } = useSurgeryPaymentSummary(surgeryIdForBilling);
    const { data: payments = [] } = useSurgeryPayments(surgeryIdForBilling);
    const hasCollectedPayment = !!(initialData && initialData.advance_payment_amount && Number(initialData.advance_payment_amount) > 0) || payments.length > 0;

    // Form state
    const [patientSearch, setPatientSearch] = useState("");
    const [patientId, setPatientId] = useState("");
    const [patientName, setPatientName] = useState("");
    const [surgeryId, setSurgeryId] = useState("");
    const [surgeryName, setSurgeryName] = useState("");
    const [surgerySearch, setSurgerySearch] = useState("");
    const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
    const [surgeonId, setSurgeonId] = useState("");
    const [bodyPartId, setBodyPartId] = useState<string | null>(null);
    const [splitBodyParts, setSplitBodyParts] = useState(false);
    const [osPlannedDate, setOsPlannedDate] = useState("");
    const [plannedDate, setPlannedDate] = useState(getTodayDateLocal());
    const [plannedTime, setPlannedTime] = useState("");
    const [hospitalName, setHospitalName] = useState(currentTenant?.name || "");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<PlannedSurgeryStatus>("scheduled");

    // Package state
    const [packages, setPackages] = useState<SurgeryPackage[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [packageDiscount, setPackageDiscount] = useState<string>("0");
    const [loadingPackages, setLoadingPackages] = useState(false);

    // Advance Payment state
    const [showAdvancePayment, setShowAdvancePayment] = useState(false);
    const [isEditingPayment, setIsEditingPayment] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [paymentReference, setPaymentReference] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(getTodayDateLocal());
    const [paymentNotes, setPaymentNotes] = useState<string>("");

    // Lists & Dropdown
    const [surgeryResults, setSurgeryResults] = useState<Surgery[]>([]);
    const [patientResults, setPatientResults] = useState<any[]>([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Loading states
    const [saving, setSaving] = useState(false);
    const [loadingSurgeries, setLoadingSurgeries] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Backend-driven surgery search (replaces the old one-shot page_size:100
    // fetch, which silently truncated once the catalog grew past 100 rows -
    // reuses the same debounce pattern as the patient search below).
    useEffect(() => {
        if (!isOpen) return;
        const fetchSurgeries = async () => {
            setLoadingSurgeries(true);
            try {
                const response = await surgeriesApi.list({
                    is_active: true,
                    search: surgerySearch.trim() || undefined,
                    page_size: 20,
                });
                setSurgeryResults(response.items);
            } catch (error) {
                console.error("Failed to fetch surgeries:", error);
            } finally {
                setLoadingSurgeries(false);
            }
        };
        const debounce = setTimeout(fetchSurgeries, 300);
        return () => clearTimeout(debounce);
    }, [isOpen, surgerySearch]);

    // Fetch packages when surgeryId changes
    useEffect(() => {
        const fetchPackages = async () => {
            if (!surgeryId) {
                setPackages([]);
                return;
            }
            setLoadingPackages(true);
            try {
                const data = await surgeryPackagesApi.list(surgeryId, true);
                setPackages(data);
            } catch (error) {
                console.error("Failed to fetch packages:", error);
                setPackages([]);
            } finally {
                setLoadingPackages(false);
            }
        };
        if (isOpen && surgeryId) {
            fetchPackages();
        }
    }, [surgeryId, isOpen]);

    // Populate form when editing or reset when creating
    useEffect(() => {
        if (initialData) {
            setPatientId(initialData.patient_id);
            setPatientName(initialData.patient_name || "");
            setSurgeryId(initialData.surgery_id);
            setSurgeryName(initialData.surgery_name);
            setSurgerySearch(initialData.surgery_name);
            setSurgeonId(initialData.surgeon_id);
            setBodyPartId(initialData.body_part_id || null);
            setPlannedDate(initialData.planned_date || "");
            setPlannedTime(initialData.planned_time?.slice(0, 5) || "");
            setHospitalName(initialData.hospital_name || "");
            setNotes(initialData.notes || "");
            setStatus(initialData.status);
            setSelectedPackageId(initialData.package_id || null);

            // Reset advance payment collection inputs for optional additional collection
            setShowAdvancePayment(false);
            setAdvanceAmount("");
            setPaymentMethod("cash");
            setPaymentReference("");
            setPaymentDate(getTodayDateLocal());
            setPaymentNotes("");
        } else {
            // Reset form
            setPatientSearch("");
            setPatientId("");
            setPatientName("");
            setSurgeryId("");
            setSurgeryName("");
            setSurgerySearch("");
            setSelectedSurgery(null);
            setSurgeonId("");
            setBodyPartId(null);
            setSplitBodyParts(false);
            setOsPlannedDate("");
            setPlannedDate(getTodayDateLocal());
            setPlannedTime("");
            setHospitalName("");
            setNotes("");
            setStatus("scheduled");
            setSelectedPackageId(null);

            setShowAdvancePayment(false);
            setAdvanceAmount("");
            setPaymentMethod("cash");
            setPaymentReference("");
            setPaymentDate(getTodayDateLocal());
            setPaymentNotes("");
        }
    }, [initialData, isOpen]);

    // Search patients
    useEffect(() => {
        const searchPatients = async () => {
            if (patientSearch.length < 2) {
                setPatientResults([]);
                return;
            }
            setSearchingPatients(true);
            try {
                const response = await patientsApi.searchGlobal({
                    q: patientSearch,
                    page: 1,
                    page_size: 10,
                });
                setPatientResults(response.items);
                setShowPatientDropdown(true);
            } catch (error) {
                console.error("Failed to search patients:", error);
            } finally {
                setSearchingPatients(false);
            }
        };

        const debounce = setTimeout(searchPatients, 300);
        return () => clearTimeout(debounce);
    }, [patientSearch]);

    const handlePatientSelect = (patient: any) => {
        setPatientId(patient.id);
        const name = formatPatientName(patient);
        setPatientName(name);
        setPatientSearch(name);
        setShowPatientDropdown(false);
        setPatientResults([]);
    };

    const handleSelectSurgery = (s: Surgery) => {
        setSurgeryId(s.id);
        setSurgeryName(s.name);
        setSurgerySearch(s.name);
        setShowSurgeryDropdown(false);
        setSelectedSurgery(s);
        setSelectedPackageId(null);
        // 0/1/2+ semantics: single applicable body part auto-applies silently.
        setBodyPartId(s.body_parts.length === 1 ? s.body_parts[0].id : null);
    };

    const handlePackageSelect = (pkg: SurgeryPackage) => {
        if (selectedPackageId === pkg.id) {
            // Toggle unselect
            setSelectedPackageId(null);
        } else {
            setSelectedPackageId(pkg.id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patientId) {
            toast.error("Please select a patient");
            return;
        }
        if (!surgeryId) {
            toast.error("Please select a surgery");
            return;
        }
        if (!surgeonId) {
            toast.error("Please select a surgeon");
            return;
        }

        const isScheduling = !!plannedDate || status === "scheduled";
        if (isScheduling && packages.length > 0 && !selectedPackageId) {
            toast.error("Please select a surgery package for scheduling");
            return;
        }
        if (!isEditing && selectedSurgery && selectedSurgery.body_parts.length > 1 && !bodyPartId) {
            toast.error("Please select the applicable body part");
            return;
        }

        const numAdvance = (showAdvancePayment && advanceAmount && parseFloat(advanceAmount) > 0)
            ? parseFloat(advanceAmount)
            : undefined;

        setSaving(true);
        try {
            if (isEditing && initialData) {
                const updatePayload: UpdatePlannedSurgeryRequest = {
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    body_part_id: bodyPartId ?? initialData.body_part_id ?? null,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes || null,
                    package_id: selectedPackageId,
                    package_price: selectedPackageId ? netAgreedPrice : undefined,
                    original_package_price: selectedPackageId ? activeBasePrice : undefined,
                    advance_payment_amount: numAdvance,
                    advance_payment_method: numAdvance ? paymentMethod : null,
                    advance_payment_reference: numAdvance ? paymentReference || null : null,
                    advance_payment_date: numAdvance ? paymentDate || null : null,
                    advance_payment_notes: numAdvance ? paymentNotes || null : null,
                };
                await plannedSurgeriesApi.update(initialData.id, updatePayload);
                toast.success("Planned surgery updated successfully");
            } else if (splitBodyParts && pairedSiblings.length === 2) {
                // Selected body part is bilateral and has exactly 2 single-side
                // siblings configured on this surgery (e.g. Right/Left Eye,
                // Right/Left Knee) - split into two entries for different dates.
                const [first, second] = pairedSiblings;
                const firstPayload: CreatePlannedSurgeryRequest = {
                    patient_id: patientId,
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    surgeon_id: surgeonId,
                    body_part_id: first.id,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes ? `${notes} (${first.name})` : first.name,
                    package_id: selectedPackageId,
                    package_price: selectedPackageId ? netAgreedPrice : undefined,
                    original_package_price: selectedPackageId ? activeBasePrice : undefined,
                    advance_payment_amount: numAdvance,
                    advance_payment_method: numAdvance ? paymentMethod : null,
                    advance_payment_reference: numAdvance ? paymentReference || null : null,
                    advance_payment_date: numAdvance ? paymentDate || null : null,
                    advance_payment_notes: numAdvance ? paymentNotes || null : null,
                };
                const secondPayload: CreatePlannedSurgeryRequest = {
                    patient_id: patientId,
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    surgeon_id: surgeonId,
                    body_part_id: second.id,
                    planned_date: osPlannedDate || plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes ? `${notes} (${second.name})` : second.name,
                    package_id: selectedPackageId,
                    package_price: selectedPackageId ? netAgreedPrice : undefined,
                    original_package_price: selectedPackageId ? activeBasePrice : undefined,
                };

                await plannedSurgeriesApi.create(firstPayload);
                await plannedSurgeriesApi.create(secondPayload);
                toast.success(`Planned surgeries for ${first.name} and ${second.name} created successfully`);
            } else {
                const createPayload: CreatePlannedSurgeryRequest = {
                    patient_id: patientId,
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    surgeon_id: surgeonId,
                    body_part_id: bodyPartId,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes || null,
                    package_id: selectedPackageId,
                    package_price: selectedPackageId ? netAgreedPrice : undefined,
                    original_package_price: selectedPackageId ? activeBasePrice : undefined,
                    advance_payment_amount: numAdvance,
                    advance_payment_method: numAdvance ? paymentMethod : null,
                    advance_payment_reference: numAdvance ? paymentReference || null : null,
                    advance_payment_date: numAdvance ? paymentDate || null : null,
                    advance_payment_notes: numAdvance ? paymentNotes || null : null,
                };
                await plannedSurgeriesApi.create(createPayload);
                toast.success("Planned surgery created successfully");
            }
            queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.all });
            queryClient.invalidateQueries({ queryKey: surgeryBillingKeys.all });
            onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || `Failed to ${isEditing ? "update" : "create"} planned surgery`);
        } finally {
            setSaving(false);
        }
    };

    const isInvoiceLocked = !!initialData?.surgery_invoice_id;
    const selectedPkg = packages.find((p) => p.id === selectedPackageId);
    const resolvePkgPrice = (pkg: SurgeryPackage) =>
        pkg.prices?.find((p) => p.body_part_id === bodyPartId)?.price ?? pkg.price;
    const activeBasePrice = selectedPkg
        ? resolvePkgPrice(selectedPkg)
        : (initialData?.package_price ? Number(initialData.package_price) : 0);
    const netAgreedPrice = selectedPkg
        ? Math.max(0, activeBasePrice - (parseFloat(packageDiscount) || 0))
        : (initialData?.package_price ? Number(initialData.package_price) : 0);

    // Bilateral split support: the selected body part is "bilateral" and the
    // surgery has exactly 2 single-side siblings configured (e.g. Right/Left
    // Eye, Right/Left Knee) - generalizes the old OD/OS-only split.
    const selectedBodyPart = selectedSurgery?.body_parts.find((bp) => bp.id === bodyPartId);
    const pairedSiblings = selectedSurgery?.body_parts.filter(
        (bp) => bp.laterality === "left" || bp.laterality === "right"
    ) ?? [];
    const canSplitBodyParts = selectedBodyPart?.laterality === "bilateral" && pairedSiblings.length === 2;

    // Sync package discount when initialData or selectedPkg changes
    useEffect(() => {
        if (initialData?.package_price && selectedPkg) {
            const basePrice = resolvePkgPrice(selectedPkg);
            const storedPrice = Number(initialData.package_price);
            if (basePrice > storedPrice) {
                setPackageDiscount((basePrice - storedPrice).toString());
            } else {
                setPackageDiscount("0");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, selectedPkg, bodyPartId]);

    const hasBillingSummary = isEditing && !!(summary || payments.length > 0 || hasCollectedPayment);

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
                            <Dialog.Panel className="flex w-full max-w-3xl max-h-[90vh] transform flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white shadow-2xs">
                                            <Stethoscope className="h-5 w-5 text-sky-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <Dialog.Title className="text-lg font-bold text-slate-900">
                                                {isEditing ? "Plan Surgery" : "Plan New Surgery"}
                                            </Dialog.Title>
                                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                                {isEditing
                                                    ? `${patientName || "Patient"} — ${surgeryName || "Surgery"}`
                                                    : "Schedule the date, choose a package, and optionally collect an advance"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 shrink-0"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                    {/* Prescribed Details — read-only facts fixed at the advised stage */}
                                    {isEditing && (
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-sky-200 bg-sky-50/40 p-4 sm:grid-cols-4">
                                            <InfoTile icon={User} label="Patient">
                                                {patientName || "Unknown Patient"}
                                            </InfoTile>
                                            <InfoTile icon={FileText} label="Surgery">
                                                {surgeryName || initialData?.surgery_name || "Prescribed Surgery"}
                                            </InfoTile>
                                            <InfoTile icon={Stethoscope} label="Surgeon">
                                                {doctors.find((d) => d.id === surgeonId)?.name
                                                    || doctors.find((d) => d.id === surgeonId)?.user?.name
                                                    || doctors.find((d) => d.id === surgeonId)?.user_name
                                                    || "Unassigned"}
                                            </InfoTile>
                                            {initialData?.body_part_name && (
                                                <InfoTile icon={Package} label="Body Part">
                                                    <BodyPartBadge name={initialData.body_part_name} />
                                                </InfoTile>
                                            )}
                                        </div>
                                    )}

                                    {/* Patient Selection */}
                                    {!isEditing && (
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <User className="h-4 w-4 text-slate-400" />
                                            Patient <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
                                                placeholder="Search patient by name or mobile..."
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            />
                                            {searchingPatients && (
                                                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                                            )}
                                            {showPatientDropdown && patientResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                                                    {patientResults.map((patient) => (
                                                        <button
                                                            key={patient.id}
                                                            type="button"
                                                            onClick={() => handlePatientSelect(patient)}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                                        >
                                                            <span className="font-medium text-slate-900">
                                                                {patient.first_name} {patient.last_name}
                                                            </span>
                                                            <span className="ml-2 text-slate-500">
                                                                {patient.mobile}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {patientId && (
                                                <div className="mt-1 text-xs text-emerald-600">
                                                    ✓ Selected: {patientName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    )}

                                    {!isEditing && (
                                    <FormSection icon={Stethoscope} label="Surgery & Surgeon">
                                    {/* Surgery Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            Surgery Type <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={surgerySearch}
                                                    onChange={(e) => {
                                                        setSurgerySearch(e.target.value);
                                                        setSurgeryId("");
                                                        setSelectedSurgery(null);
                                                        setShowSurgeryDropdown(true);
                                                    }}
                                                    onFocus={() => setShowSurgeryDropdown(true)}
                                                    placeholder="Search surgeries..."
                                                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                />
                                                {loadingSurgeries && (
                                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                                                )}
                                            </div>
                                            {showSurgeryDropdown && (
                                                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                                    {surgeryResults.length === 0 ? (
                                                        <p className="px-4 py-2 text-xs text-slate-500">No surgeries found.</p>
                                                    ) : (
                                                        surgeryResults.map((surgery) => (
                                                            <button
                                                                key={surgery.id}
                                                                type="button"
                                                                onClick={() => handleSelectSurgery(surgery)}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                                            >
                                                                <span className="font-medium text-slate-900">{surgery.name}</span>
                                                                {surgery.category && (
                                                                    <span className="ml-2 text-slate-500">({surgery.category})</span>
                                                                )}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                            {surgeryId && (
                                                <div className="mt-1 text-xs text-emerald-600">
                                                    ✓ Selected: {surgeryName}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Surgeon Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <Stethoscope className="h-4 w-4 text-slate-400" />
                                            Surgeon <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={surgeonId}
                                            onChange={(e) => setSurgeonId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        >
                                            <option value="">Select surgeon...</option>
                                            {activeDoctors.map((doctor) => (
                                                <option key={doctor.id} value={doctor.id}>
                                                    {doctor.name || doctor.user?.name || doctor.user_name || `Dr. ${doctor.id.slice(0, 8)}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Body Part Selection */}
                                    {selectedSurgery && selectedSurgery.body_parts.length > 0 ? (
                                        <div className="space-y-2 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                                    Body Part {selectedSurgery.body_parts.length > 1 && <span className="text-rose-500">*</span>}
                                                </label>
                                                {selectedBodyPart && (
                                                    <BodyPartBadge
                                                        name={selectedBodyPart.name}
                                                        laterality={selectedBodyPart.laterality}
                                                        department={selectedBodyPart.department}
                                                    />
                                                )}
                                            </div>
                                            {selectedSurgery.body_parts.length > 1 ? (
                                                <div className="pt-1">
                                                    <BodyPartPicker
                                                        bodyParts={selectedSurgery.body_parts}
                                                        value={bodyPartId}
                                                        onChange={setBodyPartId}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500">
                                                    Auto-applied — this surgery is only configured for {selectedSurgery.body_parts[0].name}.
                                                </p>
                                            )}

                                            {canSplitBodyParts && (
                                                <div className="mt-2 space-y-2 rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
                                                    <p className="flex items-center gap-1">
                                                        ℹ️ Bilateral body part selected — package pricing applies to the combined procedure.
                                                    </p>
                                                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer pt-1 border-t border-sky-200/60">
                                                        <input
                                                            type="checkbox"
                                                            checked={splitBodyParts}
                                                            onChange={(e) => setSplitBodyParts(e.target.checked)}
                                                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                                                        />
                                                        <Split className="h-3.5 w-3.5 text-sky-600" />
                                                        Plan as 2 separate entries ({pairedSiblings.map((p) => p.name).join(" & ")}) for different dates
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                    </FormSection>
                                    )}

                                    <FormSection icon={Calendar} label="Schedule">
                                    {/* Planned Date and Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {splitBodyParts && pairedSiblings[0] ? `${pairedSiblings[0].name} Date` : "Planned Date"}{" "}
                                                <span className="text-xs text-slate-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={plannedDate}
                                                onChange={(e) => setPlannedDate(e.target.value)}
                                                min={getTodayDateLocal()}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            />
                                        </div>

                                        {splitBodyParts ? (
                                            <div className="space-y-1.5">
                                                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {pairedSiblings[1]?.name || "Second"} Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={osPlannedDate}
                                                    onChange={(e) => setOsPlannedDate(e.target.value)}
                                                    min={getTodayDateLocal()}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <Clock className="h-4 w-4 text-slate-400" />
                                                    Time (optional)
                                                </label>
                                                <input
                                                    type="time"
                                                    value={plannedTime}
                                                    onChange={(e) => setPlannedTime(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    </FormSection>

                                    {/* Packages Selection Section */}
                                    {surgeryId && (
                                        <div className="space-y-2 border-t border-slate-100 pt-4">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <Package className="h-4 w-4 text-slate-400" />
                                                    Surgery Package <span className="text-xs text-slate-400 font-normal">(optional)</span>
                                                </label>
                                                {selectedPackageId && !isInvoiceLocked && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPackageId(null)}
                                                        className="text-xs text-rose-600 hover:underline"
                                                    >
                                                        Clear selection
                                                    </button>
                                                )}
                                            </div>

                                            {isInvoiceLocked && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-xs text-amber-900 font-medium">
                                                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                                    <span>Invoice generated — package selection & agreed pricing are locked to preserve billing integrity.</span>
                                                </div>
                                            )}

                                            {loadingPackages ? (
                                                <div className="flex items-center gap-2 py-4 text-xs text-slate-500 justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                                                    Loading packages...
                                                </div>
                                            ) : packages.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    No packages configured for this surgery. Proceeding with standard pricing.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                    {packages.map((pkg) => {
                                                        const isSelected = selectedPackageId === pkg.id;
                                                        const activePrice = resolvePkgPrice(pkg);
                                                        const otherPrices = (pkg.prices || []).filter(
                                                            (p) => p.body_part_id !== bodyPartId
                                                        );

                                                        return (
                                                            <button
                                                                key={pkg.id}
                                                                type="button"
                                                                disabled={isInvoiceLocked}
                                                                onClick={() => handlePackageSelect(pkg)}
                                                                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative ${
                                                                    isSelected
                                                                        ? "border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-200"
                                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                                } ${isInvoiceLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                                                            >
                                                                <div className="flex items-center justify-between w-full mb-1">
                                                                    <span className="font-semibold text-sm text-slate-900">
                                                                        {pkg.name}
                                                                    </span>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-sm font-extrabold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200">
                                                                            ₹{activePrice.toLocaleString("en-IN")}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                            {selectedBodyPart?.name || "Base"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {pkg.description && (
                                                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                                                        {pkg.description}
                                                                    </p>
                                                                )}
                                                                <div className="mt-2.5 flex items-center justify-between w-full pt-2 border-t border-slate-100 text-[11px]">
                                                                    <span className="text-slate-400">
                                                                        {otherPrices.map((p) => `${p.body_part_name}: ₹${p.price.toLocaleString("en-IN")}`).join(" · ") || `Base: ₹${pkg.price.toLocaleString("en-IN")}`}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <span className="font-semibold text-sky-700 flex items-center gap-1">
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" /> Selected
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Agreed Package Pricing & Discount Section */}
                                            {selectedPkg && (
                                                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 mt-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-sky-900 uppercase tracking-wide">Agreed Pricing & Discount</span>
                                                        <span className="text-slate-600 font-medium">Standard Price: ₹{activeBasePrice.toLocaleString("en-IN")}</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                                Special Discount / Concession (₹)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={activeBasePrice}
                                                                disabled={isInvoiceLocked}
                                                                value={packageDiscount}
                                                                onChange={(e) => setPackageDiscount(e.target.value)}
                                                                placeholder="0.00"
                                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                                Final Agreed Package Price (₹)
                                                            </label>
                                                            <div className="rounded-lg border border-sky-300 bg-white px-3.5 py-2 text-sm font-extrabold text-sky-800 flex items-center justify-between shadow-2xs">
                                                                <span>₹{netAgreedPrice.toLocaleString("en-IN")}</span>
                                                                <span className="text-[10px] font-normal text-slate-500">Fixed for Invoice</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Billing & Payments Summary + Advance Payment Collection, paired side by side */}
                                    <div className={hasBillingSummary ? "grid grid-cols-1 gap-5 lg:grid-cols-2" : ""}>
                                    {hasBillingSummary && (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                                                    Recorded Payment(s) ({payments.length || (hasCollectedPayment ? 1 : 0)})
                                                </span>
                                                {summary?.invoice_status && (
                                                    <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                                        summary.invoice_status === "paid"
                                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                            : summary.invoice_status === "partial"
                                                            ? "bg-amber-100 text-amber-800 border-amber-300"
                                                            : "bg-rose-100 text-rose-800 border-rose-300"
                                                    }`}>
                                                        Invoice {summary.invoice_status} ({summary.invoice_number})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                                                <div>
                                                    <span className="text-slate-500 block text-[11px]">Advances Paid</span>
                                                    <span className="text-sm font-bold text-emerald-700">
                                                        ₹{(summary?.total_advance_collected ?? Number(initialData?.advance_payment_amount || 0)).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-[11px]">Invoice Payments</span>
                                                    <span className="text-sm font-bold text-blue-700">
                                                        ₹{(summary?.total_paid_on_invoice || 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-[11px]">Total Payments</span>
                                                    <span className="text-base font-extrabold text-emerald-900">
                                                        ₹{((summary?.total_advance_collected || 0) + (summary?.total_paid_on_invoice || 0) || Number(initialData?.advance_payment_amount || 0)).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-[11px]">Balance Remaining</span>
                                                    <span className={`text-sm font-extrabold ${(summary?.balance_due ?? summary?.pending_balance ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                                        ₹{(summary?.balance_due ?? summary?.pending_balance ?? 0).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Payments Audit Log List */}
                                            {payments.length > 0 && (
                                                <div className="pt-2 border-t border-emerald-200/80 space-y-1.5">
                                                    <span className="text-[11px] font-bold text-slate-700 block">All Recorded Payments:</span>
                                                    <div className="divide-y divide-slate-200/80 bg-white rounded-lg border border-emerald-200/80 overflow-hidden text-xs max-h-36 overflow-y-auto">
                                                        {payments.map((p, idx) => (
                                                            <div key={p.surgery_payment_id || idx} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                                                <div>
                                                                    <span className="font-semibold text-slate-900">
                                                                        {p.payment_number || `Pay #${idx + 1}`}
                                                                    </span>{" "}
                                                                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
                                                                        {p.payment_type}
                                                                    </span>
                                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : "Date N/A"} • {(p.payment_method || "cash").toUpperCase()} {p.payment_reference ? `• Ref: ${p.payment_reference}` : ""}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right font-extrabold text-emerald-700 text-sm">
                                                                    +₹{Number(p.amount).toLocaleString("en-IN")}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Advance Payment Section */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-slate-100/70 border-b border-slate-200/60">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={showAdvancePayment}
                                                    onChange={(e) => setShowAdvancePayment(e.target.checked)}
                                                    disabled={!selectedPackageId}
                                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                                />
                                                <CreditCard className="h-4 w-4 text-sky-600" />
                                                {hasCollectedPayment ? "Collect Additional Advance Payment Now (Optional)" : "Collect Advance Payment Now (Optional)"}
                                            </label>
                                        </div>

                                        {showAdvancePayment && (
                                            <div className="p-4 bg-white space-y-3">
                                                {!selectedPackageId && (
                                                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-medium flex items-center gap-1.5">
                                                        <span>⚠️</span> Select a surgery package above to enable advance payment collection.
                                                    </p>
                                                )}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                                            Amount (₹) <span className="text-rose-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            disabled={!selectedPackageId}
                                                            value={advanceAmount}
                                                            onChange={(e) => setAdvanceAmount(e.target.value)}
                                                            placeholder={selectedPackageId ? "e.g. 5000" : "Select package first"}
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:bg-slate-100 disabled:text-slate-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                                            Payment Method
                                                        </label>
                                                        <select
                                                            disabled={!selectedPackageId}
                                                            value={paymentMethod}
                                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:bg-slate-100 disabled:text-slate-400"
                                                        >
                                                            <option value="cash">Cash</option>
                                                            <option value="upi">UPI</option>
                                                            <option value="card">Card</option>
                                                            <option value="cheque">Cheque</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                                            Ref / Txn No (optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={paymentReference}
                                                            onChange={(e) => setPaymentReference(e.target.value)}
                                                            placeholder="e.g. UPI Ref / Cheque No"
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                                            Payment Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={paymentDate}
                                                            onChange={(e) => setPaymentDate(e.target.value)}
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                                        Payment Notes (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={paymentNotes}
                                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                                        placeholder="e.g. Received advance via GPay"
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    </div>

                                    {/* Status + Notes, paired side by side */}
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    {/* Status Selection — only shown on create */}
                                    {isEditing ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                                            <p className="text-xs font-medium text-slate-500">Current Status</p>
                                            <p className="text-sm font-semibold text-slate-700 capitalize">
                                                {initialData?.status || "advised"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Use action buttons (Postpone, Deny, Cancel, Complete) to change status.</p>
                                        </div>
                                    ) : (
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                            Status <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as PlannedSurgeryStatus)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        >
                                            <option value="advised">Advised</option>
                                            <option value="scheduled">Scheduled</option>
                                        </select>
                                    </div>
                                    )}

                                    {/* Notes */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            Notes (optional)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any additional notes..."
                                            rows={4}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                                        />
                                    </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {isEditing ? "Updating..." : "Planning..."}
                                            </>
                                        ) : (
                                            <>{isEditing ? "Update Plan" : "Plan Surgery"}</>
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
