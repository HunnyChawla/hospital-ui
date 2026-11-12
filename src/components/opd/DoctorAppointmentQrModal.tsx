"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Download,
  FileDown,
  ImageDown,
  Loader2,
  Printer,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { countersApi, type CounterResponse } from "@/services/countersApi";
import { tenantsApi } from "@/services/tenantsApi";
import { useTenant } from "@/hooks/useTenant";
import { useAppSelector } from "@/redux/hooks";
import {
  printDoctorStandee,
  downloadDoctorStandeePdf,
  type DoctorStandeePdfOptions,
} from "@/utils/doctorStandeePdf";
import {
  downloadDoctorStandeePng,
  type DoctorStandeeImageOptions,
} from "@/utils/doctorStandeePng";

export interface DoctorAppointmentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoctorId?: string | null;
}

export function DoctorAppointmentQrModal({
  isOpen,
  onClose,
  initialDoctorId,
}: DoctorAppointmentQrModalProps) {
  const { tenant, hospitalName, logoDataUrl } = useTenant();
  const { list: doctors } = useAppSelector((s) => s.doctors);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [counter, setCounter] = useState<CounterResponse | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(logoDataUrl);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync hospital logo from Redux or fetch from backend if logo file exists
  useEffect(() => {
    if (logoDataUrl) {
      setResolvedLogo(logoDataUrl);
      return;
    }
    if (tenant?.id && tenant?.logo) {
      let cancelled = false;
      tenantsApi
        .getLogo(tenant.id)
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!cancelled && typeof reader.result === "string") {
              setResolvedLogo(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          console.warn("Could not load hospital logo:", err);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [logoDataUrl, tenant?.id, tenant?.logo]);

  // Sync initial doctor selection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDoctorId) {
        setSelectedDoctorId(initialDoctorId);
      } else if (doctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(doctors[0].id);
      }
    }
  }, [isOpen, initialDoctorId, doctors, selectedDoctorId]);

  // Load counter & QR whenever doctor changes
  useEffect(() => {
    if (!isOpen || !selectedDoctorId) {
      setCounter(null);
      setImageUrl(null);
      setShareUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadDoctorQr = async () => {
      setLoading(true);
      setError(null);
      setImageUrl(null);
      setShareUrl(null);

      try {
        // Step 1: Auto-provision or retrieve doctor counter
        const doctorCounter = await countersApi.getDoctorCounter(selectedDoctorId);
        if (cancelled) return;
        setCounter(doctorCounter);

        // Step 2: Fetch QR blob and target URL in parallel
        const [blob, urlRes] = await Promise.all([
          countersApi.qrPng(doctorCounter.code),
          countersApi.qrUrl(doctorCounter.code),
        ]);

        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setShareUrl(urlRes);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(await readBlobOrHttpError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDoctorQr();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, selectedDoctorId]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const doctorDisplayName =
    selectedDoctor?.name ||
    selectedDoctor?.user_name ||
    (selectedDoctor ? `Dr. ${selectedDoctor.specialization}` : "Doctor");

  const hospitalAddress =
    [
      tenant?.address,
      [tenant?.city, tenant?.state].filter(Boolean).join(", "),
      tenant?.pincode,
    ]
      .filter(Boolean)
      .join(" • ") || null;
  const hospitalPhone = tenant?.phone_no || null;

  const getStandeeOptions = (): DoctorStandeeImageOptions | null => {
    if (!counter || !imageUrl) return null;
    return {
      hospitalName: tenant?.name || hospitalName || "Hospital Clinic",
      hospitalLogoUrl: resolvedLogo,
      hospitalAddress,
      hospitalPhone,
      doctorName: doctorDisplayName,
      specialization: selectedDoctor?.specialization || null,
      counterCode: counter.code,
      counterName: counter.name,
      qrDataUrl: imageUrl,
    };
  };

  const handlePrint = async () => {
    const options = getStandeeOptions();
    if (!options) return;
    setIsPrinting(true);
    try {
      await printDoctorStandee({
        ...options,
        shareUrl,
      });
      toast.success("Print dialog opened for ABDM standee");
    } catch (err) {
      console.error("Print standee failed:", err);
      toast.error("Could not trigger print dialog. Please use Download PDF instead.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    const options = getStandeeOptions();
    if (!options) return;
    setIsDownloadingPdf(true);
    try {
      await downloadDoctorStandeePdf({
        ...options,
        shareUrl,
      });
      toast.success("ABDM Standee PDF downloaded");
    } catch (err) {
      console.error("Download standee PDF failed:", err);
      toast.error("Could not generate PDF file.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadPng = async () => {
    const options = getStandeeOptions();
    if (!options) return;
    setIsDownloadingPng(true);
    try {
      await downloadDoctorStandeePng(options);
      toast.success("Beautiful Standee graphic card (PNG) downloaded");
    } catch (err) {
      console.error("Download standee PNG failed:", err);
      toast.error("Could not generate graphic card image.");
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleDownloadRawQr = () => {
    if (!imageUrl || !counter) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    const sanitizedDocName = doctorDisplayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    link.download = `cura-abdm-${sanitizedDocName}-raw-qr.png`;
    link.click();
    toast.success("Raw QR square downloaded");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ABDM Scan & Share — Doctor Appointment QR"
      size="lg"
    >
      <div className="space-y-4">
        {/* Doctor Switcher Toolbar */}
        <div className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sky-900">
            <Stethoscope className="h-4 w-4 text-sky-600 shrink-0" />
            <span className="text-xs font-semibold">Select Doctor:</span>
          </div>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full sm:w-auto min-w-[240px] rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name || doc.user_name || `Dr. ${doc.specialization}`} — {doc.specialization || "OPD"}
              </option>
            ))}
          </select>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            <p className="text-xs font-medium text-slate-500">
              Generating fancy branded QR for {doctorDisplayName}...
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && !loading && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">Could not generate ABDM QR</p>
              <p className="text-xs leading-relaxed text-amber-800">{error}</p>
            </div>
          </div>
        )}

        {/* Printable Standee Preview */}
        {!loading && imageUrl && counter && (
          <>
            {/* The printable card container */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
              {/* Decorative top brand bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500" />

              <div className="text-center">
                {/* 1. Hospital Logo (The MAIN Hero Brand) */}
                {resolvedLogo && (
                  <div className="mb-3 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedLogo}
                      alt={hospitalName || "Hospital Logo"}
                      className="max-h-20 max-w-[260px] object-contain"
                    />
                  </div>
                )}

                {/* Hospital Name (Dignified & Uppercase) */}
                <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 leading-snug">
                  {tenant?.name || hospitalName || "HOSPITAL CLINIC"}
                </h2>

                {/* Hospital Address & Phone */}
                {(hospitalAddress || hospitalPhone) && (
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {[hospitalAddress, hospitalPhone ? `Tel: ${hospitalPhone}` : null]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}

                {/* ABDM Accreditation Pill */}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>ABDM Scan & Share • NHA Compliant</span>
                </div>

                {/* 2. Doctor Credentials Hero Card */}
                <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                    Doctor Consultation & OPD Appointments
                  </span>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                    {doctorDisplayName}
                  </h3>
                  {selectedDoctor?.specialization && (
                    <p className="text-xs font-medium text-slate-600">
                      Department of {selectedDoctor.specialization}
                    </p>
                  )}
                </div>

                {/* 3. Large QR Code Container */}
                <div className="my-6 flex justify-center">
                  <div className="relative rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`Scan & Share QR for ${doctorDisplayName}`}
                      className="h-72 w-72 sm:h-80 sm:w-80 object-contain"
                    />
                  </div>
                </div>

                {/* Counter Code Badge */}
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-mono font-semibold text-slate-700">
                  <span>Counter Code:</span>
                  <span className="font-bold text-slate-900">{counter.code}</span>
                </div>

                {/* 4. Patient Scanning Instructions */}
                <div className="mx-auto mt-4 max-w-sm space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Scan with any ABHA / PHR app
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">ABHA App</span>
                    <span>•</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">Aarogya Setu</span>
                    <span>•</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">Paytm / PHR</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Share your verified health ID for instant check-in & token with{" "}
                    <span className="font-semibold text-slate-800">{doctorDisplayName}</span>
                  </p>
                </div>

                {/* 5. Footer (Subtle, small Cura branding) */}
                <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-slate-500">
                    Counter: {counter.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Image
                      src="/cura-logo-v2.png"
                      alt="Cura Logo"
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5 object-contain opacity-75"
                    />
                    <span className="text-[10px] font-medium text-slate-500">
                      Powered by Cura • Technesian
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={isDownloadingPng || isPrinting || isDownloadingPdf}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isDownloadingPng ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-700 shrink-0" />
                  ) : (
                    <ImageDown className="h-4 w-4 text-slate-700 shrink-0" />
                  )}
                  <span>{isDownloadingPng ? "Building PNG..." : "Download Standee (PNG)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf || isPrinting || isDownloadingPng}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50/80 px-3.5 py-2.5 text-xs font-semibold text-sky-800 shadow-2xs transition hover:bg-sky-100 hover:border-sky-300 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-700 shrink-0" />
                  ) : (
                    <FileDown className="h-4 w-4 text-sky-700 shrink-0" />
                  )}
                  <span>{isDownloadingPdf ? "Building PDF..." : "Download PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting || isDownloadingPdf || isDownloadingPng}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:from-sky-600 hover:to-teal-600 hover:shadow disabled:opacity-50 active:scale-[0.98]"
                >
                  {isPrinting ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Printer className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isPrinting ? "Opening Print..." : "Print Standee"}</span>
                </button>
              </div>

              {/* Secondary Raw QR Square Download */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDownloadRawQr}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition underline underline-offset-2"
                >
                  <Download className="h-3 w-3" />
                  <span>Download raw QR code square only</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Robust error extractor for blob & API error responses.
 */
async function readBlobOrHttpError(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.detail === "string") return parsed.detail;
    } catch {
      // Fallback
    }
  }

  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }

  return (
    (err as Error)?.message ||
    "Could not build the ABDM Scan & Share QR code. Ensure ABDM is onboarded."
  );
}
