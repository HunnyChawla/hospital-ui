"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addCharge, fetchBilling } from "@/redux/billingSlice";
import { currency } from "@/utils/format";
import { nanoid } from "@reduxjs/toolkit";
import { toast } from "sonner";

export function BillingPanel() {
  const dispatch = useAppDispatch();
  const { records, loading } = useAppSelector((s) => s.billing);
  const [amount, setAmount] = useState(500);
  const [label, setLabel] = useState("Consultation");

  useEffect(() => {
    dispatch(fetchBilling());
  }, [dispatch]);

  const record = records[0];

  if (!record) {
    return <p className="text-sm text-slate-500">No billing data yet.</p>;
  }

  const onAdd = async () => {
    await dispatch(
      addCharge({
        recordId: record.id,
        item: {
          id: nanoid(),
          label,
          amount: Number(amount),
          category: "Other",
        },
      })
    );
    toast.success("Charge added");
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Itemized bill ({record.items.length})
          </p>
          <span className="pill bg-emerald-50 text-emerald-600">
            {record.status}
          </span>
        </div>
        <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {record.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
              <p className="font-semibold text-slate-800">{currency(item.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-800">Add charge</p>
        <div className="mt-3 space-y-2 text-sm">
          <label className="space-y-1">
            <span className="text-slate-600">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400"
            />
          </label>
          <button
            disabled={loading}
            onClick={onAdd}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow"
          >
            Add charge
          </button>
        </div>
        <div className="mt-4 rounded-xl bg-white p-3 text-sm">
          <div className="flex items-center justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>{currency(record.total)}</span>
          </div>
          <p className="text-xs text-slate-500">
            Updated {new Date(record.updatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

