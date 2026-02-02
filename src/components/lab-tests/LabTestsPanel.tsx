"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchLabTests, updateLabTest } from "@/redux/labTestsSlice";
import { LabTestForm } from "./LabTestForm";
import { ParametersManagementModal } from "./ParametersManagementModal";
import { PriceManagementModal } from "./PriceManagementModal";
import { currency } from "@/utils/format";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "../common/Modal";
import {
  Beaker,
  RefreshCcw,
  Search,
  ToggleLeft,
  ToggleRight,
  Filter,
  Plus,
  Settings,
  Power,
  PowerOff,
} from "lucide-react";

const DEFAULT_QUERY = { page: 1, page_size: 20, is_active: true as boolean | undefined };

export function LabTestsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, total, lastQuery, updatingId } = useAppSelector((s) => s.labTests);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTestForParameters, setSelectedTestForParameters] = useState<{
    testCode: string;
    testName: string;
  } | null>(null);
  const [selectedTestForPrice, setSelectedTestForPrice] = useState<{
    testCode: string;
    testName: string;
    currentPrice: number;
  } | null>(null);

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

  const handleTestCreated = () => {
    refresh();
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lab Test Catalog</p>
            <p className="text-xs text-slate-500">
              Create and manage available lab tests for bookings.
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
            >
              <Plus className="h-4 w-4" />
              Add Lab Test
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
          <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            <div>Code</div>
            <div className="col-span-2">Name</div>
            <div>Category</div>
            <div>Price</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
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
                  className="grid grid-cols-7 items-center px-4 py-3 text-sm text-slate-800"
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
                  <div className="flex items-center justify-center">
                    <span
                      className={`pill ${test.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {test.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedTestForPrice({ 
                        testCode: test.test_code, 
                        testName: test.test_name,
                        currentPrice: test.price
                      })}
                      className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-emerald-600 hover:to-teal-600"
                      style={{ width: "2rem", minWidth: "2rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.minWidth = "auto";
                        e.currentTarget.style.paddingLeft = "0.75rem";
                        e.currentTarget.style.paddingRight = "0.75rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.minWidth = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Manage Price"
                    >
                      <span className="text-base font-bold shrink-0">₹</span>
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">Price</span>
                    </button>
                    <button
                      onClick={() => setSelectedTestForParameters({ testCode: test.test_code, testName: test.test_name })}
                      className="group relative flex items-center justify-center overflow-visible rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 p-2 text-xs font-semibold text-white transition-all duration-300 hover:from-sky-600 hover:to-teal-600"
                      style={{ width: "2rem", minWidth: "2rem" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.width = "auto";
                        e.currentTarget.style.minWidth = "auto";
                        e.currentTarget.style.paddingLeft = "0.75rem";
                        e.currentTarget.style.paddingRight = "0.75rem";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.minWidth = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title="Manage Parameters"
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">Parameters</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(test.id, test.is_active)}
                      disabled={updatingId === test.id}
                      className={`group relative flex items-center justify-center overflow-visible rounded-lg p-2 text-xs font-semibold text-white transition-all duration-300 ${
                        test.is_active
                          ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                          : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                      } disabled:opacity-60`}
                      style={{ width: "2rem", minWidth: "2rem" }}
                      onMouseEnter={(e) => {
                        if (updatingId !== test.id) {
                          e.currentTarget.style.width = "auto";
                          e.currentTarget.style.minWidth = "auto";
                          e.currentTarget.style.paddingLeft = "0.75rem";
                          e.currentTarget.style.paddingRight = "0.75rem";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.width = "2rem";
                        e.currentTarget.style.minWidth = "2rem";
                        e.currentTarget.style.paddingLeft = "0.5rem";
                        e.currentTarget.style.paddingRight = "0.5rem";
                      }}
                      title={test.is_active ? "Deactivate test" : "Activate test"}
                    >
                      {test.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">Deactivate</span>
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 shrink-0" />
                          <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline-block">Activate</span>
                        </>
                      )}
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

      {/* Add Lab Test Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Lab Test"
        size="md"
      >
        <LabTestForm onCreated={handleTestCreated} />
      </Modal>

      {/* Parameters Management Modal */}
      {selectedTestForParameters && (
        <ParametersManagementModal
          isOpen={!!selectedTestForParameters}
          onClose={() => setSelectedTestForParameters(null)}
          testCode={selectedTestForParameters.testCode}
          testName={selectedTestForParameters.testName}
        />
      )}

      {/* Price Management Modal */}
      {selectedTestForPrice && (
        <PriceManagementModal
          isOpen={!!selectedTestForPrice}
          onClose={() => setSelectedTestForPrice(null)}
          testCode={selectedTestForPrice.testCode}
          testName={selectedTestForPrice.testName}
          currentPrice={selectedTestForPrice.currentPrice}
          onPriceUpdated={() => {
            refresh();
            setSelectedTestForPrice(null);
          }}
        />
      )}
    </div>
  );
}

