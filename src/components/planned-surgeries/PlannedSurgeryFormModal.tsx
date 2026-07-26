"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Loader2, Calendar, User, Stethoscope, Eye, Clock, FileText, Building2, CheckCircle2, MapPin, Flame } from "lucide-react";
import { PlannedSurgery, CreatePlannedSurgeryRequest, UpdatePlannedSurgeryRequest, Surgery, PlannedSurgeryStatus, AnatomySite, PlannedSurgeryUrgency } from "@/types";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { surgeriesApi } from "@/services/surgeriesApi";
import { anatomySitesApi } from "@/services/anatomySitesApi";
import { patientsApi, formatPatientName } from "@/services/patientsApi";
import { useAppSelector } from "@/redux/hooks";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTodayDateLocal } from "@/utils/format";

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
    const doctors = useAppSelector((s) => s.doctors.list);
    const isEditing = !!initialData;

    // Form state
    const [patientSearch, setPatientSearch] = useState("");
    const [patientId, setPatientId] = useState("");
    const [patientName, setPatientName] = useState("");
    const [surgeryId, setSurgeryId] = useState("");
    const [surgeryName, setSurgeryName] = useState("");
    const [surgeonId, setSurgeonId] = useState("");
    const [anatomySiteId, setAnatomySiteId] = useState("");
    const [eye, setEye] = useState<"OD" | "OS" | "OU">("OD");
    const [urgency, setUrgency] = useState<PlannedSurgeryUrgency>("elective");
    const [plannedDate, setPlannedDate] = useState(getTodayDateLocal());
    const [plannedTime, setPlannedTime] = useState("");
    const [hospitalName, setHospitalName] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<PlannedSurgeryStatus>("advised");

    // Lists
    const [surgeries, setSurgeries] = useState<Surgery[]>([]);
    const [anatomySites, setAnatomySites] = useState<AnatomySite[]>([]);
    const [patientResults, setPatientResults] = useState<any[]>([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Loading states
    const [saving, setSaving] = useState(false);
    const [loadingSurgeries, setLoadingSurgeries] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Fetch surgeries and anatomy sites list
    useEffect(() => {
        const fetchData = async () => {
            setLoadingSurgeries(true);
            try {
                const [surgRes, sitesRes] = await Promise.all([
                    surgeriesApi.list({ is_active: true, page_size: 100 }),
                    anatomySitesApi.list({ is_active_only: true }),
                ]);
                setSurgeries(surgRes.items);
                setAnatomySites(sitesRes);
            } catch (error) {
                console.error("Failed to fetch surgeries or anatomy sites:", error);
            } finally {
                setLoadingSurgeries(false);
            }
        };
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    // Populate form when editing
    useEffect(() => {
        if (initialData) {
            setPatientId(initialData.patient_id);
            setPatientName(initialData.patient_name || "");
            setSurgeryId(initialData.surgery_id);
            setSurgeryName(initialData.surgery_name);
            setSurgeonId(initialData.surgeon_id);
            setAnatomySiteId(initialData.anatomy_site_id || "");
            if (initialData.eye) setEye(initialData.eye);
            setUrgency(initialData.urgency || "elective");
            setPlannedDate(initialData.planned_date || "");
            setPlannedTime(initialData.planned_time?.slice(0, 5) || "");
            setHospitalName(initialData.hospital_name || "");
            setNotes(initialData.notes || "");
            setStatus(initialData.status);
        } else {
            // Reset form
            setPatientSearch("");
            setPatientId(preSelectedPatientId || "");
            setPatientName(preSelectedPatientName || "");
            setSurgeryId("");
            setSurgeryName("");
            setSurgeonId("");
            setAnatomySiteId("");
            setEye("OD");
            setUrgency("elective");
            setPlannedDate(getTodayDateLocal());
            setPlannedTime("");
            setHospitalName("");
            setNotes("");
            setStatus("advised");
        }
    }, [initialData, isOpen, preSelectedPatientId, preSelectedPatientName]);

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
        const selectedSurgery = surgeries.find((s) => s.id === selectedId);
        setSurgeryName(selectedSurgery?.name || "");
        if (selectedSurgery?.default_anatomy_site_id) {
            setAnatomySiteId(selectedSurgery.default_anatomy_site_id);
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

        setSaving(true);
        try {
            if (isEditing && initialData) {
                const updatePayload: UpdatePlannedSurgeryRequest = {
                    surgery_id: surgeryId,
                    surgery_name: surgeryName,
                    surgeon_id: surgeonId,
                    anatomy_site_id: anatomySiteId || null,
                    eye,
                    urgency,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes || null,
                    status: status,
                };
                await plannedSurgeriesApi.update(initialData.id, updatePayload);
                toast.success("Planned surgery updated successfully");
            } else {
                const createPayload: CreatePlannedSurgeryRequest = {
                    patient_id: patientId,
                    surgery_id: surgeryId,
                    surgeon_id: surgeonId,
                    anatomy_site_id: anatomySiteId || null,
                    eye,
                    urgency,
                    planned_date: plannedDate || null,
                    planned_time: plannedTime || null,
                    hospital_name: hospitalName || null,
                    notes: notes || null,
                    status: "advised",
                };
                await plannedSurgeriesApi.create(createPayload);
                toast.success("Surgery advice created successfully");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || `Failed to ${isEditing ? "update" : "create"} planned surgery`);
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
                                <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                                            Surgery Type <span className="text-rose-500">*</span>
                                        </label>
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

                                    {/* Anatomy Site Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            Anatomy Site / Procedure Location
                                        </label>
                                        <select
                                            value={anatomySiteId}
                                            onChange={(e) => setAnatomySiteId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        >
                                            <option value="">Select anatomy site...</option>
                                            {anatomySites.map((site) => (
                                                <option key={site.id} value={site.id}>
                                                    {site.name} ({site.short_code}) {site.department ? `— ${site.department}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Urgency Selection */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <Flame className="h-4 w-4 text-slate-400" />
                                            Urgency Level
                                        </label>
                                        <div className="flex gap-3">
                                            {(
                                                [
                                                    { id: "elective", label: "Elective" },
                                                    { id: "urgent", label: "Urgent" },
                                                    { id: "emergency", label: "Emergency" },
                                                ] as const
                                            ).map((u) => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => setUrgency(u.id)}
                                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                                        urgency === u.id
                                                            ? u.id === "emergency"
                                                                ? "bg-rose-600 text-white shadow-md"
                                                                : u.id === "urgent"
                                                                ? "bg-amber-600 text-white shadow-md"
                                                                : "bg-emerald-600 text-white shadow-md"
                                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                    }`}
                                                >
                                                    {u.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Eye Selection (Legacy Fallback) */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <Eye className="h-4 w-4 text-slate-400" />
                                            Eye Designation <span className="text-xs text-slate-400 font-normal">(Ophthalmology fallback)</span>
                                        </label>
                                        <div className="flex gap-3">
                                            {(["OD", "OS", "OU"] as const).map((eyeOption) => (
                                                <button
                                                    key={eyeOption}
                                                    type="button"
                                                    onClick={() => setEye(eyeOption)}
                                                    className={`flex-1 rounded-xl px-4 py-2 text-xs font-medium transition-all ${eye === eyeOption
                                                        ? "bg-sky-500 text-white shadow-md"
                                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {eyeOption === "OD" ? "Right (OD)" : eyeOption === "OS" ? "Left (OS)" : "Both (OU)"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date and Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                Planned Date <span className="text-xs text-slate-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={plannedDate}
                                                onChange={(e) => setPlannedDate(e.target.value)}
                                                min={getTodayDateLocal()}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            />
                                        </div>
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
                                    </div>

                                    {/* Hospital Name */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            Hospital Name (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={hospitalName}
                                            onChange={(e) => setHospitalName(e.target.value)}
                                            placeholder="Enter hospital name..."
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        />
                                    </div>

                                    {/* Status Selection (only when editing) */}
                                    {isEditing && (
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
                                                <option value="scheduled">Scheduled</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
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
                                            rows={3}
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
                                                    {isEditing ? "Updating..." : "Creating..."}
                                                </>
                                            ) : (
                                                <>{isEditing ? "Update Surgery" : "Create Surgery"}</>
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
