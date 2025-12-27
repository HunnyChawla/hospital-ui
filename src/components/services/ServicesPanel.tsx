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
import {
  Package,
  RefreshCcw,
  Search,
  Filter,
  Trash2,
  Edit2,
  Plus,
} from "lucide-react";

const DEFAULT_QUERY = { page: 1, page_size: 20 };

export function ServicesPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, total, lastQuery, deletingId } = useAppSelector((s) => s.services);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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
        })
      );
    }, 320);

    return () => clearTimeout(handler);
  }, [search, category, dispatch]);

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

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Service Master</p>
            <p className="text-xs text-slate-500">
              Create and manage available services.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, description, or category"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-5 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            <div className="col-span-2">Name</div>
            <div>Category</div>
            <div className="text-right">Price</div>
            <div className="text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonRow rows={4} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No services found. Add a new service to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((service) => (
                <div
                  key={service.id}
                  className="grid grid-cols-5 items-center px-4 py-3 text-sm text-slate-800"
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{service.description}</p>
                    )}
                  </div>
                  <div className="text-slate-600">{service.category}</div>
                  <div className="font-semibold text-slate-900 text-right">{currency(service.price)}</div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-sky-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-sky-600"
                      style={{ width: "2rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.paddingLeft = "0.75rem";
                        e.currentTarget.style.paddingRight = "0.75rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Edit service"
                    >
                      <Edit2 className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      disabled={deletingId === service.id}
                      className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-rose-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-rose-600 disabled:opacity-50"
                      style={{ width: "2rem" }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.width = "auto";
                          e.currentTarget.style.paddingLeft = "0.75rem";
                          e.currentTarget.style.paddingRight = "0.75rem";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Delete service"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>Total: {total} services</p>
          <p>Filters auto-apply; use Refresh to reload.</p>
        </div>
      </div>

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

