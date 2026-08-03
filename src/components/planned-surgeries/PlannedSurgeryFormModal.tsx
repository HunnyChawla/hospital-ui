"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Loader2, Calendar, User, Stethoscope, Eye, Clock, FileText, Building2, CheckCircle2, Package, CreditCard, ChevronDown, ChevronUp, Split, Edit2, AlertCircle } from "lucide-react";
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

interface PlannedSurgeryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: PlannedSurgery | null;
}

export function PlannedSurgeryFormModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
}: PlannedSurgeryFormModalProps) {
    const queryClient = useQueryClient();
    const doctors = useAppSelector((s) => s.doctors.list);
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
    const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
    const [surgeonId, setSurgeonId] = useState("");
    const [eye, setEye] = useState<"OD" | "OS" | "OU">("OD");
    const [splitOuSurgeries, setSplitOuSurgeries] = useState(false);
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
    const [surgeries, setSurgeries] = useState<Surgery[]>([]);
    const [patientResults, setPatientResults] = useState<any[]>([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Loading states
    const [saving, setSaving] = useState(false);
    const [loadingSurgeries, setLoadingSurgeries] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Fetch surgeries list
    useEffect(() => {
        const fetchSurgeries = async () => {
            setLoadingSurgeries(true);
            try {
                const response = await surgeriesApi.list({ is_active: true, page_size: 100 });
                setSurgeries(response.items);
            } catch (error) {
                console.error("Failed to fetch surgeries:", error);
            } finally {
                setLoadingSurgeries(false);
            }
        };
        if (isOpen) {
            fetchSurgeries();
        }
    }, [isOpen]);

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
                if (data.length > 0 && !selectedPackageId) {
                    setSelectedPackageId(data[0].id);
                }
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
            setSurgeonId(initialData.surgeon_id);
            setEye(initialData.eye || "OD");
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
            setSelectedSurgery(null);
            setSurgeonId("");
            setEye("OD");
            setSplitOuSurgeries(false);
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

    // Update selectedSurgery object whenever surgeryId changes
    useEffect(() => {
        const found = surgeries.find((s) => s.id === surgeryId);
        setSelectedSurgery(found || null);
    }, [surgeryId, surgeries]);

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

    const handleSurgeryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setSurgeryId(selectedId);
        const s = surgeries.find((item) => item.id === selectedId);
        setSurgeryName(s?.name || "");
        setSelectedSurgery(s || null);
        setSelectedPackageId(null);
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

        const isEyeSurgery = selectedSurgery?.is_eye_surgery ?? true;
        const numAdvance = (showAdvancePayment && advanceAmount && parseFloat(advanceAmount) > 0)
            ? parseFloat(advanceAmount)
            : undefined;

        setSaving(true);
        try {
            if (isEditing && initialData) {
                const updatePayload: UpdatePlannedSurgeryRequest = {
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    eye: eye || initialData.eye || null,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes || null,
                    package_id: selectedPackageId,
                    package_price: selectedPackageId ? netAgreedPrice : undefined,
                    advance_payment_amount: numAdvance,
                    advance_payment_method: numAdvance ? paymentMethod : null,
                    advance_payment_reference: numAdvance ? paymentReference || null : null,
                    advance_payment_date: numAdvance ? paymentDate || null : null,
                    advance_payment_notes: numAdvance ? paymentNotes || null : null,
                };
                await plannedSurgeriesApi.update(initialData.id, updatePayload);
                toast.success("Planned surgery updated successfully");
            } else {
                // If OU eye is selected and receptionist chose to split into two entries
                if (isEyeSurgery && eye === "OU" && splitOuSurgeries) {
                    const odPayload: CreatePlannedSurgeryRequest = {
                        patient_id: patientId,
                        surgery_id: surgeryId,
                        surgery_name: surgeryName,
                        surgeon_id: surgeonId,
                        eye: "OD",
                        planned_date: plannedDate || null,
                        planned_time: plannedTime || null,
                        hospital_name: hospitalName || null,
                        notes: notes ? `${notes} (Right Eye - OD)` : "Right Eye (OD)",
                        package_id: selectedPackageId,
                        package_price: selectedPackageId ? netAgreedPrice : undefined,
                        advance_payment_amount: numAdvance,
                        advance_payment_method: numAdvance ? paymentMethod : null,
                        advance_payment_reference: numAdvance ? paymentReference || null : null,
                        advance_payment_date: numAdvance ? paymentDate || null : null,
                        advance_payment_notes: numAdvance ? paymentNotes || null : null,
                    };
                    const osPayload: CreatePlannedSurgeryRequest = {
                        patient_id: patientId,
                        surgery_id: surgeryId,
                        surgery_name: surgeryName,
                        surgeon_id: surgeonId,
                        eye: "OS",
                        planned_date: osPlannedDate || plannedDate || null,
                        planned_time: plannedTime || null,
                        hospital_name: hospitalName || null,
                        notes: notes ? `${notes} (Left Eye - OS)` : "Left Eye (OS)",
                        package_id: selectedPackageId,
                        package_price: selectedPackageId ? netAgreedPrice : undefined,
                    };

                    await plannedSurgeriesApi.create(odPayload);
                    await plannedSurgeriesApi.create(osPayload);
                    toast.success("Planned surgeries for Right Eye (OD) and Left Eye (OS) created successfully");
                } else {
                    const createPayload: CreatePlannedSurgeryRequest = {
                        patient_id: patientId,
                        surgery_id: surgeryId,
                        surgery_name: surgeryName,
                        surgeon_id: surgeonId,
                        eye: isEyeSurgery ? eye : null,
                        planned_date: plannedDate || null,
                        planned_time: plannedTime || null,
                        hospital_name: hospitalName || null,
                        notes: notes || null,
                        package_id: selectedPackageId,
                        package_price: selectedPackageId ? netAgreedPrice : undefined,
                        advance_payment_amount: numAdvance,
                        advance_payment_method: numAdvance ? paymentMethod : null,
                        advance_payment_reference: numAdvance ? paymentReference || null : null,
                        advance_payment_date: numAdvance ? paymentDate || null : null,
                        advance_payment_notes: numAdvance ? paymentNotes || null : null,
                    };
                    await plannedSurgeriesApi.create(createPayload);
                    toast.success("Planned surgery created successfully");
                }
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

    const isEyeSurgery = selectedSurgery?.is_eye_surgery ?? true;
    const isInvoiceLocked = !!initialData?.surgery_invoice_id;
    const selectedPkg = packages.find((p) => p.id === selectedPackageId);
    const activeBasePrice = selectedPkg
        ? (eye === "OU" ? (selectedPkg.ou_price ?? selectedPkg.price * 2) : selectedPkg.price)
        : (initialData?.package_price ? Number(initialData.package_price) : 0);
    const netAgreedPrice = selectedPkg
        ? Math.max(0, activeBasePrice - (parseFloat(packageDiscount) || 0))
        : (initialData?.package_price ? Number(initialData.package_price) : 0);
    const calculatedOuPrice = activeBasePrice;

    // Sync package discount when initialData or selectedPkg changes
    useEffect(() => {
        if (initialData?.package_price && selectedPkg) {
            const isOu = eye === "OU";
            const basePrice = isOu ? (selectedPkg.ou_price ?? selectedPkg.price * 2) : selectedPkg.price;
            const storedPrice = Number(initialData.package_price);
            if (basePrice > storedPrice) {
                setPackageDiscount((basePrice - storedPrice).toString());
            } else {
                setPackageDiscount("0");
            }
        }
    }, [initialData, selectedPkg, eye]);

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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-teal-50 px-6 py-4">
                                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                                        {isEditing ? "Edit Planned Surgery" : "Plan New Surgery"}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
                                    {/* Patient Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <User className="h-4 w-4 text-slate-400" />
                                            Patient <span className="text-rose-500">*</span>
                                        </label>
                                        {isEditing ? (
                                            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                                                {patientName || "Unknown Patient"}
                                            </div>
                                        ) : (
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
                                        )}
                                    </div>

                                    {/* Surgery Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            Surgery Type {isEditing && <span className="text-xs font-normal text-slate-400">(Prescribed by Doctor)</span>} {!isEditing && <span className="text-rose-500">*</span>}
                                        </label>
                                        {isEditing ? (
                                            <div className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-2.5 text-sm font-bold text-slate-800 flex items-center justify-between">
                                                <span>{surgeryName || initialData?.surgery_name || "Prescribed Surgery"}</span>
                                                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Prescribed by Doctor</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={surgeryId}
                                                onChange={handleSurgeryChange}
                                                disabled={loadingSurgeries}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                                            >
                                                <option value="">Select surgery...</option>
                                                {surgeries.map((surgery) => (
                                                    <option key={surgery.id} value={surgery.id}>
                                                        {surgery.name} {surgery.category ? `(${surgery.category})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
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
                                            disabled={isEditing}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                                        >
                                            <option value="">Select surgeon...</option>
                                            {doctors.map((doctor) => (
                                                <option key={doctor.id} value={doctor.id}>
                                                    {doctor.name || doctor.user?.name || doctor.user_name || `Dr. ${doctor.id.slice(0, 8)}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Prescribed Eye Selection Section */}
                                    {isEditing ? (
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                <Eye className="h-4 w-4 text-sky-600" />
                                                Prescribed Operating Eye <span className="text-xs text-slate-400 font-normal">(Prescribed by Doctor)</span>
                                            </label>
                                            <div className="w-full rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-sky-950">Doctor Prescribed Eye:</span>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                                                    eye === "OD"
                                                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                                                        : eye === "OS"
                                                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                                                        : "bg-amber-100 text-amber-900 border border-amber-300"
                                                }`}>
                                                    👁️ {eye === "OD" ? "Right Eye (OD)" : eye === "OS" ? "Left Eye (OS)" : "Both Eyes (OU)"}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (isEyeSurgery || !!eye) ? (
                                        <div className="space-y-2 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                                    <Eye className="h-4 w-4 text-sky-600" />
                                                    Prescribed Operating Eye <span className="text-rose-500">*</span>
                                                </label>
                                                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                                    {eye === "OD" ? "👁️ Right Eye (OD)" : eye === "OS" ? "👁️ Left Eye (OS)" : "👁️ Both Eyes (OU)"}
                                                </span>
                                            </div>
                                            <div className="flex gap-3 pt-1">
                                                {(["OD", "OS", "OU"] as const).map((eyeOption) => {
                                                    const isSelected = eye === eyeOption;
                                                    return (
                                                        <button
                                                            key={eyeOption}
                                                            type="button"
                                                            onClick={() => setEye(eyeOption)}
                                                            className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                                isSelected
                                                                    ? eyeOption === "OD"
                                                                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                                                                        : eyeOption === "OS"
                                                                        ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-300"
                                                                        : "bg-amber-600 text-white shadow-md ring-2 ring-amber-300"
                                                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            <span>👁️</span>
                                                            <span>{eyeOption === "OD" ? "Right Eye (OD)" : eyeOption === "OS" ? "Left Eye (OS)" : "Both Eyes (OU)"}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {eye === "OU" && (
                                                <div className="mt-2 space-y-2 rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
                                                    <p className="flex items-center gap-1">
                                                        ℹ️ Both eyes (OU) selected — package pricing applies to bilateral procedure.
                                                    </p>
                                                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer pt-1 border-t border-sky-200/60">
                                                        <input
                                                            type="checkbox"
                                                            checked={splitOuSurgeries}
                                                            onChange={(e) => setSplitOuSurgeries(e.target.checked)}
                                                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                                                        />
                                                        <Split className="h-3.5 w-3.5 text-sky-600" />
                                                        Plan as 2 separate entries (OD & OS) for different dates
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}

                                    {/* Planned Date and Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {splitOuSurgeries ? "Right Eye (OD) Date" : "Planned Date"}{" "}
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

                                        {splitOuSurgeries ? (
                                            <div className="space-y-1.5">
                                                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    Left Eye (OS) Date
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
                                                        const isOu = eye === "OU";
                                                        const activePrice = isOu ? (pkg.ou_price ?? pkg.price * 2) : pkg.price;
                                                        const altPrice = isOu ? pkg.price : (pkg.ou_price ?? pkg.price * 2);
                                                        const altLabel = isOu ? "Single Eye" : "Both Eyes (OU)";

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
                                                                            {isOu ? "Both Eyes (OU)" : "Single Eye"}
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
                                                                        {altLabel}: ₹{altPrice.toLocaleString("en-IN")}
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

                                    {/* Billing & Payments Summary Card */}
                                    {isEditing && (summary || payments.length > 0 || hasCollectedPayment) && (
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
                                            rows={2}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
