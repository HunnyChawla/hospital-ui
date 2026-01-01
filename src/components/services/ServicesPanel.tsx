"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchServices, deleteService } from "@/redux/servicesSlice";
import { ServiceFormModal } from "./ServiceFormModal";
import { Service } from "@/services/servicesApi";
import { currency } from "@/utils/format";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { EnhancedStatCard } from "@/components/common/EnhancedStatCard";
import {
  Package,
  RefreshCcw,
  Search,
  Filter,
  Trash2,
  Edit2,
  Plus,
  DollarSign,
  Layers,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Grid3x3,
  List,
  ChevronDown,
  Tag,
} from "lucide-react";

const DEFAULT_QUERY = { page: 1, page_size: 20 };

type ViewMode = "grid" | "table";

export function ServicesPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, total, lastQuery, deletingId } = useAppSelector((s) => s.services);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchServices(DEFAULT_QUERY));
  }, [dispatch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatch(
        fetchServices({
          page: 1,
          page_size: DEFAULT_QUERY.page_size,
          search: search.trim() || undefined,
          category: category.trim() || undefined,
          is_active: activeFilter === "all" ? undefined : activeFilter === "active",
        })
      );
    }, 320);

    return () => clearTimeout(handler);
  }, [search, category, activeFilter, dispatch]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeServices = items.filter((s) => s.is_active);
    const inactiveServices = items.filter((s) => !s.is_active);
    const totalRevenue = items.reduce((sum, s) => sum + s.price, 0);
    const uniqueCategories = new Set(items.map((s) => s.category));

    return {
      total: total,
      active: activeServices.length,
      inactive: inactiveServices.length,
      categories: uniqueCategories.size,
      avgPrice: items.length > 0 ? totalRevenue / items.length : 0,
    };
  }, [items, total]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((s) => s.category))).sort(),
    [items]
  );

  const handleAdd = () => {
    setEditingService(null);
    setShowAddModal(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteService({ id })).unwrap();
      toast.success("Service deleted");
      dispatch(fetchServices(lastQuery || DEFAULT_QUERY));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const refresh = () => {
    dispatch(fetchServices(lastQuery || DEFAULT_QUERY));
  };

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) =>
      activeFilter === "active" ? item.is_active : !item.is_active
    );
  }, [items, activeFilter]);

  const getCategoryColor = (category: string | null | undefined) => {
    const colors = [
      "bg-sky-50 text-sky-700 border-sky-200",
      "bg-emerald-50 text-emerald-700 border-emerald-200",
      "bg-purple-50 text-purple-700 border-purple-200",
      "bg-amber-50 text-amber-700 border-amber-200",
      "bg-rose-50 text-rose-700 border-rose-200",
      "bg-teal-50 text-teal-700 border-teal-200",
    ];

    if (!category) {
      return "bg-slate-50 text-slate-700 border-slate-200";
    }

    const hash = category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatCard
          icon={Package}
          label="Total Services"
          value={stats.total.toString()}
          iconBgColor="from-sky-500 to-teal-500"
        />
        <EnhancedStatCard
          icon={ToggleRight}
          label="Active Services"
          value={stats.active.toString()}
          iconBgColor="from-emerald-500 to-teal-500"
        />
        <EnhancedStatCard
          icon={Layers}
          label="Categories"
          value={stats.categories.toString()}
          iconBgColor="from-purple-500 to-pink-500"
        />
        <EnhancedStatCard
          icon={DollarSign}
          label="Avg Price"
          value={currency(stats.avgPrice)}
          iconBgColor="from-orange-500 to-amber-500"
        />
      </div>

      {/* Main Panel */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">Service Catalog</p>
            <p className="text-xs text-slate-500">
              Manage hospital services and pricing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-sky-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white text-sky-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={refresh}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, description, or category..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Active Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeFilter === "all"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("active")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeFilter === "active"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveFilter("inactive")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeFilter === "inactive"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Category Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                category
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Categories
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Category Filter Dropdown */}
          {showFilters && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {category && (
                  <button
                    onClick={() => setCategory("")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Services List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
              <p className="text-sm text-slate-500">Loading services...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">No services found</p>
            <p className="mt-1 text-xs text-slate-500">
              {search || category
                ? "Try adjusting your filters"
                : "Add a new service to get started"}
            </p>
            {(search || category) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setActiveFilter("all");
                }}
                className="mt-4 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((service) => (
              <div
                key={service.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 line-clamp-1">{service.name}</h4>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {service.description || "No description"}
                    </p>
                  </div>
                  <div className="ml-2">
                    {service.is_active ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" title="Active">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400" title="Inactive">
                        <EyeOff className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${getCategoryColor(service.category)}`}>
                    <Tag className="h-3 w-3" />
                    {service.category}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-3 rounded-lg bg-gradient-to-br from-sky-50 to-teal-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Price</p>
                  <p className="text-xl font-bold text-sky-700">{currency(service.price)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(service.id, service.name)}
                    disabled={deletingId === service.id}
                    className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-700">Price</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{service.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${getCategoryColor(service.category)}`}>
                          <Tag className="h-3 w-3" />
                          {service.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600 line-clamp-1">
                          {service.description || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-slate-900">{currency(service.price)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {service.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            <ToggleRight className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            <ToggleLeft className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(service.id, service.name)}
                            disabled={deletingId === service.id}
                            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
          <p>
            Showing <span className="font-semibold text-slate-900">{filteredItems.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> services
          </p>
          <p>Filters auto-apply</p>
        </div>
      </div>

      {/* Modals */}
      <ServiceFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingService(null);
        }}
        defaultValues={undefined}
      />

      <ServiceFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingService(null);
        }}
        defaultValues={editingService ?? undefined}
      />
    </div>
  );
}
