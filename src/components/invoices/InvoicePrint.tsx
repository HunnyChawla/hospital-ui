"use client";

import { Invoice } from "@/services/invoicesApi";
import { LabBookingTest } from "@/services/labBookingsApi";
import { useTenant } from "@/hooks/useTenant";
import { formatDate, currency } from "@/utils/format";

interface InvoicePrintProps {
  invoice: Invoice;
  patientName: string;
  patientMobile?: string;
  tests?: LabBookingTest[];
  bookingNumber?: string;
}

export function InvoicePrint({ invoice, patientName, patientMobile, tests, bookingNumber }: InvoicePrintProps) {
  const { hospitalName } = useTenant();

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-4">
      {/* Header */}
      <div className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-3xl font-bold text-slate-900">{hospitalName.toUpperCase()}</h1>
        <p className="mt-1 text-sm text-slate-600">Invoice</p>
      </div>

      {/* Invoice Number, Booking Number & Date */}
      <div className="mb-6 rounded-lg border-2 border-sky-500 bg-sky-50 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600">Invoice Number</p>
            <p className="text-xl font-bold text-slate-900">{invoice.invoice_number}</p>
          </div>
          {bookingNumber && (
            <div>
              <p className="text-xs text-slate-600">Booking Number</p>
              <p className="text-xl font-bold text-slate-900">{bookingNumber}</p>
            </div>
          )}
          <div className={bookingNumber ? "text-right" : "col-span-2 text-right"}>
            <p className="text-xs text-slate-600">Invoice Date</p>
            <p className="text-xl font-bold text-sky-600">{formatDate(invoice.invoice_date)}</p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Patient Name</p>
            <p className="font-semibold text-slate-900">{patientName}</p>
          </div>
          {patientMobile && (
            <div>
              <p className="text-slate-600">Mobile</p>
              <p className="font-semibold text-slate-900">{patientMobile}</p>
            </div>
          )}
          <div>
            <p className="text-slate-600">Patient ID</p>
            <p className="font-semibold text-slate-900">{invoice.patient_id}</p>
          </div>
          <div>
            <p className="text-slate-600">Status</p>
            <p className="font-semibold text-slate-900 capitalize">{invoice.status}</p>
          </div>
        </div>
      </div>

      {/* Lab Tests Details */}
      {tests && tests.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Lab Tests
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="pb-2 text-left font-semibold text-slate-900">Test Name</th>
                  <th className="pb-2 text-left font-semibold text-slate-900">Test Code</th>
                  <th className="pb-2 text-right font-semibold text-slate-900">Price</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-900">{test.test_name}</td>
                    <td className="py-2 text-slate-600">{test.test_code}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">{currency(test.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Items */}
      {invoice.line_items && invoice.line_items.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Invoice Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="pb-2 text-left font-semibold text-slate-900">Description</th>
                  <th className="pb-2 text-center font-semibold text-slate-900">Quantity</th>
                  <th className="pb-2 text-right font-semibold text-slate-900">Unit Price</th>
                  <th className="pb-2 text-right font-semibold text-slate-900">Discount</th>
                  <th className="pb-2 text-right font-semibold text-slate-900">Total</th>
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
                      <td className="py-2 text-slate-900">{item.description}</td>
                      <td className="py-2 text-center text-slate-900">{quantity}</td>
                      <td className="py-2 text-right text-slate-900">{currency(unitPrice)}</td>
                      <td className="py-2 text-right text-slate-900">{discount > 0 ? currency(discount) : "-"}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{currency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fallback if no line items and no tests */}
      {(!invoice.line_items || invoice.line_items.length === 0) && (!tests || tests.length === 0) && (
        <div className="mb-6 space-y-4">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Invoice Details
          </h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              {invoice.notes || "Lab test booking invoice"}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Summary */}
      <div className="mb-6 space-y-4">
        <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
          Invoice Summary
        </h2>
        <div className="space-y-2 text-sm">
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
          <div className="flex justify-between border-t-2 border-slate-300 pt-2">
            <span className="text-lg font-bold text-slate-900">Total Amount</span>
            <span className="text-lg font-bold text-slate-900">{currency(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Paid Amount</span>
            <span className="font-semibold text-slate-900">{currency(invoice.paid_amount)}</span>
          </div>
          {(invoice.balance_amount ?? 0) > 0 && (
            <div className="flex justify-between border-t border-slate-300 pt-2">
              <span className="font-semibold text-slate-900">Balance Amount</span>
              <span className="font-semibold text-rose-600">{currency(invoice.balance_amount ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* GST Number */}
      {invoice.gst_number && (
        <div className="mb-6 text-sm">
          <p className="text-slate-600">GST Number: <span className="font-semibold text-slate-900">{invoice.gst_number}</span></p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t-2 border-slate-300 pt-4 text-center text-xs text-slate-600">
        <p>This is a computer-generated invoice. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

