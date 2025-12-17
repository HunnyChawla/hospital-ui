"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { labBookingsApi, LabBooking, BookingStatus, LabBookingTest } from "@/services/labBookingsApi";
import { invoicesApi, Invoice } from "@/services/invoicesApi";
import { patientsApi } from "@/services/patientsApi";
import { formatDate, currency } from "@/utils/format";
import { Beaker, Search, Calendar, User, Clock, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonRow } from "../shared/SkeletonRow";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";
import { InvoicePrint } from "../invoices/InvoicePrint";
import { Modal } from "../common/Modal";

interface LabBookingWithPatient extends LabBooking {
  patient_name?: string;
  patient_mobile?: string;
}

interface LabBookingsListProps {
  patientId?: string;
}

export function LabBookingsList({ patientId }: LabBookingsListProps) {
  const [bookings, setBookings] = useState<LabBookingWithPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchBookingId, setSearchBookingId] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Set default date on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  }, [selectedDate]);
  const [printInvoiceData, setPrintInvoiceData] = useState<{ invoice: Invoice; patientName: string; patientMobile?: string; tests?: LabBookingTest[]; bookingNumber?: string } | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LabBookingWithPatient | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printInvoiceData ? `Invoice_${printInvoiceData.invoice.invoice_number}` : "Invoice",
  });

  const fetchBookings = useCallback(async () => {
    if (!selectedDate) return; // Don't fetch if date is not set yet
    setLoading(true);
    try {
      const response = await labBookingsApi.list({
        page: currentPage,
        page_size: pageSize,
        patient_id: patientId,
        scheduled_date: selectedDate,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      // Fetch patient details for bookings
      const bookingsWithPatients = await Promise.all(
        response.items.map(async (booking) => {
          try {
            const patient = await patientsApi.getById(booking.patient_id);
            return {
              ...booking,
              patient_name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
              patient_mobile: patient.mobile,
            };
          } catch {
            return {
              ...booking,
              patient_name: "Unknown",
              patient_mobile: "",
            };
          }
        })
      );

      setBookings(bookingsWithPatients);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error: any) {
      console.error("Failed to fetch lab bookings:", error);
      setBookings([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, patientId, selectedDate, statusFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [patientId, selectedDate, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Listen for booking creation events
  useEffect(() => {
    const handleBookingCreated = () => {
      fetchBookings();
    };

    window.addEventListener("lab:booking:created", handleBookingCreated);
    return () => {
      window.removeEventListener("lab:booking:created", handleBookingCreated);
    };
  }, [fetchBookings]);

  const handleSearchByBookingNumber = async () => {
    if (!searchBookingId.trim()) {
      toast.error("Please enter a booking number");
      return;
    }

    setSearching(true);
    try {
      // Search by booking_number using the list API
      const response = await labBookingsApi.list({
        page: 1,
        page_size: 10,
        booking_number: searchBookingId.trim(),
      });
      
      if (response.items.length === 0) {
        toast.error("Booking not found");
        setBookings([]);
      } else {
        // Fetch patient details for bookings
        const bookingsWithPatients = await Promise.all(
          response.items.map(async (booking) => {
            try {
              const patient = await patientsApi.getById(booking.patient_id);
              return {
                ...booking,
                patient_name: `${patient.first_name} ${patient.last_name || ""}`.trim(),
                patient_mobile: patient.mobile,
              };
            } catch {
              return {
                ...booking,
                patient_name: "Unknown",
                patient_mobile: "",
              };
            }
          })
        );
        setBookings(bookingsWithPatients);
        toast.success("Booking found");
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Booking not found");
      setBookings([]);
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-sky-50 text-sky-700";
      case "sample_collected":
        return "bg-amber-50 text-amber-700";
      case "in_progress":
        return "bg-blue-50 text-blue-700";
      case "completed":
        return "bg-emerald-50 text-emerald-700";
      case "cancelled":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700";
      case "stat":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const handlePrintInvoice = async (invoiceId: string, patientName: string, patientMobile?: string, tests?: LabBookingTest[], bookingNumber?: string) => {
    try {
      const invoice = await invoicesApi.getById(invoiceId);
      setPrintInvoiceData({ invoice, patientName, patientMobile, tests, bookingNumber });
      setShouldPrint(true);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || "Failed to fetch invoice");
    }
  };

  // Trigger print when printInvoiceData is set and shouldPrint is true
  useEffect(() => {
    if (printInvoiceData && shouldPrint && printRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        handlePrint();
        setShouldPrint(false); // Reset flag after printing
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [printInvoiceData, shouldPrint, handlePrint]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search by Booking Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchBookingId}
                onChange={(e) => setSearchBookingId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchByBookingNumber();
                  }
                }}
                placeholder="Enter booking number (e.g., LAB-20251215-00003)"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <button
              onClick={handleSearchByBookingNumber}
              disabled={searching}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
            {searchBookingId && (
              <button
                onClick={() => {
                  setSearchBookingId("");
                  fetchBookings();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Scheduled Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-sky-400"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <SkeletonRow rows={5} />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Beaker className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-slate-500">No lab test bookings found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="relative cursor-pointer rounded-xl border border-slate-100 bg-white p-4 pr-24 shadow-sm transition hover:border-sky-200 hover:shadow-md"
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-[4rem] items-center justify-center rounded-lg bg-sky-100 px-3 py-2">
                      <p className="text-xs font-bold text-sky-700 break-all text-center">
                        {booking.booking_number.split("-").pop()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {booking.patient_name || `Patient ${booking.patient_id.slice(0, 8)}...`}
                        </p>
                        <span className="pill bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-mono">
                          {booking.booking_number}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {booking.patient_mobile && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {booking.patient_mobile}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(booking.scheduled_date)}
                        </span>
                        {booking.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.scheduled_time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(booking.status)}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <span className={`pill px-2 py-0.5 text-xs font-normal ${getPriorityColor(booking.priority)}`}>
                        {booking.priority}
                      </span>
                      <span className="pill bg-slate-50 text-slate-700 px-2 py-0.5 text-xs font-normal">
                        {booking.tests.length} test{booking.tests.length !== 1 ? "s" : ""}
                      </span>
                      <span className="pill bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-normal">
                        {currency(booking.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
                {booking.invoice_id && (
                  <div className="absolute right-4 top-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintInvoice(booking.invoice_id!, booking.patient_name || "Unknown", booking.patient_mobile, booking.tests, booking.booking_number);
                      }}
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
                      title="Print Invoice"
                    >
                      <Printer className="h-4 w-4 shrink-0" />
                      <span className="ml-1.5 hidden whitespace-nowrap group-hover:inline">Print Invoice</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{total}</span> bookings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
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
                    className={`min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden printable invoice */}
      {printInvoiceData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
          <div ref={printRef} className="print-content">
            <InvoicePrint
              invoice={printInvoiceData.invoice}
              patientName={printInvoiceData.patientName}
              patientMobile={printInvoiceData.patientMobile}
              tests={printInvoiceData.tests}
              bookingNumber={printInvoiceData.bookingNumber}
            />
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Lab Test Booking - ${selectedBooking?.booking_number}`}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Patient Information</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Patient Name</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedBooking.patient_name || `Patient ${selectedBooking.patient_id.slice(0, 8)}...`}
                  </p>
                </div>
                {selectedBooking.patient_mobile && (
                  <div>
                    <p className="text-xs text-slate-500">Mobile</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedBooking.patient_mobile}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Booking Number</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{selectedBooking.booking_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status.replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Booking Details</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Scheduled Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDate(selectedBooking.scheduled_date)}</p>
                </div>
                {selectedBooking.scheduled_time && (
                  <div>
                    <p className="text-xs text-slate-500">Scheduled Time</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedBooking.scheduled_time}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Priority</p>
                  <p className="mt-1">
                    <span className={`pill px-2 py-0.5 text-xs font-normal ${getPriorityColor(selectedBooking.priority)}`}>
                      {selectedBooking.priority}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{currency(selectedBooking.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Test Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Test Details</h3>
              <div className="space-y-2">
                {selectedBooking.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{test.test_name}</p>
                      <p className="text-xs text-slate-500">Code: {test.test_code}</p>
                    </div>
                    <p className="ml-4 font-semibold text-slate-900">{currency(test.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedBooking.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
                <p className="text-sm text-slate-700">{selectedBooking.notes}</p>
              </div>
            )}

            {/* Actions */}
            {selectedBooking.invoice_id && (
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  onClick={() => {
                    handlePrintInvoice(
                      selectedBooking.invoice_id!,
                      selectedBooking.patient_name || "Unknown",
                      selectedBooking.patient_mobile,
                      selectedBooking.tests,
                      selectedBooking.booking_number
                    );
                  }}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

