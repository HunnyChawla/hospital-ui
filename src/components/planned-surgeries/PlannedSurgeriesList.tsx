"use client";

import { useEffect, useState, useCallback } from "react";
import {
    usePlannedSurgeries,
    useCancelPlannedSurgery,
    useTransitionSurgeryStatus,
    useRescheduleSurgery,
    plannedSurgeryKeys,
} from "@/hooks/queries/usePlannedSurgeries";
import { PlannedSurgery, PlannedSurgeryStatus } from "@/types";
import { formatDate, getTodayDateLocal } from "@/utils/format";
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
    LayoutGrid,
    List,
    RotateCcw,
    X,
    User,
    Package,
    CreditCard,
    Eye,
    Phone,
    History,
    CalendarClock,
    Ban,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { useTenant } from "@/hooks/useTenant";
import { useAppSelector } from "@/redux/hooks";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PlannedSurgeryFormModal } from "./PlannedSurgeryFormModal";
import { SurgeryHistoryModal } from "./SurgeryHistoryModal";
import { StatusTransitionModal } from "./StatusTransitionModal";
import { RescheduleModal } from "./RescheduleModal";
import { SurgeryDetailModal } from "./SurgeryDetailModal";
import { plannedSurgeriesApi, PlannedSurgeryParams } from "@/services/plannedSurgeriesApi";

type DatePreset = "today" | "yesterday" | "7days" | "custom" | "all";

const getYesterdayDateLocal = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const get7DaysAgoDateLocal = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function ExpandableActionButton({
    onClick,
    icon: Icon,
    title,
    label,
    variant,
}: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    label: string;
    variant: "sky" | "rose" | "amber" | "emerald";
}) {
    const [isHovered, setIsHovered] = useState(false);

    const variantClasses = {
        sky: "bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20",
        rose: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20",
        amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20",
        emerald: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center justify-center overflow-hidden rounded-lg transition-all duration-200 text-xs font-semibold ${
                isHovered ? "px-3 py-1.5" : "h-8 w-8"
            } ${variantClasses[variant]}`}
            title={title}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {isHovered && <span className="ml-1.5 whitespace-nowrap">{label}</span>}
        </button>
    );
}

interface PlannedSurgeriesListProps {
    openFormModal?: boolean;
    onCloseFormModal?: () => void;
}

export function PlannedSurgeriesList({ openFormModal, onCloseFormModal }: PlannedSurgeriesListProps) {
    const queryClient = useQueryClient();
    const { tenant, hospitalName, logoDataUrl } = useTenant();
    const doctors = useAppSelector((s) => s.doctors.list);

    const [exporting, setExporting] = useState(false);

    // View mode state - persisted in localStorage
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("planned_surgeries_view") as "grid" | "list") || "grid";
        }
        return "grid";
    });

    // Filters
    const [patientSearch, setPatientSearch] = useState("");
    const [surgeonId, setSurgeonId] = useState<string>("");
    const [datePreset, setDatePreset] = useState<DatePreset>("today");
    const [fromDate, setFromDate] = useState<string>(() => getTodayDateLocal());
    const [toDate, setToDate] = useState<string>(() => getTodayDateLocal());
    const [statusFilter, setStatusFilter] = useState<PlannedSurgeryStatus | "all">("all");
    const [sortBy, setSortBy] = useState<"advised_date" | "planned_date" | "created_at">("advised_date");

    const handleDatePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        if (preset === "today") {
            const today = getTodayDateLocal();
            setFromDate(today);
            setToDate(today);
        } else if (preset === "yesterday") {
            const yest = getYesterdayDateLocal();
            setFromDate(yest);
            setToDate(yest);
        } else if (preset === "7days") {
            setFromDate(get7DaysAgoDateLocal());
            setToDate(getTodayDateLocal());
        } else if (preset === "all") {
            setFromDate("");
            setToDate("");
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);

    // Detail modal
    const [detailModalSurgery, setDetailModalSurgery] = useState<PlannedSurgery | null>(null);

    // History modal
    const [historyModalSurgery, setHistoryModalSurgery] = useState<PlannedSurgery | null>(null);

    // Transition modal
    const [transitionModalSurgery, setTransitionModalSurgery] = useState<PlannedSurgery | null>(null);
    const [transitionTargetStatus, setTransitionTargetStatus] = useState<PlannedSurgeryStatus>("cancelled");

    // Reschedule modal
    const [rescheduleModalSurgery, setRescheduleModalSurgery] = useState<PlannedSurgery | null>(null);

    // Sync external trigger for form modal if passed
    useEffect(() => {
        if (openFormModal) {
            setSelectedSurgery(null);
            setIsModalOpen(true);
        }
    }, [openFormModal]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        if (onCloseFormModal) {
            onCloseFormModal();
        }
    };

    // React Query hook
    const queryParams: PlannedSurgeryParams = {
        page: currentPage,
        page_size: pageSize,
        surgeon_id: surgeonId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sort_by: sortBy,
    };

    const { data: surgeriesResponse, isLoading: loading, error } = usePlannedSurgeries(queryParams);
    const cancelSurgeryMutation = useCancelPlannedSurgery();
    const transitionMutation = useTransitionSurgeryStatus();
    const rescheduleMutation = useRescheduleSurgery();

    const rawSurgeries = surgeriesResponse?.items ?? [];
    const totalPages = surgeriesResponse?.total_pages ?? 1;
    const total = surgeriesResponse?.total ?? 0;

    // Keep detailModalSurgery synced with latest data from query
    useEffect(() => {
        if (detailModalSurgery) {
            const updated = rawSurgeries.find((s) => s.id === detailModalSurgery.id);
            if (updated) {
                setDetailModalSurgery(updated);
            }
        }
    }, [rawSurgeries, detailModalSurgery?.id]);

    // Client-side search filter by patient name, mobile, surgery name, or surgeon
    const surgeries = rawSurgeries.filter((s) => {
        if (!patientSearch.trim()) return true;
        const q = patientSearch.toLowerCase().trim();
        return (
            (s.patient_name && s.patient_name.toLowerCase().includes(q)) ||
            (s.patient_uhid && s.patient_uhid.toLowerCase().includes(q)) ||
            (s.patient_mobile && s.patient_mobile.includes(q)) ||
            (s.surgery_name && s.surgery_name.toLowerCase().includes(q)) ||
            (s.surgeon_name && s.surgeon_name.toLowerCase().includes(q)) ||
            (s.package_name && s.package_name.toLowerCase().includes(q))
        );
    });

    // Reset to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [surgeonId, fromDate, toDate, statusFilter, sortBy, patientSearch]);

    const handleCreate = () => {
        setSelectedSurgery(null);
        setIsModalOpen(true);
    };

    const handleEdit = (surgery: PlannedSurgery) => {
        setSelectedSurgery(surgery);
        setIsModalOpen(true);
    };

    const handleTransition = (surgery: PlannedSurgery, targetStatus: PlannedSurgeryStatus) => {
        setTransitionModalSurgery(surgery);
        setTransitionTargetStatus(targetStatus);
    };

    const handleReschedule = (surgery: PlannedSurgery) => {
        setRescheduleModalSurgery(surgery);
    };

    const handleViewHistory = (surgery: PlannedSurgery) => {
        setHistoryModalSurgery(surgery);
    };

    const handleModalSuccess = () => {
        queryClient.invalidateQueries({ queryKey: plannedSurgeryKeys.lists() });
        setDetailModalSurgery(null);
        handleCloseModal();
    };

    const isTerminalStatus = (status: PlannedSurgeryStatus) =>
        status === "completed" || status === "cancelled" || status === "denied";

    const getStatusColor = (status: PlannedSurgeryStatus) => {
        switch (status) {
            case "advised":
                return "bg-amber-50 text-amber-700 ring-amber-600/20";
            case "scheduled":
                return "bg-sky-50 text-sky-700 ring-sky-600/20";
            case "postponed":
                return "bg-orange-50 text-orange-700 ring-orange-600/20";
            case "completed":
                return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
            case "cancelled":
                return "bg-rose-50 text-rose-700 ring-rose-600/20";
            case "denied":
                return "bg-red-50 text-red-700 ring-red-600/20";
            default:
                return "bg-slate-50 text-slate-700 ring-slate-600/20";
        }
    };

    const getStatusIcon = (status: PlannedSurgeryStatus) => {
        switch (status) {
            case "advised":
                return <AlertCircle className="h-3.5 w-3.5" />;
            case "scheduled":
                return <CalendarClock className="h-3.5 w-3.5" />;
            case "postponed":
                return <Clock className="h-3.5 w-3.5" />;
            case "completed":
                return <CheckCircle2 className="h-3.5 w-3.5" />;
            case "cancelled":
                return <XCircle className="h-3.5 w-3.5" />;
            case "denied":
                return <Ban className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    const getEyeBadge = (eye?: string | null) => {
        if (!eye) return null;
        switch (eye) {
            case "OD":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Right Eye (OD)</span>;
            case "OS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Left Eye (OS)</span>;
            case "OU":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Both Eyes (OU)</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">{eye}</span>;
        }
    };

    const formatStatus = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const formatDateTime = (date: string, time: string | null) => {
        const formattedDate = formatDate(date);
        if (time) {
            const timeStr = time.slice(0, 5);
            return `${formattedDate} at ${timeStr}`;
        }
        return formattedDate;
    };

    const handleExportPDF = useCallback(async () => {
        setExporting(true);
        try {
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

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            let yPos = 15;

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

                    let imageFormat: string = "PNG";
                    if (logoDataUrl.startsWith("data:image/jpeg") || logoDataUrl.startsWith("data:image/jpg")) {
                        imageFormat = "JPEG";
                    }

                    doc.addImage(logoDataUrl, imageFormat, logoX, yPos, logoWidthMm, logoHeightMm);
                    yPos += logoHeightMm + 5;
                } catch (error) {
                    console.warn("Could not add logo to PDF:", error);
                }
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            const hospitalNameText = (tenant?.name || hospitalName || "HOSPITAL").toUpperCase();
            doc.text(hospitalNameText, centerX, yPos, { align: "center" });
            yPos += 8;

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

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text("Planned Surgeries Report", centerX, yPos, { align: "center" });
            yPos += 8;

            doc.setLineWidth(0.5);
            doc.setDrawColor(30, 41, 59);
            doc.line(14, yPos, pageWidth - 14, yPos);
            yPos += 6;

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

            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, yPos);
            doc.text(`Total: ${allSurgeries.length} surgeries`, pageWidth - 14, yPos, { align: "right" });
            yPos += 8;

            const tableData = allSurgeries.map((surgery) => [
                surgery.planned_date ? formatDate(surgery.planned_date) : `Advised: ${formatDate(surgery.advised_date || surgery.created_at)}`,
                surgery.patient_name ? `${surgery.patient_name} (${surgery.patient_uhid || surgery.patient_id.slice(0, 8)})${surgery.patient_mobile ? ` - ${surgery.patient_mobile}` : ""}` : "-",
                surgery.surgery_name,
                surgery.eye || "-",
                surgery.surgeon_name || "-",
                formatStatus(surgery.status),
                surgery.notes?.slice(0, 30) || "-",
            ]);

            const availableWidth = pageWidth - 28;

            autoTable(doc, {
                startY: yPos,
                head: [["Date", "Patient", "Surgery", "Eye", "Surgeon", "Status", "Notes"]],
                body: tableData,
                theme: "striped",
                headStyles: {
                    fillColor: [14, 165, 233],
                    textColor: 255,
                    fontStyle: "bold",
                },
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                },
                columnStyles: {
                    0: { cellWidth: availableWidth * 0.12 },
                    1: { cellWidth: availableWidth * 0.18 },
                    2: { cellWidth: availableWidth * 0.20 },
                    3: { cellWidth: availableWidth * 0.08 },
                    4: { cellWidth: availableWidth * 0.16 },
                    5: { cellWidth: availableWidth * 0.10 },
                    6: { cellWidth: availableWidth * 0.16 },
                },
                margin: { left: 14, right: 14 },
            });

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
        setDatePreset("today");
        const today = getTodayDateLocal();
        setFromDate(today);
        setToDate(today);
        setStatusFilter("all");
        setSortBy("advised_date");
    };

    const todayStr = getTodayDateLocal();
    const hasActiveFilters =
        patientSearch ||
        surgeonId ||
        datePreset !== "today" ||
        fromDate !== todayStr ||
        toDate !== todayStr ||
        statusFilter !== "all" ||
        sortBy !== "advised_date";

    return (
        <div className="space-y-4">
            {/* Filter Bar Controls - Styled exactly like OPD & Appointments List */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${datePreset === "custom" ? "lg:grid-cols-6" : "lg:grid-cols-4"} flex-1`}>
                    {/* Search Patient / Surgery */}
                    <label className="space-y-1">
                        <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                            <Search className="h-3.5 w-3.5" />
                            Search
                        </span>
                        <div className="relative">
                            <input
                                type="text"
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search patient, surgery..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                            />
                            {patientSearch && (
                                <button
                                    onClick={() => setPatientSearch("")}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </label>

                    {/* Date Range Preset */}
                    <label className="space-y-1">
                        <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-sky-500" />
                            Date Range
                        </span>
                        <select
                            value={datePreset}
                            onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-sky-400"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="custom">Custom Range</option>
                            <option value="all">All Time</option>
                        </select>
                    </label>

                    {/* Custom Range Pickers (shown when custom is selected) */}
                    {datePreset === "custom" && (
                        <>
                            <label className="space-y-1">
                                <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Start Date
                                </span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    max={toDate || undefined}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                                />
                            </label>

                            <label className="space-y-1">
                                <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                                    <Calendar className="h-3.5 w-3.5" />
                                    End Date
                                </span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    min={fromDate || undefined}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                                />
                            </label>
                        </>
                    )}

                    {/* Surgeon Filter */}
                    <label className="space-y-1">
                        <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                            <Stethoscope className="h-3.5 w-3.5" />
                            Surgeon
                        </span>
                        <select
                            value={surgeonId}
                            onChange={(e) => setSurgeonId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                        >
                            <option value="">All Surgeons</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.name || doc.user?.name || `Dr. ${doc.specialization}`}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Status Filter */}
                    <label className="space-y-1">
                        <span className="text-slate-600 flex items-center gap-1 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Status
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as PlannedSurgeryStatus | "all")}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400"
                        >
                            <option value="all">All Statuses</option>
                            <option value="advised">Advised</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="postponed">Postponed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="denied">Denied</option>
                        </select>
                    </label>
                </div>

                {/* Right controls: View Toggle & PDF Export & Clear */}
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            title="Clear all filters"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        <button
                            onClick={() => {
                                setViewMode("list");
                                localStorage.setItem("planned_surgeries_view", "list");
                            }}
                            className={`flex items-center justify-center rounded-lg p-2 transition ${
                                viewMode === "list" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"
                            }`}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => {
                                setViewMode("grid");
                                localStorage.setItem("planned_surgeries_view", "grid");
                            }}
                            className={`flex items-center justify-center rounded-lg p-2 transition ${
                                viewMode === "grid" ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-slate-50"
                            }`}
                            title="Card View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Export planned surgeries to PDF"
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                <span>Export PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error or Loading state */}
            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                    <p className="text-sm text-rose-800">
                        Failed to load planned surgeries. Please try again.
                    </p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-48 rounded-xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse space-y-3">
                            <div className="h-5 w-3/4 bg-slate-200 rounded" />
                            <div className="h-4 w-1/2 bg-slate-200 rounded" />
                            <div className="h-4 w-2/3 bg-slate-200 rounded" />
                            <div className="h-6 w-1/3 bg-slate-200 rounded-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : surgeries.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-slate-900">No planned surgeries found</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Try adjusting your search query or filter parameters.
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Clear all filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Grid View Mode */}
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {surgeries.map((surgery) => (
                                <div
                                    key={surgery.id}
                                    onClick={() => setDetailModalSurgery(surgery)}
                                    className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md h-full cursor-pointer group"
                                >
                                    <div className="flex flex-col gap-3">
                                        {/* Card Header: Patient Name & Eye Tag */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors" title={surgery.patient_name || ""}>
                                                    {surgery.patient_name || `Patient ${surgery.patient_id.slice(0, 8)}...`}
                                                </p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                                                    <span>UHID: <strong className="font-medium text-slate-700">{surgery.patient_uhid || surgery.patient_id.slice(0, 8)}</strong></span>
                                                    {surgery.patient_mobile && (
                                                        <span className="flex items-center gap-1 font-medium text-slate-600">
                                                            <Phone className="h-3 w-3 text-slate-400" />
                                                            {surgery.patient_mobile}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {getEyeBadge(surgery.eye)}
                                            </div>
                                        </div>

                                        {/* Surgery Name & Package details */}
                                        <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1.5 border border-slate-100">
                                            <div className="font-medium text-slate-800 text-sm">
                                                {surgery.surgery_name}
                                            </div>
                                            {surgery.package_name && (
                                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-100/60 px-2 py-0.5 rounded">
                                                    <Package className="h-3 w-3" />
                                                    Package: {surgery.package_name} {surgery.package_price ? `(₹${Number(surgery.package_price).toLocaleString("en-IN")})` : ""}
                                                </div>
                                            )}
                                            {surgery.advance_payment_amount && Number(surgery.advance_payment_amount) > 0 ? (
                                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded block">
                                                    <CreditCard className="h-3 w-3" />
                                                    Advance: ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")} {surgery.advance_payment_method ? `(${surgery.advance_payment_method.toUpperCase()})` : ""}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Surgeon & Date Info */}
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">Surgeon: <strong className="font-medium text-slate-700">{surgery.surgeon_name || "Unassigned"}</strong></span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                                <span>
                                                    {surgery.planned_date ? (
                                                        <>Planned: <strong className="font-medium text-slate-800">{formatDateTime(surgery.planned_date, surgery.planned_time)}</strong></>
                                                    ) : (
                                                        <>Advised: <strong className="font-medium text-amber-700">{formatDate(surgery.advised_date || surgery.created_at)}</strong></>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Followup date for postponed */}
                                        {surgery.status === "postponed" && surgery.followup_date && (
                                            <div className="flex items-center gap-1.5 text-xs text-orange-600">
                                                <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                                <span>Follow-up: <strong className="font-medium">{formatDate(surgery.followup_date)}</strong></span>
                                            </div>
                                        )}

                                        {/* Reschedule count */}
                                        {surgery.reschedule_count > 0 && (
                                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-fit">
                                                <RefreshCw className="h-3 w-3" />
                                                Rescheduled {surgery.reschedule_count}x
                                            </div>
                                        )}

                                        {surgery.notes && (
                                            <div className="text-xs text-slate-500 italic line-clamp-2">
                                                &quot;{surgery.notes}&quot;
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer: Streamlined Status Pill & Key Actions */}
                                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-50 pt-3" onClick={(e) => e.stopPropagation()}>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusColor(surgery.status)}`}>
                                            {getStatusIcon(surgery.status)}
                                            <span className="capitalize">{formatStatus(surgery.status)}</span>
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            {/* History icon button */}
                                            <ExpandableActionButton
                                                onClick={() => handleViewHistory(surgery)}
                                                icon={History}
                                                title="View Surgery Timeline"
                                                label="History"
                                                variant="sky"
                                            />

                                            {/* Primary contextual action button */}
                                            {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                                                <ExpandableActionButton
                                                    onClick={() => handleReschedule(surgery)}
                                                    icon={CalendarClock}
                                                    title={surgery.status === "advised" ? "Schedule Date" : "Reschedule Date"}
                                                    label={surgery.status === "advised" ? "Schedule" : "Reschedule"}
                                                    variant="amber"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View Mode (Table) */
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Patient
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Surgery & Details
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Eye
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Surgeon
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Planned / Advised Date
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Status
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Notes
                                            </th>
                                            <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {surgeries.map((surgery) => (
                                            <tr
                                                key={surgery.id}
                                                onClick={() => setDetailModalSurgery(surgery)}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            >
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <span className="font-semibold text-slate-900 block">
                                                        {surgery.patient_name || "-"}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span>UHID: {surgery.patient_uhid || surgery.patient_id.slice(0, 8)}</span>
                                                        {surgery.patient_mobile && (
                                                            <span className="flex items-center gap-0.5 text-slate-500">
                                                                <Phone className="h-3 w-3 text-slate-400" />
                                                                {surgery.patient_mobile}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-semibold text-slate-800">
                                                            {surgery.surgery_name}
                                                        </span>
                                                        {surgery.package_name && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md w-fit">
                                                                Package: {surgery.package_name} {surgery.package_price ? `(₹${Number(surgery.package_price).toLocaleString("en-IN")})` : ""}
                                                            </span>
                                                        )}
                                                        {surgery.advance_payment_amount && Number(surgery.advance_payment_amount) > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                                                                Advance: ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")} {surgery.advance_payment_method ? `(${surgery.advance_payment_method.toUpperCase()})` : ""}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    {getEyeBadge(surgery.eye)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                                                        <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                                                        <span>{surgery.surgeon_name || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700">
                                                    {surgery.planned_date ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-sky-500" />
                                                            <span className="font-medium">{formatDateTime(surgery.planned_date, surgery.planned_time)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                                                            <Clock className="h-3 w-3" />
                                                            Advised: {formatDate(surgery.advised_date || surgery.created_at)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusColor(surgery.status)}`}>
                                                        {getStatusIcon(surgery.status)}
                                                        {formatStatus(surgery.status)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="text-xs text-slate-500 line-clamp-1 max-w-[150px]" title={surgery.notes || ""}>
                                                        {surgery.notes || "-"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <ExpandableActionButton
                                                            onClick={() => handleViewHistory(surgery)}
                                                            icon={History}
                                                            title="View Timeline"
                                                            label="History"
                                                            variant="sky"
                                                        />
                                                        {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                                                            <ExpandableActionButton
                                                                onClick={() => handleReschedule(surgery)}
                                                                icon={CalendarClock}
                                                                title="Reschedule"
                                                                label="Reschedule"
                                                                variant="amber"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Bar - Styled matching Appointments & OPD list */}
                    {totalPages > 1 && (
                        <div className="flex flex-col items-center gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
                            <div className="text-sm text-slate-500">
                                Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                                <span className="font-semibold text-slate-900">{totalPages}</span>
                                {total > 0 && <span className="ml-1 text-slate-500">({total} total surgeries)</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>

                                {/* Numbered pages */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`min-w-[2.25rem] rounded-lg px-2.5 py-1 text-sm font-semibold transition ${
                                                    currentPage === pageNum
                                                        ? "bg-sky-500 text-white"
                                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            <SurgeryDetailModal
                surgery={detailModalSurgery}
                isOpen={!!detailModalSurgery}
                onClose={() => setDetailModalSurgery(null)}
                onEdit={handleEdit}
                onViewHistory={handleViewHistory}
                onReschedule={handleReschedule}
                onTransition={handleTransition}
            />

            {/* Form Modal */}
            <PlannedSurgeryFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleModalSuccess}
                initialData={selectedSurgery}
            />

            {/* History Modal */}
            <SurgeryHistoryModal
                surgeryId={historyModalSurgery?.id || ""}
                surgeryName={historyModalSurgery?.surgery_name || ""}
                patientName={historyModalSurgery?.patient_name || ""}
                isOpen={!!historyModalSurgery}
                onClose={() => setHistoryModalSurgery(null)}
            />

            {/* Status Transition Modal */}
            <StatusTransitionModal
                isOpen={!!transitionModalSurgery}
                onClose={() => setTransitionModalSurgery(null)}
                onConfirm={(data) => {
                    if (!transitionModalSurgery) return;
                    transitionMutation.mutate(
                        { id: transitionModalSurgery.id, payload: data },
                        {
                            onSuccess: () => {
                                setTransitionModalSurgery(null);
                            },
                        }
                    );
                }}
                currentStatus={transitionModalSurgery?.status || "advised"}
                targetStatus={transitionTargetStatus}
                surgeryName={transitionModalSurgery?.surgery_name || ""}
                patientName={transitionModalSurgery?.patient_name || ""}
                isLoading={transitionMutation.isPending}
            />

            {/* Reschedule Modal */}
            <RescheduleModal
                isOpen={!!rescheduleModalSurgery}
                onClose={() => setRescheduleModalSurgery(null)}
                onConfirm={(data) => {
                    if (!rescheduleModalSurgery) return;
                    rescheduleMutation.mutate(
                        { id: rescheduleModalSurgery.id, payload: data },
                        {
                            onSuccess: () => {
                                setRescheduleModalSurgery(null);
                            },
                        }
                    );
                }}
                surgeryName={rescheduleModalSurgery?.surgery_name || ""}
                patientName={rescheduleModalSurgery?.patient_name || ""}
                currentDate={rescheduleModalSurgery?.planned_date}
                currentTime={rescheduleModalSurgery?.planned_time}
                isLoading={rescheduleMutation.isPending}
            />
        </div>
    );
}
