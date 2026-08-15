"use client";

import React, { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { AlertTriangle, Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { countersApi, type CounterResponse } from "@/services/countersApi";
import { useTenant } from "@/hooks/useTenant";

/**
 * The QR a hospital prints and glues to a registration desk.
 *
 * ⚠️ THE FAILURE MODE THIS SCREEN EXISTS TO PREVENT IS A QR THAT LOOKS FINE.
 *
 * A QR built with the wrong facility ID, or with an empty one, renders as a
 * perfectly valid image. It scans. It just resolves to nothing, and the only
 * symptom is patients at the desk saying "it isn't working" while staff have
 * nothing at all to inspect. So the URL is shown in full underneath — that
 * text is the difference between "the QR is wrong" and "the phone is wrong".
 *
 * The image comes from the server rather than being drawn here, matching the
 * TV-login QR: this gets printed, and a rendering that depends on the browser
 * is one more thing between a hospital and a piece of paper.
 */

export interface CounterQrModalProps {
  counter: CounterResponse | null;
  onClose: () => void;
}

export function CounterQrModal({ counter, onClose }: CounterQrModalProps) {
  const { tenant } = useTenant();
  const printRef = useRef<HTMLDivElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!counter) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setImageUrl(null);
      setShareUrl(null);
      try {
        const [blob, url] = await Promise.all([
          countersApi.qrPng(counter.code),
          countersApi.qrUrl(counter.code),
        ]);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setShareUrl(url);
      } catch (e) {
        if (!cancelled) setError(await readBlobError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      // The blob stays in memory for the life of the document otherwise, and
      // this modal is opened once per counter on a screen staff leave open.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [counter]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleDownload = () => {
    if (!imageUrl || !counter) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `counter-${counter.code}-qr.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  return (
    <Modal
      isOpen={counter !== null}
      onClose={onClose}
      title={counter ? `QR code — ${counter.name}` : "QR code"}
      size="md"
    >
      <div className="space-y-4">
        {loading && (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">This QR cannot be built yet</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {imageUrl && counter && (
          <>
            {/* Everything inside printRef is what lands on the paper. */}
            <div ref={printRef} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="text-center">
                <p className="text-base font-bold text-slate-900">
                  {tenant?.name || "Registration"}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-sky-700">{counter.name}</p>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Scan and Share QR for counter ${counter.code}`}
                  className="mx-auto my-4 h-56 w-56"
                />

                <p className="text-sm font-semibold text-slate-800">
                  Scan with any ABHA / PHR app to share your health ID
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Counter code: <span className="font-mono">{counter.code}</span>
                </p>
                {/* Printed on the sheet: whoever sticks this to a desk needs
                    to know which doctor a scan here books. A QR on the wrong
                    desk sends patients to the wrong clinic, and the code alone
                    does not say. */}
                {counter.doctor_name && (
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Books appointments for {counter.doctor_name}
                  </p>
                )}
              </div>
            </div>

            {/* ⚠️ Not decoration. See the header comment — an unreadable QR is
                indistinguishable from a wrong one without this. */}
            {shareUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  This QR points to
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                  {shareUrl}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Pull the message out of a failed blob request.
 *
 * ⚠️ `responseType: "blob"` applies to error responses too. A 400 whose body is
 * `{"detail": "..."}` arrives as a Blob, so the usual error helper reports
 * "[object Blob]" and the actual explanation — which is the useful part here,
 * e.g. "no facility ID configured" — is thrown away.
 */
async function readBlobError(e: unknown): Promise<string> {
  const data = (e as { response?: { data?: unknown } })?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.detail === "string") return parsed.detail;
    } catch {
      // Not JSON — fall through to the generic message.
    }
  }

  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }

  return "Could not build the QR code for this counter.";
}
