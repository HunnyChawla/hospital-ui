"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  MonitorSmartphone,
  Plus,
  Power,
  QrCode,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  countersApi,
  COUNTER_CODE_MAX_LENGTH,
  type CounterResponse,
} from "@/services/countersApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { Modal } from "@/components/common/Modal";
import { CounterQrModal } from "./CounterQrModal";
import { doctorsApi } from "@/services/doctorsApi";

/**
 * Registration counters and their Scan & Share QR codes.
 *
 * A counter is a physical desk with a printed QR on it. The patient scans,
 * approves on their own phone, and their verified profile arrives at the desk
 * — with the counter's code attached, which is how the hospital knows *which*
 * desk the patient is standing at.
 *
 * ⚠️ THE CODE IS PRINTED, SO IT IS PERMANENT.
 *
 * The backend refuses to update it for exactly that reason: changing a code
 * would orphan every sticker already glued to a desk, and nothing would report
 * it — the QRs would keep scanning and the shares would keep arriving with a
 * context nobody recognises. The UI has to make that clear *before* someone
 * types, not after, which is why the code field is fixed once created and the
 * name is the part that stays editable.
 */

export function CounterManagement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [qrCounter, setQrCounter] = useState<CounterResponse | null>(null);
  const [deleteConfirmCounter, setDeleteConfirmCounter] = useState<CounterResponse | null>(null);

  const { data: counters, isLoading, error } = useQuery({
    queryKey: ["intake-counters"],
    queryFn: () => countersApi.list(true),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["intake-counters"] });

  const toggleActive = useMutation({
    mutationFn: (counter: CounterResponse) =>
      countersApi.update(counter.id, { is_active: !counter.is_active }),
    onSuccess: (updated) => {
      void invalidate();
      toast.success(
        updated.is_active
          ? `${updated.name} is active again`
          : `${updated.name} deactivated — stop using its printed QR`
      );
    },
    onError: (e) => toast.error(getErrorMessage(e) || "Could not update the counter"),
  });

  const deleteCounter = useMutation({
    mutationFn: (counterId: string) => countersApi.delete(counterId),
    onSuccess: () => {
      void invalidate();
      toast.success("Counter and QR code deleted");
      setDeleteConfirmCounter(null);
    },
    onError: (e) => toast.error(getErrorMessage(e) || "Could not delete the counter"),
  });

  if (isLoading) {
    return (
      <div className="card flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{getErrorMessage(error) || "Could not load registration counters"}</span>
        </div>
      </div>
    );
  }

  const list = counters ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MonitorSmartphone className="h-5 w-5 text-sky-600" />
            Registration Counters & Scan & Share QR
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Each desk gets its own QR code. A patient scans it with any ABHA app,
            approves on their phone, and their verified details arrive here — tagged
            with the counter they are standing at.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add counter
        </button>
      </div>

      <div className="p-6 space-y-5">
        {showForm && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-5">
            <CounterForm
              existingCodes={list.map((c) => c.code)}
              onDone={() => {
                setShowForm(false);
                void invalidate();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 mb-3">
              <QrCode className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">No registration counters yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add a counter for each desk that registers patients to generate and print its unique ABDM Scan & Share QR code.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((counter) => (
              <li
                key={counter.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-xs transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {counter.name}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                      {counter.code}
                    </span>
                    {!counter.is_active && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  {/* What a scan at this desk actually does */}
                  <p className="mt-1 text-xs text-slate-500">
                    {counter.doctor_name ? (
                      <>
                        Directs appointments to{" "}
                        <span className="font-semibold text-slate-700">
                          {counter.doctor_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-700">
                        No doctor linked — issues a general token only
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrCounter(counter)}
                    disabled={!counter.is_active}
                    title={
                      counter.is_active
                        ? "Show the QR code to print"
                        : "Reactivate this counter to print its QR"
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-40"
                  >
                    <QrCode className="h-3.5 w-3.5 text-sky-600" />
                    QR code
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive.mutate(counter)}
                    disabled={toggleActive.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-40"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {counter.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCounter(counter)}
                    disabled={deleteCounter.isPending}
                    title="Delete this counter and its QR code"
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CounterQrModal counter={qrCounter} onClose={() => setQrCounter(null)} />

      {deleteConfirmCounter && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmCounter(null)}
          title="Delete Counter & QR Code"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteConfirmCounter.name} ({deleteConfirmCounter.code})
              </span>
              ? Its printed Scan & Share QR code will no longer function.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmCounter(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCounter.mutate(deleteConfirmCounter.id)}
                disabled={deleteCounter.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteCounter.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete QR & Counter
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * ABDM's rules for a counter code, checked before the round trip.
 *
 * The backend is the authority — this is the same rule stated twice so the
 * message appears under the field while someone is typing rather than as a
 * toast after they submit.
 */
function validateCode(code: string, existing: string[]): string | null {
  const value = code.trim();
  if (!value) return "A counter needs a code";
  if (value.length > COUNTER_CODE_MAX_LENGTH)
    return `ABDM allows at most ${COUNTER_CODE_MAX_LENGTH} characters`;
  if (!/^[A-Za-z0-9]+$/.test(value))
    return "Letters and numbers only — the code travels inside the QR code's URL";
  if (existing.some((c) => c.toLowerCase() === value.toLowerCase()))
    return "A counter with this code already exists";
  return null;
}

function CounterForm({
  existingCodes,
  onDone,
  onCancel,
}: {
  existingCodes: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [touched, setTouched] = useState(false);

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorsApi.list(),
  });

  const codeError = touched ? validateCode(code, existingCodes) : null;

  const create = useMutation({
    mutationFn: () =>
      countersApi.create({
        code: code.trim(),
        name: name.trim(),
        doctor_id: doctorId || null,
      }),
    onSuccess: (counter) => {
      toast.success(`Counter ${counter.code} created`);
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e) || "Could not create the counter"),
  });

  const submit = () => {
    setTouched(true);
    if (validateCode(code, existingCodes) || !name.trim()) return;
    create.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-sky-200/60">
        <div>
          <h3 className="text-sm font-semibold text-sky-950">Add New Registration Counter</h3>
          <p className="text-xs text-sky-700 mt-0.5">Define counter identity and optional doctor assignment</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="counter-code" className="block text-xs font-semibold text-slate-700">
            Counter code <span className="text-rose-500">*</span>
          </label>
          <input
            id="counter-code"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, COUNTER_CODE_MAX_LENGTH))}
            onBlur={() => setTouched(true)}
            placeholder="e.g. OPD1, DESK2"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Encoded in the QR code and <strong>cannot be modified later</strong>. Letters and numbers only.
          </p>
          {codeError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{codeError}</p>}
        </div>

        <div>
          <label htmlFor="counter-name" className="block text-xs font-semibold text-slate-700">
            Display name <span className="text-rose-500">*</span>
          </label>
          <input
            id="counter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OPD Registration — Ground Floor"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Friendly name for staff. Can be edited anytime.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="counter-doctor" className="block text-xs font-semibold text-slate-700">
          Doctor for this desk <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <select
          id="counter-doctor"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">No doctor — issue a token only</option>
          {(doctors ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.user_name}
              {d.specialization ? ` — ${d.specialization}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          When a patient scans this QR, they are automatically booked with this doctor today. Leave blank for a general token.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-sky-200/60">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition"
        >
          {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create counter
        </button>
      </div>
    </div>
  );
}
