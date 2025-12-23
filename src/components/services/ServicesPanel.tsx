"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchServices, deleteService } from "@/redux/servicesSlice";
import { ServiceForm } from "./ServiceForm";
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
} from "lucide-react";

const DEFAULT_QUERY = { page: 1, page_size: 20 };

export function ServicesPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, total, lastQuery, deletingId } = useAppSelector((s) => s.services);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

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
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Service Master</p>
            <p className="text-xs text-slate-500">
              Create and manage available services.
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
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
          <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
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
                  className="grid grid-cols-4 items-center px-4 py-3 text-sm text-slate-800"
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
                      onClick={() => handleDelete(service.id, service.name)}
                      disabled={deletingId === service.id}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                      title="Delete service"
                    >
                      <Trash2 className="h-4 w-4" />
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

      <ServiceForm onCreated={refresh} />
    </div>
  );
}

