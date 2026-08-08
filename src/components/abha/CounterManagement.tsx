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
} from "lucide-react";
import { toast } from "sonner";
import {
  countersApi,
  COUNTER_CODE_MAX_LENGTH,
  type CounterResponse,
} from "@/services/countersApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { CounterQrModal } from "./CounterQrModal";

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
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <MonitorSmartphone className="h-4 w-4 text-sky-600" />
            Registration counters
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Each desk gets its own QR code. A patient scans it with any ABHA app,
            approves on their phone, and their verified details arrive here — tagged
            with the counter they are standing at.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add counter
        </button>
      </div>

      {showForm && (
        <CounterForm
          existingCodes={list.map((c) => c.code)}
          onDone={() => {
            setShowForm(false);
            void invalidate();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {list.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No counters yet. Add one for each desk that registers patients.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {list.map((counter) => (
            <li
              key={counter.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  {counter.name}
                  {!counter.is_active && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{counter.code}</p>
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
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR code
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive.mutate(counter)}
                  disabled={toggleActive.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <Power className="h-3.5 w-3.5" />
                  {counter.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CounterQrModal counter={qrCounter} onClose={() => setQrCounter(null)} />
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
  const [touched, setTouched] = useState(false);

  const codeError = touched ? validateCode(code, existingCodes) : null;

  const create = useMutation({
    mutationFn: () => countersApi.create({ code: code.trim(), name: name.trim() }),
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
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="counter-code" className="block text-xs font-semibold text-slate-700">
            Counter code
          </label>
          <input
            id="counter-code"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, COUNTER_CODE_MAX_LENGTH))}
            onBlur={() => setTouched(true)}
            placeholder="OPD1"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          {/* ⚠️ Stated before they type, not after. This value gets printed and
              the backend will not let it be changed afterwards. */}
          <p className="mt-1 text-[11px] text-slate-500">
            Goes inside the QR code and <strong>cannot be changed later</strong> — it
            would orphan every sticker already printed. Letters and numbers only.
          </p>
          {codeError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{codeError}</p>}
        </div>

        <div>
          <label htmlFor="counter-name" className="block text-xs font-semibold text-slate-700">
            Display name
          </label>
          <input
            id="counter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="OPD Registration — Ground floor"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            What staff see. Spaces and punctuation are fine here, and this one can be
            renamed whenever you like.
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create counter
        </button>
      </div>
    </div>
  );
}
