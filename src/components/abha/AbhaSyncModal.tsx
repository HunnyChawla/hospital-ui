"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { ResendableOtpField } from "@/components/common/ResendableOtpField";
import { AbhaConsentPanel } from "@/components/abha/AbhaConsentPanel";
import {
  abhaApi,
  type AbhaEnrollmentResult,
  type AbhaProfileDto,
  type AbhaLinkCheckResponseDto,
} from "@/services/abhaApi";
import { getAbhaError } from "@/utils/abhaErrors";
import { formatAbhaOrMobileInput, formatDate } from "@/utils/format";

export interface AbhaSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: AbhaProfileDto, sessionKey: string) => void;
  patientId: string;
  patientUhid?: string;
  patientName?: string;
  patientMobile?: string;
  patientAbhaNumber?: string | null;
  patientAbhaAddress?: string | null;
  patientGender?: string | null;
  patientDob?: string | null;
  patientAddress?: string | null;
  patientCity?: string | null;
  patientState?: string | null;
  patientPincode?: string | null;
  patientPhoto?: string | null;
}

export function AbhaSyncModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientUhid,
  patientName,
  patientMobile,
  patientAbhaNumber,
  patientGender,
  patientDob,
  patientAddress,
  patientCity,
  patientState,
  patientPincode,
}: AbhaSyncModalProps) {
  const initialIdentifier = patientAbhaNumber || patientMobile || "";
  const [abhaIdentifier, setAbhaIdentifier] = useState(initialIdentifier);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Result state
  const [fetchedProfile, setFetchedProfile] = useState<AbhaProfileDto | null>(null);
  const [linkConflict, setLinkConflict] = useState<AbhaLinkCheckResponseDto | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [syncDemographics, setSyncDemographics] = useState(true);
  const [overrideMismatch, setOverrideMismatch] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAbhaIdentifier(patientAbhaNumber || patientMobile || "");
      setConsentAccepted(false);
      setSessionKey(null);
      setOtp("");
      setOtpSent(false);
      setLoading(false);
      setSyncing(false);
      setFetchedProfile(null);
      setLinkConflict(null);
      setCheckingConflict(false);
      setSyncDemographics(true);
      setOverrideMismatch(false);
    }
  }, [isOpen, patientAbhaNumber, patientMobile]);

  const handleRequestOtp = async () => {
    const cleanIdentifier = abhaIdentifier.trim();
    if (!cleanIdentifier) {
      toast.error("Please enter an ABHA Number or registered Mobile number");
      return;
    }
    if (!consentAccepted) {
      toast.error("Please accept the patient consent to proceed");
      return;
    }

    setLoading(true);
    try {
      const res = await abhaApi.requestLinkOtp({
        abha_number: cleanIdentifier,
        consent_accepted: consentAccepted,
      });
      setSessionKey(res.session_key);
      setOtpSent(true);
      toast.success(res.message || "OTP sent to registered mobile number");
    } catch (error: any) {
      const { message } = getAbhaError(error, "Failed to request OTP from ABDM");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!sessionKey || !otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    setLoading(true);
    try {
      const res: AbhaEnrollmentResult = await abhaApi.verifyLinkOtp({
        session_key: sessionKey,
        otp: otp.trim(),
      });

      setFetchedProfile(res.profile);
      const activeSessionKey = res.session_key || sessionKey;
      setSessionKey(activeSessionKey);
      toast.success(res.message || "ABHA profile retrieved successfully from ABDM");

      // Check for conflicts / mismatches
      if (activeSessionKey) {
        setCheckingConflict(true);
        try {
          const conflict = await abhaApi.checkLinkConflict({
            session_key: activeSessionKey,
            patient_id: patientId,
          });
          setLinkConflict(conflict);
        } catch (err) {
          console.warn("ABHA link conflict pre-check error:", err);
        } finally {
          setCheckingConflict(false);
        }
      }
    } catch (error: any) {
      const { message, code } = getAbhaError(error, "Failed to verify OTP with ABDM");
      if (code === "SESSION_EXPIRED") {
        setSessionKey(null);
        setOtp("");
        setOtpSent(false);
        toast.error("OTP session expired. Please request a new OTP.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToDatabase = async () => {
    if (!sessionKey || !fetchedProfile) return;

    if (linkConflict?.can_link === false) {
      toast.error(linkConflict.message || "Cannot link: ABHA belongs to another patient");
      return;
    }

    const hasMismatches = Boolean(
      linkConflict?.identity_mismatches && linkConflict.identity_mismatches.length > 0
    );
    if (hasMismatches && !overrideMismatch) {
      toast.error("Please review and confirm the identity mismatch override before syncing.");
      return;
    }

    setSyncing(true);
    try {
      await abhaApi.syncToPatient(patientId, {
        session_key: sessionKey,
        sync_demographics: syncDemographics,
        override_mismatch: overrideMismatch,
      });

      toast.success("Patient profile successfully updated with ABHA data in database!");
      onSuccess(fetchedProfile, sessionKey);
      onClose();
    } catch (error: any) {
      const { message } = getAbhaError(error, "Failed to sync ABHA profile to patient");
      toast.error(message, { duration: 10000 });
    } finally {
      setSyncing(false);
    }
  };

  const currentAddressFull = [patientAddress, patientCity, patientState, patientPincode]
    .filter(Boolean)
    .join(", ");
  const fetchedAddressFull = [
    fetchedProfile?.address,
    fetchedProfile?.district,
    fetchedProfile?.state,
    fetchedProfile?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const modalTitle = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
        <RefreshCw className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sync ABHA Profile</h2>
        <p className="text-xs text-slate-500">
          Fetch official verified data from ABHA/ABDM and update the patient database record
        </p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <div className="space-y-5 py-1">
        {/* Patient Reference Header */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-200 text-sm">
          <div>
            <span className="font-semibold text-slate-900">{patientName || "Patient"}</span>
            {patientUhid && (
              <span className="ml-2 font-mono text-xs text-slate-500">({patientUhid})</span>
            )}
          </div>
          {patientAbhaNumber ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{patientAbhaNumber}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">No ABHA number currently linked</span>
          )}
        </div>

        {!fetchedProfile ? (
          /* Step 1: Request & Verify OTP */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                ABHA Number or Registered Mobile
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={abhaIdentifier}
                  onChange={(e) => setAbhaIdentifier(formatAbhaOrMobileInput(e.target.value))}
                  disabled={otpSent || loading}
                  placeholder="Enter 14-digit ABHA (XX-XXXX-XXXX-XXXX) or 10-digit mobile"
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>
            </div>

            {!otpSent && (
              <>
                <AbhaConsentPanel
                  checked={consentAccepted}
                  onChange={setConsentAccepted}
                  disabled={loading}
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || !consentAccepted || !abhaIdentifier.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Request OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {otpSent && (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <ResendableOtpField
                  value={otp}
                  onChange={setOtp}
                  onResend={handleRequestOtp}
                  disabled={loading}
                />

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setSessionKey(null);
                    }}
                    disabled={loading}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Change ABHA / Mobile Number
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || !otp.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Fetching Profile...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Verify & Fetch Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Fetched ABHA Profile Comparison & Confirmation */
          <div className="space-y-4">
            {/* Conflict / Mismatch Warnings */}
            {checkingConflict && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>Checking link compatibility...</span>
              </div>
            )}

            {linkConflict && !linkConflict.can_link && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs flex gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">ABHA Already Linked to Another Patient</p>
                  <p className="mt-0.5">{linkConflict.message}</p>
                </div>
              </div>
            )}

            {linkConflict?.identity_mismatches && linkConflict.identity_mismatches.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-amber-800 text-xs space-y-2">
                <div className="flex gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Identity Mismatch Detected</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {linkConflict.identity_mismatches.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-1 font-medium cursor-pointer text-amber-900">
                  <input
                    type="checkbox"
                    checked={overrideMismatch}
                    onChange={(e) => setOverrideMismatch(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Confirm override: verified this is the same patient</span>
                </label>
              </div>
            )}

            {/* ABHA Profile Preview Card */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {fetchedProfile.photo_base64 ? (
                    <img
                      src={`data:image/jpeg;base64,${fetchedProfile.photo_base64}`}
                      alt="ABHA Photo"
                      className="h-14 w-14 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-semibold text-lg border-2 border-emerald-300">
                      {fetchedProfile.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-base">
                        {fetchedProfile.name || "ABHA Profile"}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ABDM Verified
                      </span>
                    </div>
                    <p className="font-mono text-xs font-medium text-emerald-700 mt-0.5">
                      {fetchedProfile.abha_number || "ABHA"}
                      {fetchedProfile.abha_address && (
                        <span className="text-slate-500 font-normal ml-2">
                          ({fetchedProfile.abha_address})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/80">
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Current Patient Record
                  </span>
                  <div className="space-y-1 text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <p>
                      <span className="font-medium text-slate-500">Name:</span>{" "}
                      {patientName || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Gender:</span>{" "}
                      {patientGender || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">DOB:</span>{" "}
                      {patientDob ? formatDate(patientDob) : "—"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Mobile:</span>{" "}
                      {patientMobile || "—"}
                    </p>
                    <p className="truncate" title={currentAddressFull}>
                      <span className="font-medium text-slate-500">Address:</span>{" "}
                      {currentAddressFull || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-emerald-700 uppercase tracking-wider text-[10px] font-semibold">
                    Fetched ABHA Profile (from ABDM)
                  </span>
                  <div className="space-y-1 text-slate-800 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                    <p>
                      <span className="font-medium text-slate-500">Name:</span>{" "}
                      <span className="font-semibold text-emerald-900">
                        {fetchedProfile.name || "—"}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Gender:</span>{" "}
                      {fetchedProfile.gender || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">DOB:</span>{" "}
                      {fetchedProfile.dob || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Mobile:</span>{" "}
                      {fetchedProfile.mobile || "—"}
                    </p>
                    <p className="truncate" title={fetchedAddressFull}>
                      <span className="font-medium text-slate-500">Address:</span>{" "}
                      {fetchedAddressFull || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Options */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncDemographics}
                  onChange={(e) => setSyncDemographics(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="font-medium text-slate-900">
                    Update patient demographic details in database
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Updates name, date of birth, gender, address, city, state, pincode, photo, and
                    marks mobile verified in the database.
                  </p>
                </div>
              </label>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setFetchedProfile(null);
                  setOtp("");
                  setOtpSent(false);
                }}
                disabled={syncing}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                ← Back / Re-fetch
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={syncing}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSyncToDatabase}
                  disabled={syncing || linkConflict?.can_link === false}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Sync & Update Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
