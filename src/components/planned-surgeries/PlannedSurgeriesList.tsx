"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
    FileText,
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
    Sparkles,
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
import { AdvancePaymentModal } from "./AdvancePaymentModal";
import { SurgeryInvoiceModal } from "./SurgeryInvoiceModal";
import { RefundModal } from "./RefundModal";
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

const getTomorrowDateLocal = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNext7DaysDateLocal = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNextMondayDateLocal = (): string => {
    const d = new Date();
    const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    let daysUntilMonday = 1;
    if (dayOfWeek === 0) {
        daysUntilMonday = 1;
    } else if (dayOfWeek === 6) {
        daysUntilMonday = 2;
    } else {
        daysUntilMonday = 8 - dayOfWeek;
    }
    d.setDate(d.getDate() + daysUntilMonday);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatQuickDateBadge = (dateStr: string) => {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
    } catch {
        return dateStr;
    }
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
    const variantClasses = {
        sky: "bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 border-sky-500",
        rose: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/20 border-rose-500",
        amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 border-amber-500",
        emerald: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 border-emerald-500",
    };

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`group inline-flex h-8 items-center justify-start rounded-lg border px-2 text-xs font-semibold shadow-xs transition-all duration-300 ease-in-out shrink-0 max-w-[32px] hover:max-w-[150px] ${variantClasses[variant]}`}
            title={title}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-in-out font-semibold">
                {label}
            </span>
        </button>
    );
}

interface PlannedSurgeriesListProps {
    openFormModal?: boolean;
    onCloseFormModal?: () => void;
    patientSearch?: string;
    setPatientSearch?: (search: string) => void;
    surgeonId?: string;
    setSurgeonId?: (id: string) => void;
}

export function PlannedSurgeriesList({
    openFormModal,
    onCloseFormModal,
    patientSearch: externalSearch,
    setPatientSearch: setExternalSearch,
    surgeonId: externalSurgeonId,
    setSurgeonId: setExternalSurgeonId,
}: PlannedSurgeriesListProps) {
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

    // Fallback internal filter state if not passed from page header
    const [internalSearch, setInternalSearch] = useState("");
    const [internalSurgeonId, setInternalSurgeonId] = useState("");

    const patientSearch = externalSearch !== undefined ? externalSearch : internalSearch;
    const setPatientSearch = setExternalSearch || setInternalSearch;

    const surgeonId = externalSurgeonId !== undefined ? externalSurgeonId : internalSurgeonId;
    const setSurgeonId = setExternalSurgeonId || setInternalSurgeonId;

    // Filters
    const [datePreset, setDatePreset] = useState<DatePreset>("today");
    const [fromDate, setFromDate] = useState<string>(() => getTodayDateLocal());
    const [toDate, setToDate] = useState<string>(() => getTodayDateLocal());
    const [followupDue, setFollowupDue] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<PlannedSurgeryStatus | "all">("all");
    const [activePill, setActivePill] = useState<string>("today");
    const [sortBy, setSortBy] = useState<"advised_date" | "planned_date" | "created_at">("advised_date");

    // Tab scrolling arrows
    const tabsRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabScroll = useCallback(() => {
        const el = tabsRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    }, []);

    useEffect(() => {
        checkTabScroll();
        window.addEventListener("resize", checkTabScroll);
        return () => window.removeEventListener("resize", checkTabScroll);
    }, [checkTabScroll]);

    const scrollTabs = (direction: "left" | "right") => {
        const el = tabsRef.current;
        if (!el) return;
        const scrollAmount = direction === "left" ? -220 : 220;
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

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

    // Surgery Billing Modals
    const [advanceModalSurgery, setAdvanceModalSurgery] = useState<PlannedSurgery | null>(null);
    const [invoiceModalSurgery, setInvoiceModalSurgery] = useState<PlannedSurgery | null>(null);
    const [refundModalSurgery, setRefundModalSurgery] = useState<PlannedSurgery | null>(null);

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
        followup_due: followupDue || undefined,
        sort_by: sortBy,
    };

    const { data: surgeriesResponse, isLoading: loading, isFetching, error } = usePlannedSurgeries(queryParams);
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
        const eyeVal = eye ? eye.toUpperCase() : null;
        switch (eyeVal) {
            case "OD":
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/90 text-blue-900 border border-blue-300 shadow-2xs">👁️ Right Eye (OD)</span>;
            case "OS":
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100/90 text-purple-900 border border-purple-300 shadow-2xs">👁️ Left Eye (OS)</span>;
            case "OU":
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs">👁️ Both Eyes (OU)</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Eye: Unspecified</span>;
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
        setDatePreset("all");
        setFromDate("");
        setToDate("");
        setFollowupDue("");
        setStatusFilter("all");
        setActivePill("all");
        setSortBy("advised_date");
    };

    const hasActiveFilters =
        patientSearch ||
        surgeonId ||
        datePreset !== "all" ||
        fromDate ||
        toDate ||
        followupDue ||
        statusFilter !== "all" ||
        activePill !== "all" ||
        sortBy !== "advised_date";

    const handleSelectQuickPill = (pill: {
        id: string;
        label: string;
        type: string;
        from?: string;
        to?: string;
        date?: string;
    }) => {
        setActivePill(pill.id);
        if (pill.type === "custom") {
            setFollowupDue("");
            setDatePreset("custom");
            if (!fromDate && !toDate) {
                const today = getTodayDateLocal();
                setFromDate(today);
                setToDate(today);
            }
        } else if (pill.type === "followup") {
            setFromDate("");
            setToDate("");
            setDatePreset("all");
            setFollowupDue(pill.date || getTodayDateLocal());
        } else if (pill.type === "range") {
            setFollowupDue("");
            const from = pill.from || "";
            const to = pill.to || "";
            setFromDate(from);
            setToDate(to);
            if (!from && !to) {
                setDatePreset("all");
            } else if (from === getTodayDateLocal() && to === getTodayDateLocal()) {
                setDatePreset("today");
            } else if (from === getYesterdayDateLocal() && to === getYesterdayDateLocal()) {
                setDatePreset("yesterday");
            } else if (from === get7DaysAgoDateLocal() && to === getTodayDateLocal()) {
                setDatePreset("7days");
            } else {
                setDatePreset("custom");
            }
        }
    };

    const getQuickDatePills = () => {
        const today = getTodayDateLocal();
        const yesterday = getYesterdayDateLocal();
        const tomorrow = getTomorrowDateLocal();
        const nextMonday = getNextMondayDateLocal();
        const last7Days = get7DaysAgoDateLocal();
        const next7Days = getNext7DaysDateLocal();

        const todayLabel = formatQuickDateBadge(today);
        const tomorrowLabel = formatQuickDateBadge(tomorrow);
        const nextMondayLabel = formatQuickDateBadge(nextMonday);
        const yesterdayLabel = formatQuickDateBadge(yesterday);

        if (statusFilter === "postponed") {
            return [
                { id: "all", label: "All Postponed", type: "range", from: "", to: "" },
                { id: "due_today", label: `Follow-up Due Today (${todayLabel})`, type: "followup", date: today },
                { id: "due_next_7", label: `Follow-up Next 7 Days`, type: "followup", date: next7Days },
                { id: "custom", label: "Custom Range", type: "custom" },
            ];
        }

        if (statusFilter === "advised") {
            return [
                { id: "all", label: "All Advised", type: "range", from: "", to: "" },
                { id: "today", label: `Advised Today (${todayLabel})`, type: "range", from: today, to: today },
                { id: "yesterday", label: `Advised Yesterday (${yesterdayLabel})`, type: "range", from: yesterday, to: yesterday },
                { id: "last_7", label: "Last 7 Days", type: "range", from: last7Days, to: today },
                { id: "custom", label: "Custom Range", type: "custom" },
            ];
        }

        if (statusFilter === "scheduled") {
            return [
                { id: "all", label: "All Scheduled", type: "range", from: "", to: "" },
                { id: "today", label: `Today (${todayLabel})`, type: "range", from: today, to: today },
                { id: "tomorrow", label: `Tomorrow (${tomorrowLabel})`, type: "range", from: tomorrow, to: tomorrow },
                { id: "next_monday", label: `Next Mon (${nextMondayLabel})`, type: "range", from: nextMonday, to: nextMonday },
                { id: "next_7", label: "Next 7 Days", type: "range", from: today, to: next7Days },
                { id: "custom", label: "Custom Range", type: "custom" },
            ];
        }

        return [
            { id: "all", label: "All Time", type: "range", from: "", to: "" },
            { id: "today", label: `Today (${todayLabel})`, type: "range", from: today, to: today },
            { id: "tomorrow", label: `Tomorrow (${tomorrowLabel})`, type: "range", from: tomorrow, to: tomorrow },
            { id: "next_monday", label: `Next Mon (${nextMondayLabel})`, type: "range", from: nextMonday, to: nextMonday },
            { id: "yesterday", label: `Yesterday (${yesterdayLabel})`, type: "range", from: yesterday, to: yesterday },
            { id: "last_7", label: "Last 7 Days", type: "range", from: last7Days, to: today },
            { id: "next_7", label: "Next 7 Days", type: "range", from: today, to: next7Days },
            { id: "custom", label: "Custom Range", type: "custom" },
        ];
    };

    const STATUS_TABS: Array<{
        id: PlannedSurgeryStatus | "all";
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        activeBg: string;
    }> = [
        { id: "all", label: "All Surgeries", icon: CalendarDays, activeBg: "bg-slate-900 text-white shadow-sm" },
        { id: "advised", label: "Advised", icon: AlertCircle, activeBg: "bg-amber-500 text-white shadow-sm shadow-amber-500/20" },
        { id: "scheduled", label: "Scheduled", icon: CalendarClock, activeBg: "bg-sky-600 text-white shadow-sm shadow-sky-600/20" },
        { id: "postponed", label: "Postponed", icon: Clock, activeBg: "bg-orange-500 text-white shadow-sm shadow-orange-500/20" },
        { id: "completed", label: "Completed", icon: CheckCircle2, activeBg: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" },
        { id: "denied", label: "Denied", icon: Ban, activeBg: "bg-red-600 text-white shadow-sm shadow-red-600/20" },
        { id: "cancelled", label: "Cancelled", icon: XCircle, activeBg: "bg-rose-600 text-white shadow-sm shadow-rose-600/20" },
    ];

    return (
        <div className="space-y-4 min-w-0 max-w-full">
            {/* Header Bar: Status Tabs, View Mode, Export PDF & Reset */}
            <div className="flex flex-col gap-3 min-w-0">
                {/* Horizontal Status Tabs Bar (Scrollable with hidden scrollbars and arrow buttons) */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 min-w-0">
                    <div className="relative flex items-center flex-1 min-w-0 py-1">
                        {canScrollLeft && (
                            <button
                                onClick={() => scrollTabs("left")}
                                className="absolute left-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-md text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                title="Scroll Left"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}

                        <div
                            ref={tabsRef}
                            onScroll={checkTabScroll}
                            className="flex items-center gap-1 overflow-x-auto scrollbar-none [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1"
                        >
                            {STATUS_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = statusFilter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setStatusFilter(tab.id);
                                            setActivePill("all");
                                            setFollowupDue("");
                                            setFromDate("");
                                            setToDate("");
                                            setDatePreset("all");
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
                                            isActive
                                                ? "border-sky-500 text-sky-600 font-bold"
                                                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {canScrollRight && (
                            <button
                                onClick={() => scrollTabs("right")}
                                className="absolute right-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-md text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                title="Scroll Right"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* View Mode Toggle, Export PDF & Reset */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                                title="Clear all active filters"
                            >
                                <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                                <span>Reset</span>
                            </button>
                        )}

                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                            <button
                                onClick={() => {
                                    setViewMode("list");
                                    localStorage.setItem("planned_surgeries_view", "list");
                                }}
                                className={`flex items-center justify-center rounded-lg p-1.5 transition ${
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
                                className={`flex items-center justify-center rounded-lg p-1.5 transition ${
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
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Export planned surgeries to PDF"
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Export PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Quick Date Filter Pills Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50/80 border border-slate-200/80 p-2 min-w-0 max-w-full">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0 px-2">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Quick Filter:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {getQuickDatePills().map((pill) => {
                                const isActive = activePill === pill.id;
                                return (
                                    <button
                                        key={pill.id}
                                        onClick={() => handleSelectQuickPill(pill)}
                                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-slate-900 text-white shadow-xs"
                                                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                                        }`}
                                    >
                                        <span>{pill.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Date Pickers (Shown when Custom Range pill is active) */}
                    {(activePill === "custom" || datePreset === "custom") && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-2xs">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <span>From:</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => {
                                        setFromDate(e.target.value);
                                        setDatePreset("custom");
                                        setActivePill("custom");
                                        setFollowupDue("");
                                    }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-sky-400 font-medium text-slate-800"
                                />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <span>To:</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => {
                                        setToDate(e.target.value);
                                        setDatePreset("custom");
                                        setActivePill("custom");
                                        setFollowupDue("");
                                    }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-sky-400 font-medium text-slate-800"
                                />
                            </label>
                        </div>
                    )}
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-w-0 max-w-full">
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
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-w-0 max-w-full">
                            {surgeries.map((surgery) => (
                                <div
                                    key={surgery.id}
                                    onClick={() => setDetailModalSurgery(surgery)}
                                    className="relative flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md h-full cursor-pointer group min-w-0"
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
                                            {surgery.surgery_invoice_id && (
                                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                                                    <FileText className="h-3 w-3" />
                                                    Invoice Generated
                                                </div>
                                            )}
                                            {surgery.advance_payment_amount && Number(surgery.advance_payment_amount) > 0 ? (
                                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded block">
                                                    <CreditCard className="h-3 w-3" />
                                                    Amount Collected: ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")}
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
                                            {/* 1. Edit action button */}
                                            {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                                                <ExpandableActionButton
                                                    onClick={() => handleEdit(surgery)}
                                                    icon={Pencil}
                                                    title="Edit Surgery Details"
                                                    label="Edit"
                                                    variant="emerald"
                                                />
                                            )}

                                            {/* 2. Collect Payment / Billing quick action */}
                                            <ExpandableActionButton
                                                onClick={() => setInvoiceModalSurgery(surgery)}
                                                icon={CreditCard}
                                                title="Collect Payment / Manage Billing"
                                                label="Collect Payment"
                                                variant="emerald"
                                            />

                                            {/* 3. Reschedule action button */}
                                            {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                                                <ExpandableActionButton
                                                    onClick={() => handleReschedule(surgery)}
                                                    icon={CalendarClock}
                                                    title={surgery.status === "advised" ? "Schedule Date" : "Reschedule Date"}
                                                    label={surgery.status === "advised" ? "Schedule" : "Reschedule"}
                                                    variant="amber"
                                                />
                                            )}

                                            {/* 4. History icon button */}
                                            <ExpandableActionButton
                                                onClick={() => handleViewHistory(surgery)}
                                                icon={History}
                                                title="View Surgery Timeline"
                                                label="History"
                                                variant="sky"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View Mode (Table) */
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 table-fixed">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                        <tr>
                                            <th scope="col" className="w-[18%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Patient
                                            </th>
                                            <th scope="col" className="w-[22%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Surgery & Details
                                            </th>
                                            <th scope="col" className="w-[8%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Eye
                                            </th>
                                            <th scope="col" className="w-[14%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Surgeon
                                            </th>
                                            <th scope="col" className="w-[14%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Planned / Advised Date
                                            </th>
                                            <th scope="col" className="w-[10%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Status
                                            </th>
                                            <th scope="col" className="w-[8%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Notes
                                            </th>
                                            <th scope="col" className="w-[16%] px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
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
                                                                Amount Collected: ₹{Number(surgery.advance_payment_amount).toLocaleString("en-IN")}
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
                                                <td className="w-[16%] whitespace-nowrap px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {(surgery.status === "advised" || surgery.status === "scheduled" || surgery.status === "postponed") && (
                                                            <ExpandableActionButton
                                                                onClick={() => handleEdit(surgery)}
                                                                icon={Pencil}
                                                                title="Edit Surgery Details"
                                                                label="Edit"
                                                                variant="emerald"
                                                            />
                                                        )}
                                                        <ExpandableActionButton
                                                            onClick={() => setInvoiceModalSurgery(surgery)}
                                                            icon={CreditCard}
                                                            title="Collect Payment / Manage Billing"
                                                            label="Collect Payment"
                                                            variant="emerald"
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
                                                        <ExpandableActionButton
                                                            onClick={() => handleViewHistory(surgery)}
                                                            icon={History}
                                                            title="View Timeline"
                                                            label="History"
                                                            variant="sky"
                                                        />
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
                onOpenAdvanceModal={(s) => setAdvanceModalSurgery(s)}
                onOpenInvoiceModal={(s) => setInvoiceModalSurgery(s)}
                onOpenRefundModal={(s) => setRefundModalSurgery(s)}
            />

            {/* Advance Payment Modal */}
            <AdvancePaymentModal
                isOpen={!!advanceModalSurgery}
                onClose={() => setAdvanceModalSurgery(null)}
                surgery={advanceModalSurgery}
            />

            {/* Surgery Invoice Modal */}
            <SurgeryInvoiceModal
                isOpen={!!invoiceModalSurgery}
                onClose={() => setInvoiceModalSurgery(null)}
                surgery={invoiceModalSurgery}
                onOpenAdvanceModal={() => {
                    const currentSurgery = invoiceModalSurgery;
                    setInvoiceModalSurgery(null);
                    setAdvanceModalSurgery(currentSurgery);
                }}
            />

            {/* Refund Modal */}
            <RefundModal
                isOpen={!!refundModalSurgery}
                onClose={() => setRefundModalSurgery(null)}
                surgery={refundModalSurgery}
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
                surgery={rescheduleModalSurgery}
                isLoading={rescheduleMutation.isPending}
            />
        </div>
    );
}
