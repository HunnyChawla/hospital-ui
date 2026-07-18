"use client";

import { useEffect, useState } from "react";
import { Invoice } from "@/services/invoicesApi";
import { LabBookingTest } from "@/services/labBookingsApi";
import { PatientApiResponse, patientsApi, formatPatientName } from "@/services/patientsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";
import { PrintHeader } from "@/components/common/PrintHeader";
import { getTenantIdForApi } from "@/utils/auth";

interface InvoicePrintProps {
  invoice: Invoice;
  patientName: string;
  patientMobile?: string;
  tests?: LabBookingTest[];
  bookingNumber?: string;
}

export function InvoicePrint({ invoice, patientName, patientMobile, tests, bookingNumber }: InvoicePrintProps) {
  const { tenant } = useTenant();
  const [patient, setPatient] = useState<PatientApiResponse | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Fetch full patient details
  useEffect(() => {
    const fetchPatient = async () => {
      if (!invoice.patient_id) return;
      
      try {
        setLoadingPatient(true);
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
        const apiTenantId = getTenantIdForApi(tenantId || undefined);
        const patientData = await patientsApi.getById(invoice.patient_id, apiTenantId);
        setPatient(patientData);
      } catch (error) {
        console.error("Failed to fetch patient details:", error);
        // Silently fail - use provided patientName/patientMobile as fallback
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatient();
  }, [invoice.patient_id]);

  // Format invoice type to readable label
  const getInvoiceTypeLabel = (invoiceType?: string): string => {
    if (!invoiceType) return "Invoice";
    const type = invoiceType.toLowerCase();
    switch (type) {
      case "ipd":
        return "IPD Invoice";
      case "opd":
        return "OPD Invoice";
      case "lab":
        return "Lab Invoice";
      default:
        return `${invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1)} Invoice`;
    }
  };

  const invoiceTypeLabel = getInvoiceTypeLabel(invoice.invoice_type);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format full name
  const fullName = patient 
    ? formatPatientName(patient)
    : patientName;

  // Format address
  const formatAddress = () => {
    if (!patient) return null;
    const parts = [
      patient.address,
      patient.city,
      patient.state,
      patient.pincode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const address = formatAddress();

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-2">
      {/* Header */}
      <PrintHeader 
        tenant={tenant} 
        documentType={invoiceTypeLabel}
        invoiceNumber={invoice.invoice_number}
        invoiceDate={formatDate(invoice.invoice_date)}
      />

      {/* Patient Details */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{fullName}</p>
          </div>
          {patient?.uhid && (
            <div>
              <p className="text-[10px] text-slate-600">UHID</p>
              <p className="font-semibold text-slate-900">{patient.uhid}</p>
            </div>
          )}
          {patient?.date_of_birth && (
            <div>
              <p className="text-[10px] text-slate-600">Age</p>
              <p className="font-semibold text-slate-900">{calculateAge(patient.date_of_birth)} years</p>
            </div>
          )}
          {patient?.gender && (
            <div>
              <p className="text-[10px] text-slate-600">Gender</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.gender}</p>
            </div>
          )}
          {(patient?.mobile || patientMobile) && (
            <div>
              <p className="text-[10px] text-slate-600">Mobile</p>
              <p className="font-semibold text-slate-900">{patient?.mobile || patientMobile}</p>
            </div>
          )}
          {patient?.email && (
            <div>
              <p className="text-[10px] text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{patient.email}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-600">Status</p>
            <p className="font-semibold text-slate-900 capitalize">{invoice.status}</p>
          </div>
          {patient?.category && (
            <div>
              <p className="text-[10px] text-slate-600">Category</p>
              <p className="font-semibold text-slate-900 capitalize">{patient.category}</p>
            </div>
          )}
          {address && (

            <div className="col-span-4">
              <p className="text-[10px] text-slate-600">Address</p>
              <p className="font-semibold text-slate-900">{address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Items */}
      {invoice.line_items && invoice.line_items.length > 0 && (
        <div className="mb-3 space-y-1">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
            Invoice Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="pb-1 pt-1 text-left font-semibold text-slate-900">Description</th>
                  <th className="pb-1 pt-1 text-center font-semibold text-slate-900">Qty</th>
                  <th className="pb-1 pt-1 text-right font-semibold text-slate-900">Unit Price</th>
                  <th className="pb-1 pt-1 text-right font-semibold text-slate-900">Discount</th>
                  <th className="pb-1 pt-1 text-right font-semibold text-slate-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item, index) => {
                  const quantity = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
                  const unitPrice = typeof item.unit_price === "string" ? parseFloat(item.unit_price) : item.unit_price;
                  const discount = item.discount !== undefined 
                    ? (typeof item.discount === "string" ? parseFloat(item.discount) : item.discount)
                    : 0;
                  const total = item.total_price !== undefined 
                    ? (typeof item.total_price === "string" ? parseFloat(item.total_price) : item.total_price)
                    : (item.total || quantity * unitPrice);
                  return (
                    <tr key={item.id || index} className="border-b border-slate-100">
                      <td className="py-1 text-slate-900">{item.description}</td>
                      <td className="py-1 text-center text-slate-900">{quantity}</td>
                      <td className="py-1 text-right text-slate-900">{currency(unitPrice)}</td>
                      <td className="py-1 text-right text-slate-900">{discount > 0 ? currency(discount) : "-"}</td>
                      <td className="py-1 text-right font-semibold text-slate-900">{currency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fallback if no line items */}
      {(!invoice.line_items || invoice.line_items.length === 0) && (
        <div className="mb-3 space-y-1">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
            Invoice Details
          </h2>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-xs text-slate-600">
              {invoice.notes || "Lab test booking invoice"}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Summary */}
      <div className="mb-3 space-y-1">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-bold text-slate-900">
          Invoice Summary
        </h2>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-900">{currency(invoice.subtotal)}</span>
          </div>
          {invoice.tax_rate > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax Rate</span>
                <span className="font-semibold text-slate-900">{invoice.tax_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax Amount</span>
                <span className="font-semibold text-slate-900">{currency(invoice.tax_amount)}</span>
              </div>
            </>
          )}
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Discount</span>
              <span className="font-semibold text-slate-900">-{currency(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-1">
            <span className="text-sm font-bold text-slate-900">Total Amount</span>
            <span className="text-sm font-bold text-slate-900">{currency(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Paid Amount</span>
            <span className="font-semibold text-slate-900">{currency(invoice.paid_amount)}</span>
          </div>
          {(invoice.balance_amount ?? 0) > 0 && (
            <div className="flex justify-between border-t border-slate-300 pt-1">
              <span className="font-semibold text-slate-900">Balance Amount</span>
              <span className="font-semibold text-rose-600">{currency(invoice.balance_amount ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* GST Number */}
      {invoice.gst_number && (
        <div className="mb-2 text-xs">
          <p className="text-slate-600">GST Number: <span className="font-semibold text-slate-900">{invoice.gst_number}</span></p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-600">
        <p>This is a computer-generated invoice. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

