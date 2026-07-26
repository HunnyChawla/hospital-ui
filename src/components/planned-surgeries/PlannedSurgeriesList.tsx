"use client";

import { useEffect, useState, useCallback } from "react";
import { plannedSurgeriesApi, PlannedSurgeryParams, PaginatedPlannedSurgeryResponse } from "@/services/plannedSurgeriesApi";
import { PlannedSurgery, PlannedSurgeryStatus } from "@/types";
import { formatDate, formatCurrencyForPDF, getTodayDateLocal } from "@/utils/format";
import {
    Search,
    Calendar,
    Download,
    ChevronLeft,
    ChevronRight,
    Filter,
    Stethoscope,
    Clock,
    CheckCircle2,
    XCircle,
    CalendarDays,
    Loader2,
    AlertCircle,
    Plus,
    Pencil,
    Phone
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useTenant } from "@/hooks/useTenant";
import { useAppSelector } from "@/redux/hooks";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PlannedSurgeryFormModal } from "./PlannedSurgeryFormModal";

export function PlannedSurgeriesList() {
    const { tenant, hospitalName, logoDataUrl } = useTenant();
    const doctors = useAppSelector((s) => s.doctors.list);

    const [surgeries, setSurgeries] = useState<PlannedSurgery[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [patientSearch, setPatientSearch] = useState("");
    const [surgeonId, setSurgeonId] = useState<string>("");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<PlannedSurgeryStatus | "all">("all");
    const [dateStatusFilter, setDateStatusFilter] = useState<"all" | "planned" | "not_planned">("all");
    const [sortBy, setSortBy] = useState<"advised_date" | "planned_date" | "created_at">("advised_date");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);

    const fetchSurgeries = useCallback(async () => {
        setLoading(true);
        try {
            const params: PlannedSurgeryParams = {
                page: currentPage,
                page_size: pageSize,
                surgeon_id: surgeonId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                date_status: dateStatusFilter !== "all" ? dateStatusFilter : undefined,
                sort_by: sortBy,
            };

            const response = await plannedSurgeriesApi.list(params);
            setSurgeries(response.items);
            setTotalPages(response.total_pages);
            setTotal(response.total);
        } catch (error: any) {
            console.error("Failed to fetch planned surgeries:", error);
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || "Failed to fetch planned surgeries");
            setSurgeries([]);
            setTotalPages(1);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, surgeonId, fromDate, toDate, statusFilter, dateStatusFilter, sortBy]);

    useEffect(() => {
        setCurrentPage(1);
    }, [surgeonId, fromDate, toDate, statusFilter, dateStatusFilter, sortBy]);

    useEffect(() => {
        fetchSurgeries();
    }, [fetchSurgeries]);

    const handleCreate = () => {
        setSelectedSurgery(null);
        setIsModalOpen(true);
    };

    const handleEdit = (surgery: PlannedSurgery) => {
        setSelectedSurgery(surgery);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchSurgeries();
    };

    const getStatusColor = (status: PlannedSurgeryStatus) => {
        switch (status) {
            case "scheduled":
                return "bg-sky-50 text-sky-700 ring-sky-600/20";
            case "completed":
                return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
            case "cancelled":
                return "bg-rose-50 text-rose-700 ring-rose-600/20";
            default:
                return "bg-slate-50 text-slate-700 ring-slate-600/20";
        }
    };

    const getStatusIcon = (status: PlannedSurgeryStatus) => {
        switch (status) {
            case "scheduled":
                return <Clock className="h-3 w-3" />;
            case "completed":
                return <CheckCircle2 className="h-3 w-3" />;
            case "cancelled":
                return <XCircle className="h-3 w-3" />;
            default:
                return null;
        }
    };

    const getEyeLabel = (eye?: string | null) => {
        switch (eye) {
            case "OD":
                return "Right Eye (OD)";
            case "OS":
                return "Left Eye (OS)";
            case "OU":
                return "Both Eyes (OU)";
            default:
                return eye || "-";
        }
    };

    const getEyeColor = (eye?: string | null) => {
        switch (eye) {
            case "OD":
                return "bg-blue-50 text-blue-700 ring-blue-600/20";
            case "OS":
                return "bg-purple-50 text-purple-700 ring-purple-600/20";
            case "OU":
                return "bg-amber-50 text-amber-700 ring-amber-600/20";
            default:
                return "bg-slate-50 text-slate-700 ring-slate-600/20";
        }
    };

    const formatStatus = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const formatDateTime = (date: string, time: string | null) => {
        const formattedDate = formatDate(date);
        if (time) {
            const timeStr = time.slice(0, 5); // Get HH:MM
            return `${formattedDate} at ${timeStr}`;
        }
        return formattedDate;
    };

    const handleExportPDF = useCallback(async () => {
        setExporting(true);
        try {
            // Fetch all data without pagination
            const params: PlannedSurgeryParams = {
                surgeon_id: surgeonId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            };

            const response = await plannedSurgeriesApi.list(params);
            const allSurgeries = response.items;

            if (allSurgeries.length === 0) {
                toast.error("No planned surgeries found to export");
                setExporting(false);
                return;
            }

            // Format address
            const formatAddress = () => {
                if (!tenant) return null;
                const parts = [
                    tenant.address,
                    tenant.city,
                    tenant.state,
                    tenant.pincode,
                ].filter(Boolean);
                return parts.length > 0 ? parts.join(", ") : null;
            };
            const address = formatAddress();

            // Create PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            let yPos = 15;

            // Add logo if available
            if (logoDataUrl) {
                try {
                    const img = new Image();
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = reject;
                        img.src = logoDataUrl;
                    });

                    const pxToMm = 0.264583;
                    const maxHeightMm = 24;

                    let logoWidthMm = img.width * pxToMm;
                    let logoHeightMm = img.height * pxToMm;

                    if (logoHeightMm > maxHeightMm) {
                        const scale = maxHeightMm / logoHeightMm;
                        logoWidthMm = logoWidthMm * scale;
                        logoHeightMm = maxHeightMm;
                    }

                    const logoX = centerX - (logoWidthMm / 2);

                    let imageFormat: string = 'PNG';
                    if (logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg')) {
                        imageFormat = 'JPEG';
                    }

                    doc.addImage(logoDataUrl, imageFormat, logoX, yPos, logoWidthMm, logoHeightMm);
                    yPos += logoHeightMm + 5;
                } catch (error) {
                    console.warn("Could not add logo to PDF:", error);
                }
            }

            // Hospital Name
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            const hospitalNameText = (tenant?.name || hospitalName || "HOSPITAL").toUpperCase();
            doc.text(hospitalNameText, centerX, yPos, { align: "center" });
            yPos += 8;

            // Address and Contact
            if (address || tenant?.phone_no || tenant?.email) {
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(55, 65, 81);

                if (address) {
                    doc.text(address, centerX, yPos, { align: "center" });
                    yPos += 5;
                }

                const contactParts: string[] = [];
                if (tenant?.phone_no) contactParts.push(`Phone: ${tenant.phone_no}`);
                if (tenant?.email) contactParts.push(`Email: ${tenant.email}`);

                if (contactParts.length > 0) {
                    doc.text(contactParts.join(" | "), centerX, yPos, { align: "center" });
                    yPos += 6;
                }
            }

            doc.setTextColor(0, 0, 0);

            // Document Type
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text("Planned Surgeries Report", centerX, yPos, { align: "center" });
            yPos += 8;

            // Border line
            doc.setLineWidth(0.5);
            doc.setDrawColor(30, 41, 59);
            doc.line(14, yPos, pageWidth - 14, yPos);
            yPos += 6;

            // Filter details
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            if (fromDate && toDate) {
                doc.text("Date Range", 14, yPos);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(`${formatDate(fromDate)} to ${formatDate(toDate)}`, 14, yPos + 4);
            } else if (fromDate) {
                doc.text("From Date", 14, yPos);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(formatDate(fromDate), 14, yPos + 4);
            } else if (toDate) {
                doc.text("To Date", 14, yPos);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(formatDate(toDate), 14, yPos + 4);
            }

            if (statusFilter !== "all") {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text("Status", pageWidth - 14, yPos, { align: "right" });
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(formatStatus(statusFilter), pageWidth - 14, yPos + 4, { align: "right" });
            }

            yPos += 10;

            // Export info
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos);
            doc.text(`Total: ${allSurgeries.length} surgeries`, pageWidth - 14, yPos, { align: "right" });
            yPos += 8;

            // Prepare table data
            const tableData: string[][] = allSurgeries.map((surgery) => [
                surgery.planned_date ? formatDate(surgery.planned_date) : `Advised: ${formatDate(surgery.advised_date || surgery.created_at)}`,
                surgery.patient_name || "-",
                surgery.surgery_name || "-",
                surgery.eye || surgery.anatomy_site_short_code || "-",
                surgery.surgeon_name || "-",
                formatStatus(surgery.status),
                surgery.notes?.slice(0, 30) || "-",
            ]);

            const availableWidth = pageWidth - 28;

            // Add table
            autoTable(doc, {
                startY: yPos,
                head: [["Date", "Patient", "Surgery", "Eye", "Surgeon", "Status", "Notes"]],
                body: tableData,
                theme: "striped",
                headStyles: {
                    fillColor: [14, 165, 233], // Sky-500
                    textColor: 255,
                    fontStyle: "bold",
                },
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                },
                columnStyles: {
                    0: { cellWidth: availableWidth * 0.12 }, // Date
                    1: { cellWidth: availableWidth * 0.18 }, // Patient
                    2: { cellWidth: availableWidth * 0.20 }, // Surgery
                    3: { cellWidth: availableWidth * 0.08 }, // Eye
                    4: { cellWidth: availableWidth * 0.16 }, // Surgeon
                    5: { cellWidth: availableWidth * 0.10 }, // Status
                    6: { cellWidth: availableWidth * 0.16 }, // Notes
                },
                margin: { left: 14, right: 14 },
            });

            // Generate filename
            const filename = fromDate && toDate
                ? `planned_surgeries_${fromDate}_to_${toDate}.pdf`
                : `planned_surgeries_${new Date().toISOString().split("T")[0]}.pdf`;

            doc.save(filename);

            toast.success(`Exported ${allSurgeries.length} planned surgeries successfully`);
        } catch (error: any) {
            console.error("Failed to export planned surgeries:", error);
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || "Failed to export planned surgeries");
        } finally {
            setExporting(false);
        }
    }, [fromDate, toDate, statusFilter, surgeonId, tenant, hospitalName, logoDataUrl]);

    const clearFilters = () => {
        setPatientSearch("");
        setSurgeonId("");
        setFromDate("");
        setToDate("");
        setStatusFilter("all");
        setDateStatusFilter("all");
    };

    const hasActiveFilters = patientSearch || surgeonId || fromDate || toDate || statusFilter !== "all" || dateStatusFilter !== "all";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Planned Surgeries
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        View and manage scheduled surgical procedures
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                    >
                        <Plus className="h-4 w-4" />
                        Plan New Surgery
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Filters</span>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {/* Surgeon Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Stethoscope className="h-4 w-4 text-slate-400" />
                            Surgeon
                        </label>
                        <select
                            value={surgeonId}
                            onChange={(e) => setSurgeonId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                            <option value="">All Surgeons</option>
                            {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name || doctor.user?.name || `Dr. ${doctor.id.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Planning Status Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            Planning Status
                        </label>
                        <select
                            value={dateStatusFilter}
                            onChange={(e) => setDateStatusFilter(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                            <option value="all">All (Planned & Advised)</option>
                            <option value="planned">Planned (Date Set)</option>
                            <option value="not_planned">Not Planned (Advised Only)</option>
                        </select>
                    </div>

                    {/* From Date */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            From Date
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            max={toDate || undefined}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    {/* To Date */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            To Date
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            min={fromDate || undefined}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as PlannedSurgeryStatus | "all")}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                            <option value="all">All Statuses</option>
                            <option value="advised">Advised</option>
                            <option value="counselling_in_progress">Counselling In Progress</option>
                            <option value="pending_patient_decision">Pending Patient Decision</option>
                            <option value="pending_insurance">Pending Insurance</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in_ot_preparation">In OT Prep</option>
                            <option value="postponed">Postponed</option>
                            <option value="completed">Completed / Surgery Completed</option>
                            <option value="cancelled_by_patient">Cancelled (Patient)</option>
                            <option value="cancelled_by_hospital">Cancelled (Hospital)</option>
                        </select>
                    </div>

                    {/* Sort By Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Clock className="h-4 w-4 text-slate-400" />
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                            <option value="advised_date">Advised Date (Newest)</option>
                            <option value="planned_date">Planned Date</option>
                            <option value="created_at">Creation Date</option>
                        </select>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-end">
                        <div className="w-full rounded-xl bg-slate-50 px-4 py-2.5 text-center">
                            <span className="text-lg font-bold text-slate-800">{total}</span>
                            <span className="ml-1 text-sm text-slate-500">results</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Patient
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Surgery
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Eye
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Surgeon
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Planned Date
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Notes
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 rounded bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-40 rounded bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 w-12 rounded-full bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-28 rounded bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-36 rounded bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 w-20 rounded-full bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-24 rounded bg-slate-200" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-8 w-8 rounded bg-slate-200" />
                                        </td>
                                    </tr>
                                ))
                            ) : surgeries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                                <CalendarDays className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">No planned surgeries found</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Try adjusting your filters to find what you&apos;re looking for.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                surgeries.map((surgery) => (
                                    <tr key={surgery.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {surgery.patient_name || "-"}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                {surgery.patient_uhid && (
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-semibold text-slate-700">
                                                        {surgery.patient_uhid}
                                                    </span>
                                                )}
                                                {surgery.patient_mobile && (
                                                    <span className="text-slate-600 flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-slate-400" />
                                                        {surgery.patient_mobile}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-800">
                                                {surgery.surgery_name}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getEyeColor(surgery.eye)}`}>
                                                {surgery.eye}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4 text-slate-400" />
                                                <span className="text-slate-700">
                                                    {surgery.surgeon_name || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col gap-0.5 text-slate-700">
                                                {surgery.planned_date ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-4 w-4 text-sky-500" />
                                                        <span className="font-medium">{formatDate(surgery.planned_date)}{surgery.planned_time ? ` ${surgery.planned_time.slice(0, 5)}` : ""}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                                                        <Clock className="h-3 w-3" />
                                                        Advised: {formatDate(surgery.advised_date || surgery.created_at)}
                                                    </span>
                                                )}
                                                {surgery.planned_date && surgery.advised_date && (
                                                    <span className="text-[11px] text-slate-400 pl-5">
                                                        Advised: {formatDate(surgery.advised_date || surgery.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(surgery.status)}`}>
                                                {getStatusIcon(surgery.status)}
                                                {formatStatus(surgery.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-500 line-clamp-1 max-w-[150px]" title={surgery.notes || ""}>
                                                {surgery.notes || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleEdit(surgery)}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                title="Edit Surgery"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {surgeries.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Showing page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                                <span className="font-semibold text-slate-900">{totalPages}</span>
                                <span className="ml-2 text-slate-500">({total} total results)</span>
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center gap-1 rounded-l-lg px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="text-sm font-medium">Previous</span>
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center gap-1 rounded-r-lg px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                >
                                    <span className="text-sm font-medium">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <PlannedSurgeryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                initialData={selectedSurgery}
            />
        </div>
    );
}
