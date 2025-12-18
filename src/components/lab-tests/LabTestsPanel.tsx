"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchLabTests, updateLabTest } from "@/redux/labTestsSlice";
import { LabTestForm } from "./LabTestForm";
import { currency } from "@/utils/format";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import {
  Beaker,
  RefreshCcw,
  Search,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true as boolean | undefined };

export function LabTestsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, total, lastQuery, updatingId } = useAppSelector((s) => s.labTests);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => {
    dispatch(fetchLabTests(DEFAULT_QUERY));
  }, [dispatch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatch(
        fetchLabTests({
          page: 1,
          page_size: DEFAULT_QUERY.page_size,
          search: search.trim() || undefined,
          category: category.trim() || undefined,
          is_active: onlyActive ? true : undefined,
        })
      );
    }, 320);

    return () => clearTimeout(handler);
  }, [search, category, onlyActive, dispatch]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((t) => t.category))).sort(),
    [items]
  );

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await dispatch(updateLabTest({ id, updates: { is_active: !isActive } })).unwrap();
      toast.success(`Lab test ${isActive ? "deactivated" : "activated"}`);
      dispatch(fetchLabTests(lastQuery || DEFAULT_QUERY));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const refresh = () => {
    dispatch(fetchLabTests(lastQuery || DEFAULT_QUERY));
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lab Test Catalog</p>
            <p className="text-xs text-slate-500">
              Create and manage available lab tests for bookings.
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
                placeholder="Search by name or code"
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

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-slate-500" />
            <p className="text-xs text-slate-600">
              {onlyActive ? "Showing active tests" : "Showing all tests"}
            </p>
          </div>
          <button
            onClick={() => setOnlyActive((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sky-300"
          >
            {onlyActive ? (
              <>
                <ToggleLeft className="h-4 w-4 text-sky-500" />
                Active only
              </>
            ) : (
              <>
                <ToggleRight className="h-4 w-4 text-emerald-500" />
                Include inactive
              </>
            )}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            <div>Code</div>
            <div className="col-span-2">Name</div>
            <div>Category</div>
            <div>Price</div>
            <div className="text-right">Status</div>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonRow rows={4} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No lab tests found. Add a new test to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((test) => (
                <div
                  key={test.id}
                  className="grid grid-cols-6 items-center px-4 py-3 text-sm text-slate-800"
                >
                  <div className="font-semibold text-slate-900">{test.test_code}</div>
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{test.test_name}</p>
                    {test.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{test.description}</p>
                    )}
                  </div>
                  <div className="text-slate-600">{test.category}</div>
                  <div className="font-semibold text-slate-900">{currency(test.price)}</div>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`pill ${test.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {test.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleToggleActive(test.id, test.is_active)}
                      disabled={updatingId === test.id}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-60"
                    >
                      {test.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>Total: {total} tests</p>
          <p>Filters auto-apply; use Refresh to reload.</p>
        </div>
      </div>

      <LabTestForm onCreated={refresh} />
    </div>
  );
}

