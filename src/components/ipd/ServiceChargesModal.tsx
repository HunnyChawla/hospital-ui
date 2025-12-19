"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Modal } from "@/components/common/Modal";
import { serviceChargesApi, ServiceCharge } from "@/services/serviceChargesApi";
import { servicesApi, Service } from "@/services/servicesApi";
import { currency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { Plus, X, Search } from "lucide-react";
import { SkeletonRow } from "@/components/shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { getTenantIdForApi } from "@/utils/auth";

interface ServiceChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
}

export function ServiceChargesModal({ isOpen, onClose, admissionId }: ServiceChargesModalProps) {
  const [charges, setCharges] = useState<ServiceCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    service_id: "",
    quantity: 1,
    discount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Service dropdown state
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [serviceCurrentPage, setServiceCurrentPage] = useState(1);
  const [serviceTotalPages, setServiceTotalPages] = useState(1);
  const [serviceHasMore, setServiceHasMore] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceLoadingMore, setServiceLoadingMore] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const serviceListRef = useRef<HTMLDivElement>(null);
  const serviceSearchRef = useRef<HTMLDivElement>(null);
  const isFetchingServiceRef = useRef(false);
  const justSelectedServiceRef = useRef(false);
  const serviceCurrentPageRef = useRef(1);

  const fetchCharges = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const data = await serviceChargesApi.list(admissionId, tenantId || undefined);
      setCharges(data);
    } catch (error) {
      console.error("Failed to fetch service charges:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch service charges");
      setCharges([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch services with pagination and search
  const fetchServices = useCallback(async (page: number, append: boolean, searchTerm: string) => {
    if (isFetchingServiceRef.current) return;
    
    isFetchingServiceRef.current = true;
    if (append) {
      setServiceLoadingMore(true);
    } else {
      setServiceLoading(true);
    }

    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const response = await servicesApi.list({
        page,
        page_size: 10,
        is_active: true,
        search: searchTerm.trim() || undefined,
        tenant_id: tenantId || undefined,
      });

      if (append) {
        setAvailableServices((prev) => [...prev, ...response.items]);
      } else {
        setAvailableServices(response.items);
      }

      setServiceCurrentPage(response.page);
      serviceCurrentPageRef.current = response.page;
      setServiceTotalPages(response.total_pages);
      setServiceHasMore(response.page < response.total_pages);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      if (!append) {
        setAvailableServices([]);
      }
    } finally {
      setServiceLoading(false);
      setServiceLoadingMore(false);
      isFetchingServiceRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOpen && admissionId) {
      fetchCharges();
      setShowAddForm(false);
      setFormData({ service_id: "", quantity: 1, discount: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, admissionId]);

  // Initial load services when form opens
  useEffect(() => {
    if (showAddForm) {
      setServiceSearchTerm("");
      setSelectedService(null);
      setAvailableServices([]);
      setServiceCurrentPage(1);
      serviceCurrentPageRef.current = 1;
      setShowServiceDropdown(false);
      fetchServices(1, false, "");
    }
  }, [showAddForm, fetchServices]);

  // Debounced search for services
  useEffect(() => {
    if (justSelectedServiceRef.current) {
      return;
    }

    if (serviceSearchTerm.trim().length >= 0 && showAddForm) {
      const timeoutId = setTimeout(() => {
        setServiceCurrentPage(1);
        serviceCurrentPageRef.current = 1;
        fetchServices(1, false, serviceSearchTerm);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [serviceSearchTerm, showAddForm, fetchServices]);

  // Handle infinite scroll for services
  useEffect(() => {
    const serviceListElement = serviceListRef.current;
    if (!serviceListElement || !showServiceDropdown) return;

    const handleScroll = () => {
      if (isFetchingServiceRef.current || serviceLoadingMore || !serviceHasMore) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = serviceListElement;

      // If content isn't scrollable, avoid kicking off fetches
      if (scrollHeight <= clientHeight + 24) return;

      // Only load more after the user has actually scrolled
      if (scrollTop === 0) return;

      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const isNearBottom = distanceFromBottom <= 50;
      
      if (isNearBottom) {
        const nextPage = serviceCurrentPageRef.current + 1;
        if (nextPage <= serviceTotalPages && !isFetchingServiceRef.current) {
          fetchServices(nextPage, true, serviceSearchTerm);
        }
      }
    };

    serviceListElement.addEventListener("scroll", handleScroll);
    return () => serviceListElement.removeEventListener("scroll", handleScroll);
  }, [serviceHasMore, serviceLoadingMore, serviceTotalPages, serviceSearchTerm, fetchServices, showServiceDropdown]);

  // Close service dropdown when clicking outside
  useEffect(() => {
    if (!showServiceDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (serviceSearchRef.current && !serviceSearchRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showServiceDropdown]);

  const handleServiceSelect = (service: Service) => {
    justSelectedServiceRef.current = true;
    setSelectedService(service);
    setFormData({ ...formData, service_id: service.id });
    setServiceSearchTerm(service.name);
    setShowServiceDropdown(false);
    setTimeout(() => {
      justSelectedServiceRef.current = false;
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.service_id.trim()) {
      toast.error("Please select a service");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      await serviceChargesApi.create(admissionId, formData, tenantId || undefined);
      toast.success("Service charge added successfully");
      setShowAddForm(false);
      setFormData({ service_id: "", quantity: 1, discount: 0 });
      setSelectedService(null);
      setServiceSearchTerm("");
      fetchCharges();
    } catch (error) {
      console.error("Failed to create service charge:", error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to add service charge");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "N/A";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTime;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Service Charges" size="xl">
      <div className="space-y-3 -mx-6 -mb-6 px-6 pb-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Manage service charges for this admission
          </p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Charge
              </>
            )}
          </button>
        </div>

        {/* Add Charge Form */}
        {showAddForm && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Add New Service Charge</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="relative" ref={serviceSearchRef}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Service *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={serviceSearchTerm}
                      onChange={(e) => {
                        setServiceSearchTerm(e.target.value);
                        setShowServiceDropdown(true);
                        if (selectedService) {
                          setSelectedService(null);
                          setFormData({ ...formData, service_id: "" });
                        }
                      }}
                      onFocus={() => {
                        if (availableServices.length > 0 || serviceSearchTerm) {
                          setShowServiceDropdown(true);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                      placeholder="Search service..."
                    />
                  </div>
                  {showServiceDropdown && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
                      <div
                        ref={serviceListRef}
                        className="overflow-y-auto flex-1"
                      >
                        {serviceLoading ? (
                          <div className="p-3 text-center text-sm text-slate-500">Loading...</div>
                        ) : availableServices.length > 0 ? (
                          <>
                            {availableServices.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => handleServiceSelect(service)}
                                className="flex w-full items-start gap-3 p-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">{service.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{service.category}</span>
                                    <span className="text-xs font-semibold text-slate-900">{currency(parseFloat(service.price))}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {serviceLoadingMore && (
                              <div className="p-3 text-center text-xs text-slate-500">Loading more...</div>
                            )}
                          </>
                        ) : (
                          <div className="p-3 text-center text-sm text-slate-500">
                            No services found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedService && !showServiceDropdown && (
                    <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900">Selected: {selectedService.name}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ service_id: "", quantity: 1, discount: 0 });
                    setSelectedService(null);
                    setServiceSearchTerm("");
                    setShowServiceDropdown(false);
                    setAvailableServices([]);
                    setServiceCurrentPage(1);
                    serviceCurrentPageRef.current = 1;
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Charge"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Charges List */}
        {loading ? (
          <SkeletonRow rows={5} />
        ) : charges.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">No service charges found</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Service Name</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Category</th>
                    <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 w-16">Qty</th>
                    <th className="px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Unit Price</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-700 w-24">Total</th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700 w-20">Status</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">Performed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {charges.map((charge) => (
                    <tr key={charge.charge_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-900 font-medium">{charge.service_name}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{charge.service_category}</td>
                      <td className="px-2 py-3 text-center text-xs text-slate-700">{charge.quantity}</td>
                      <td className="px-2 py-3 text-right text-xs text-slate-700">{currency(parseFloat(charge.unit_price))}</td>
                      <td className="px-3 py-3 text-right text-xs font-bold text-slate-900">{currency(parseFloat(charge.total_amount))}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(charge.status)}`}>
                          {charge.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{formatDateTime(charge.performed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
