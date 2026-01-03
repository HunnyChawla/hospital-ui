"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import {
  addOphthalmicSurgery,
  deleteOphthalmicSurgery,
} from "@/redux/optometryDataSlice";
import {
  Plus,
  Trash2,
  Eye,
  Calendar,
  User,
  Building2,
  Search,
  X,
  Check,
  AlertCircle,
  Clock,
  Scissors,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  FileText,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { OphthalmicSurgeryRecord } from "@/types";
import { EyeSelector } from "../shared";
import { commonEyeSurgeries } from "../mock/mockTemplates";

interface OphthalHistoryTabProps {
  patientId: string;
  ophthalmicHistory: OphthalmicSurgeryRecord[];
  loading: boolean;
  onRefresh: () => void;
}

type EyeType = "OD" | "OS" | "OU";

interface SurgeryFormData {
  surgery_name: string;
  eye: EyeType;
  surgery_year: string;
  surgery_month: string;
  surgeon_name: string;
  hospital_name: string;
  complications: string;
  notes: string;
}

interface FilterOptions {
  eye: "all" | "OD" | "OS" | "OU";
  surgeryType: string;
  dateRange: "all" | "last_year" | "last_5_years" | "last_10_years";
  hasComplications: boolean;
}

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc";
type ViewMode = "timeline" | "cards" | "table";

const initialFormData: SurgeryFormData = {
  surgery_name: "",
  eye: "OD",
  surgery_year: "",
  surgery_month: "",
  surgeon_name: "",
  hospital_name: "",
  complications: "",
  notes: "",
};

// Generate year options (current year back to 1950)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) =>
  String(currentYear - i)
);

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function OphthalHistoryTab({
  patientId,
  ophthalmicHistory,
  loading,
  onRefresh,
}: OphthalHistoryTabProps) {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SurgeryFormData>(initialFormData);
  const [surgerySearch, setSurgerySearch] = useState("");
  const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    eye: "all",
    surgeryType: "",
    dateRange: "all",
    hasComplications: false,
  });

  // Filter surgeries based on search
  const filteredSurgeries = useMemo(() => {
    if (!surgerySearch.trim()) return commonEyeSurgeries.slice(0, 8);
    const search = surgerySearch.toLowerCase();
    return commonEyeSurgeries.filter((surgery) =>
      surgery.toLowerCase().includes(search)
    );
  }, [surgerySearch]);

  // Process and filter ophthalmic history data
  const processedHistory = useMemo(() => {
    let filtered = [...ophthalmicHistory];

    // Apply search filter
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (surgery) =>
          surgery.surgery_name.toLowerCase().includes(search) ||
          surgery.surgeon_name?.toLowerCase().includes(search) ||
          surgery.hospital_name?.toLowerCase().includes(search) ||
          surgery.notes?.toLowerCase().includes(search)
      );
    }

    // Apply filters
    if (filters.eye !== "all") {
      filtered = filtered.filter((surgery) => surgery.eye === filters.eye);
    }

    if (filters.surgeryType) {
      filtered = filtered.filter((surgery) =>
        surgery.surgery_name.toLowerCase().includes(filters.surgeryType.toLowerCase())
      );
    }

    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case "last_year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case "last_5_years":
          cutoffDate.setFullYear(now.getFullYear() - 5);
          break;
        case "last_10_years":
          cutoffDate.setFullYear(now.getFullYear() - 10);
          break;
      }
      
      filtered = filtered.filter((surgery) => {
        if (!surgery.surgery_date) return false;
        return new Date(surgery.surgery_date) >= cutoffDate;
      });
    }

    if (filters.hasComplications) {
      filtered = filtered.filter((surgery) => surgery.complications && surgery.complications.trim() !== "");
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.surgery_date || 0).getTime() - new Date(a.surgery_date || 0).getTime();
        case "date_asc":
          return new Date(a.surgery_date || 0).getTime() - new Date(b.surgery_date || 0).getTime();
        case "name_asc":
          return a.surgery_name.localeCompare(b.surgery_name);
        case "name_desc":
          return b.surgery_name.localeCompare(a.surgery_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [ophthalmicHistory, searchQuery, filters, sortBy]);

  // Statistics
  const statistics = useMemo(() => {
    const total = ophthalmicHistory.length;
    const withComplications = ophthalmicHistory.filter(s => s.complications && s.complications.trim() !== "").length;
    const eyeDistribution = {
      OD: ophthalmicHistory.filter(s => s.eye === "OD").length,
      OS: ophthalmicHistory.filter(s => s.eye === "OS").length,
      OU: ophthalmicHistory.filter(s => s.eye === "OU").length,
    };
    const recentSurgeries = ophthalmicHistory.filter(s => {
      if (!s.surgery_date) return false;
      const surgeryDate = new Date(s.surgery_date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return surgeryDate >= oneYearAgo;
    }).length;

    return {
      total,
      withComplications,
      eyeDistribution,
      recentSurgeries,
      complicationRate: total > 0 ? (withComplications / total) * 100 : 0,
    };
  }, [ophthalmicHistory]);

  const handleSurgerySelect = (surgery: string) => {
    setFormData((prev) => ({ ...prev, surgery_name: surgery }));
    setSurgerySearch(surgery);
    setShowSurgeryDropdown(false);
  };

  const handleSubmit = async () => {
    const surgeryName = formData.surgery_name.trim() || surgerySearch.trim();

    if (!surgeryName) {
      toast.error("Please enter or select a surgery/procedure");
      return;
    }

    // Build surgery date from year and optional month
    let surgeryDate: string | undefined;
    if (formData.surgery_year) {
      surgeryDate = formData.surgery_month
        ? `${formData.surgery_year}-${formData.surgery_month}-01`
        : `${formData.surgery_year}-01-01`;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        addOphthalmicSurgery({
          data: {
            patient_id: patientId,
            surgery_name: surgeryName,
            eye: formData.eye,
            surgery_date: surgeryDate || new Date().toISOString().split('T')[0],
            surgeon_name: formData.surgeon_name || null,
            hospital_name: formData.hospital_name || null,
            complications: formData.complications || null,
            notes: formData.notes || null,
          },
        })
      ).unwrap();

      toast.success("Surgery record added successfully");
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error("Failed to add surgery record");
      console.error("Add surgery error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Surgery Type", "Eye", "Date", "Surgeon", "Hospital", "Complications", "Notes"],
      ...processedHistory.map((surgery) => [
        surgery.surgery_name,
        surgery.eye,
        formatDate(surgery.surgery_date),
        surgery.surgeon_name || "",
        surgery.hospital_name || "",
        surgery.complications || "",
        surgery.notes || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eye_surgery_history_${patientId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Surgery history exported successfully");
  };

  const handleDelete = async (surgeryId: string) => {
    if (!confirm("Are you sure you want to delete this surgery record?"))
      return;

    try {
      await dispatch(deleteOphthalmicSurgery({ id: surgeryId })).unwrap();
      toast.success("Surgery record deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete surgery record");
      console.error("Delete surgery error:", error);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSurgerySearch("");
    setShowSurgeryDropdown(false);
    setIsAdding(false);
  };

  const getEyeLabel = (eye: string) => {
    switch (eye) {
      case "OD":
        return "Right Eye";
      case "OS":
        return "Left Eye";
      case "OU":
        return "Both Eyes";
      default:
        return eye;
    }
  };

  const getEyeColor = (eye: string) => {
    switch (eye) {
      case "OD":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "OS":
        return "bg-green-100 text-green-700 border-green-200";
      case "OU":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Date unknown";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    // If day is 1 and month is January, likely only year was recorded
    if (date.getDate() === 1 && month === 0) {
      return String(year);
    }
    // Otherwise show month/year
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const getYearsAgo = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (years === 0) return "This year";
    if (years === 1) return "1 year ago";
    return `${years} years ago`;
  };

  const surgeryCount = ophthalmicHistory.length;

  return (
    <div className="space-y-4">
      {/* Enhanced Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Eye Surgery History
          </h3>
          <p className="text-sm text-slate-600">
            Record and manage previous eye surgeries and procedures
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode("timeline")}
              className={clsx(
                "rounded px-3 py-1.5 text-xs font-medium transition",
                viewMode === "timeline"
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={clsx(
                "rounded px-3 py-1.5 text-xs font-medium transition",
                viewMode === "cards"
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={clsx(
                "rounded px-3 py-1.5 text-xs font-medium transition",
                viewMode === "table"
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Table
            </button>
          </div>

          {/* Export Button */}
          {processedHistory.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Surgery
            </button>
          )}
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2">
              <Scissors className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Surgeries</p>
              <p className="text-lg font-semibold text-slate-900">{statistics.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">With Complications</p>
              <p className="text-lg font-semibold text-slate-900">
                {statistics.withComplications}
                {statistics.total > 0 && (
                  <span className="text-xs text-amber-600 ml-1">
                    ({statistics.complicationRate.toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Recent (1 year)</p>
              <p className="text-lg font-semibold text-slate-900">{statistics.recentSurgeries}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Eye Distribution</p>
              <div className="flex gap-2 mt-1">
                {statistics.eyeDistribution.OD > 0 && (
                  <span className="text-xs font-medium text-blue-700">OD: {statistics.eyeDistribution.OD}</span>
                )}
                {statistics.eyeDistribution.OS > 0 && (
                  <span className="text-xs font-medium text-green-700">OS: {statistics.eyeDistribution.OS}</span>
                )}
                {statistics.eyeDistribution.OU > 0 && (
                  <span className="text-xs font-medium text-purple-700">OU: {statistics.eyeDistribution.OU}</span>
                )}
                {statistics.total === 0 && (
                  <span className="text-xs text-slate-400">No data</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search surgeries, surgeons, hospitals..."
            className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
              showFilters
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).some((v) => v !== "" && v !== "all" && v !== false) && (
              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-xs text-white">
                {Object.values(filters).filter((v) => v !== "" && v !== "all" && v !== false).length}
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
            {sortBy.startsWith("date") ? (
              <Calendar className="h-4 w-4 text-slate-400" />
            ) : (
              <FileText className="h-4 w-4 text-slate-400" />
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border-0 bg-transparent focus:outline-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Eye Filter */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Eye
              </label>
              <select
                value={filters.eye}
                onChange={(e) => setFilters(prev => ({ ...prev, eye: e.target.value as any }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All Eyes</option>
                <option value="OD">Right Eye (OD)</option>
                <option value="OS">Left Eye (OS)</option>
                <option value="OU">Both Eyes (OU)</option>
              </select>
            </div>

            {/* Surgery Type Filter */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Surgery Type
              </label>
              <input
                type="text"
                value={filters.surgeryType}
                onChange={(e) => setFilters(prev => ({ ...prev, surgeryType: e.target.value }))}
                placeholder="Filter by surgery type..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All Time</option>
                <option value="last_year">Last Year</option>
                <option value="last_5_years">Last 5 Years</option>
                <option value="last_10_years">Last 10 Years</option>
              </select>
            </div>

            {/* Complications Filter */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Complications
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasComplications}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasComplications: e.target.checked }))}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">Show only with complications</span>
              </label>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({
                eye: "all",
                surgeryType: "",
                dateRange: "all",
                hasComplications: false,
              })}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Surgery Count Summary */}
      <div
        className={clsx(
          "flex items-center justify-between rounded-lg px-4 py-3",
          surgeryCount === 0
            ? "bg-slate-100 border border-slate-200"
            : "bg-sky-50 border border-sky-200"
        )}
      >
        <div className="flex items-center gap-3">
          <Scissors
            className={clsx(
              "h-5 w-5",
              processedHistory.length === 0 ? "text-slate-500" : "text-sky-600"
            )}
          />
          <span
            className={clsx(
              "font-medium",
              processedHistory.length === 0 ? "text-slate-600" : "text-sky-700"
            )}
          >
            {processedHistory.length === 0
              ? "No matching surgeries found"
              : `${processedHistory.length} of ${statistics.total} Surger${statistics.total !== 1 ? "ies" : "y"}`}
          </span>
          {processedHistory.length !== statistics.total && (
            <span className="text-xs text-slate-500">
              (filtered from {statistics.total} total)
            </span>
          )}
        </div>
        {processedHistory.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {processedHistory.filter((s) => s.eye === "OD").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                {processedHistory.filter((s) => s.eye === "OD").length} OD
              </span>
            )}
            {processedHistory.filter((s) => s.eye === "OS").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                {processedHistory.filter((s) => s.eye === "OS").length} OS
              </span>
            )}
            {processedHistory.filter((s) => s.eye === "OU").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                {processedHistory.filter((s) => s.eye === "OU").length} OU
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add Surgery Form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200 relative z-30">
          {/* Form Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 shadow-lg">
                  <Scissors className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    Add New Surgery Record
                  </h4>
                  <p className="text-sm text-slate-600">
                    Record previous eye surgery or procedure details
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/50 hover:text-slate-600 transition-all duration-200"
                title="Cancel and close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  surgerySearch.trim() ? "bg-emerald-500" : "bg-slate-300"
                )} />
                <div className={clsx(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  formData.eye !== "OD" ? "bg-emerald-500" : "bg-slate-300"
                )} />
                <div className={clsx(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  formData.surgery_year ? "bg-emerald-500" : "bg-slate-300"
                )} />
              </div>
              <span className="text-xs text-slate-500">
                {surgerySearch.trim() && formData.eye !== "OD" && formData.surgery_year
                  ? "Ready to submit"
                  : "Complete required fields"}
              </span>
            </div>
            {/* Surgery Name with Autocomplete */}
            <div className="relative">
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="rounded-lg bg-sky-100 p-1.5">
                  <Scissors className="h-4 w-4 text-sky-600" />
                </div>
                Surgery/Procedure Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={surgerySearch}
                  onChange={(e) => {
                    setSurgerySearch(e.target.value);
                    setShowSurgeryDropdown(true);
                  }}
                  onFocus={() => setShowSurgeryDropdown(true)}
                  className={clsx(
                    "w-full rounded-xl border-2 pl-11 pr-12 py-3 text-sm font-medium transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                    surgerySearch.trim()
                      ? "border-emerald-300 bg-emerald-50/30 focus:border-emerald-400"
                      : "border-slate-300 bg-white focus:border-sky-500"
                  )}
                  placeholder="Search or type surgery name..."
                />
                {surgerySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSurgerySearch("");
                      setFormData((prev) => ({ ...prev, surgery_name: "" }));
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showSurgeryDropdown && filteredSurgeries.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto">
                  <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-4 py-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Common Surgeries
                    </p>
                  </div>
                  {filteredSurgeries.map((surgery) => (
                    <button
                      key={surgery}
                      type="button"
                      onClick={() => handleSurgerySelect(surgery)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-sky-50 transition-colors duration-150 group"
                    >
                      <div className="rounded-lg bg-sky-100 p-1.5 group-hover:bg-sky-200 transition-colors">
                        <Eye className="h-4 w-4 text-sky-600" />
                      </div>
                      <span className="font-medium text-slate-700 group-hover:text-sky-700">
                        {surgery}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Select Common Surgeries */}
            <div>
              <label className="mb-3 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {["Cataract surgery", "LASIK", "ICL implantation", "Vitrectomy", "Glaucoma surgery"].map(
                  (surgery) => (
                    <button
                      key={surgery}
                      type="button"
                      onClick={() => handleSurgerySelect(surgery)}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200",
                        "hover:scale-105 active:scale-95",
                        surgerySearch === surgery
                          ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-600 shadow-lg"
                          : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 hover:shadow-md"
                      )}
                    >
                      {surgery}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Eye Selection and Date */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Eye Selection */}
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-purple-100 p-1.5">
                      <Eye className="h-4 w-4 text-purple-600" />
                    </div>
                    Eye
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <EyeSelector
                    value={formData.eye as any}
                    onChange={(eye) =>
                      setFormData((prev) => ({ ...prev, eye: eye as any }))
                    }
                    label=""
                  />
                </div>

                {/* Approximate Year */}
                <div className="relative">
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-amber-100 p-1.5">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    Year
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.surgery_year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        surgery_year: e.target.value,
                      }))
                    }
                    className={clsx(
                      "w-full rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                      formData.surgery_year
                        ? "border-emerald-300 bg-emerald-50/30 focus:border-emerald-400"
                        : "border-slate-300 bg-white focus:border-sky-500"
                    )}
                  >
                    <option value="">Select year...</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Month */}
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-blue-100 p-1.5">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    Month
                    <span className="text-xs text-slate-400 ml-1">(optional)</span>
                  </label>
                  <select
                    value={formData.surgery_month}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        surgery_month: e.target.value,
                      }))
                    }
                    disabled={!formData.surgery_year}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <option value="">Not sure</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Surgeon and Hospital */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-green-100 p-1.5">
                      <User className="h-4 w-4 text-green-600" />
                    </div>
                    Surgeon Name
                    <span className="text-xs text-slate-400 ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.surgeon_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        surgeon_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-indigo-100 p-1.5">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    Hospital/Clinic
                    <span className="text-xs text-slate-400 ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.hospital_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hospital_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                    placeholder="City Eye Hospital"
                  />
                </div>
              </div>
            </div>

            {/* Complications and Notes */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-red-100 p-1.5">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    Complications
                    <span className="text-xs text-slate-400 ml-1">(if any)</span>
                  </label>
                  <textarea
                    value={formData.complications}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        complications: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-200 resize-none"
                    placeholder="Describe any complications during or after surgery..."
                  />
                </div>
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="rounded-lg bg-slate-100 p-1.5">
                      <FileText className="h-4 w-4 text-slate-600" />
                    </div>
                    Additional Notes
                    <span className="text-xs text-slate-400 ml-1">(optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-200 resize-none"
                    placeholder="Any additional details or observations..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200",
                  surgerySearch.trim() && formData.eye !== "OD" && formData.surgery_year
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}>
                  {surgerySearch.trim() && formData.eye !== "OD" && formData.surgery_year ? (
                    <>
                      <Check className="h-4 w-4" />
                      Ready to submit
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Complete required fields
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border-2 border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !surgerySearch.trim() || formData.eye === "OD" || !formData.surgery_year}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-sky-700 hover:to-blue-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Surgery Record
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surgery Records Display */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-slate-600">Loading surgery history...</p>
        </div>
      ) : ophthalmicHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Eye className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-slate-600 font-medium">
            No eye surgery history recorded
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Click &quot;Add Surgery&quot; if patient has had previous eye
            procedures
          </p>
        </div>
      ) : processedHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Search className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-slate-600 font-medium">
            No surgeries match your filters
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <>
          {/* Timeline View */}
          {viewMode === "timeline" && (
            <div className="space-y-3">
              {processedHistory.map((surgery, index) => (
                <div
                  key={surgery.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
                >
                  {/* Timeline connector */}
                  {index < processedHistory.length - 1 && (
                    <div className="absolute left-7 top-full h-3 w-0.5 bg-slate-200" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Eye indicator */}
                    <div
                      className={clsx(
                        "flex-shrink-0 rounded-full p-2.5 border",
                        getEyeColor(surgery.eye)
                      )}
                    >
                      <Eye className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h5 className="font-semibold text-slate-900 text-lg">
                            {surgery.surgery_name}
                          </h5>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                getEyeColor(surgery.eye)
                              )}
                            >
                              {surgery.eye} - {getEyeLabel(surgery.eye)}
                            </span>
                            {surgery.surgery_date && (
                              <>
                                <span className="flex items-center gap-1 text-sm text-slate-600">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(surgery.surgery_date)}
                                </span>
                                {getYearsAgo(surgery.surgery_date) && (
                                  <span className="text-xs text-slate-400">
                                    ({getYearsAgo(surgery.surgery_date)})
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(surgery.id)}
                          className="rounded-lg p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete surgery record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Details */}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                        {surgery.surgeon_name && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-slate-400" />
                            {surgery.surgeon_name}
                          </span>
                        )}
                        {surgery.hospital_name && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {surgery.hospital_name}
                          </span>
                        )}
                      </div>

                      {/* Complications Alert */}
                      {surgery.complications && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-red-700 uppercase">
                              Complications
                            </p>
                            <p className="text-sm text-red-600">
                              {surgery.complications}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {surgery.notes && (
                        <p className="mt-2 text-sm text-slate-500 italic">
                          {surgery.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processedHistory.map((surgery) => (
                <div
                  key={surgery.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={clsx(
                        "rounded-full p-2 border",
                        getEyeColor(surgery.eye)
                      )}
                    >
                      <Eye className="h-4 w-4" />
                    </div>
                    <button
                      onClick={() => handleDelete(surgery.id)}
                      className="rounded-lg p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete surgery record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h5 className="font-semibold text-slate-900 mb-2">
                    {surgery.surgery_name}
                  </h5>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={clsx("rounded-full border px-2 py-0.5 text-xs font-semibold", getEyeColor(surgery.eye))}>
                        {surgery.eye}
                      </span>
                      {surgery.surgery_date && (
                        <span className="text-slate-600">
                          {formatDate(surgery.surgery_date)}
                        </span>
                      )}
                    </div>

                    {surgery.surgeon_name && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{surgery.surgeon_name}</span>
                      </div>
                    )}

                    {surgery.hospital_name && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{surgery.hospital_name}</span>
                      </div>
                    )}
                  </div>

                  {surgery.complications && (
                    <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-2 py-1.5">
                      <p className="text-xs font-medium text-red-700">Complications</p>
                      <p className="text-xs text-red-600 truncate">{surgery.complications}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Surgery</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Eye</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Surgeon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Hospital</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Complications</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedHistory.map((surgery) => (
                      <tr key={surgery.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{surgery.surgery_name}</p>
                            {surgery.notes && (
                              <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">{surgery.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("rounded-full border px-2 py-1 text-xs font-semibold", getEyeColor(surgery.eye))}>
                            {surgery.eye}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {surgery.surgery_date ? formatDate(surgery.surgery_date) : "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {surgery.surgeon_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {surgery.hospital_name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {surgery.complications ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              <AlertCircle className="h-3 w-3" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(surgery.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete surgery record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
