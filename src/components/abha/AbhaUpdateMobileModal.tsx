"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Check,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { ResendableOtpField } from "@/components/common/ResendableOtpField";
import { AbhaConsentPanel } from "@/components/abha/AbhaConsentPanel";
import { OtpSystemSelector } from "@/components/abha/OtpSystemSelector";
import { abhaApi, type AbdmOtpSystem } from "@/services/abhaApi";
import { getAbhaError } from "@/utils/abhaErrors";

export interface AbhaUpdateMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMobile: string) => void;
  patientId: string;
  patientName?: string;
  patientUhid?: string;
  currentMobile?: string;
  newMobile: string;
  abhaNumber?: string | null;
  abhaAddress?: string | null;
}

export function AbhaUpdateMobileModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
  patientUhid,
  currentMobile,
  newMobile,
  abhaNumber,
  abhaAddress,
}: AbhaUpdateMobileModalProps) {
  const [step, setStep] = useState<"auth" | "verify_new" | "success">("auth");
  const [otpSystem, setOtpSystem] = useState<AbdmOtpSystem>("aadhaar");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [authSessionKey, setAuthSessionKey] = useState<string | null>(null);
  const [authOtp, setAuthOtp] = useState("");
  const [authOtpSent, setAuthOtpSent] = useState(false);
  const [authOtpMessage, setAuthOtpMessage] = useState<string | null>(null);
  const [authVerified, setAuthVerified] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [newMobileOtp, setNewMobileOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingNewOtp, setSendingNewOtp] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep("auth");
      setOtpSystem("aadhaar");
      setConsentAccepted(false);
      setAuthSessionKey(null);
      setAuthOtp("");
      setAuthOtpSent(false);
      setAuthOtpMessage(null);
      setAuthVerified(false);
      setCooldownTimer(0);
      setNewMobileOtp("");
      setLoading(false);
      setSendingNewOtp(false);
    }
  }, [isOpen]);

  // 30-second cooldown timer countdown
  useEffect(() => {
    if (cooldownTimer <= 0) return;
    const interval = setInterval(() => {
      setCooldownTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTimer]);

  const cleanNewMobile = newMobile.replace(/\D/g, "").slice(-10);

  // Step 1a: Request Auth OTP
  const handleRequestAuthOtp = async () => {
    if (otpSystem === "aadhaar" && !consentAccepted) {
      toast.error("Please review and accept patient consent to proceed");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestMobileUpdateAuthOtp({
        patient_id: patientId,
        otp_system: otpSystem,
        consent_accepted: true,
      });
      setAuthSessionKey(res.session_key);
      setAuthOtpSent(true);
      setAuthVerified(false);
      setAuthOtp("");
      setCooldownTimer(30);
      setAuthOtpMessage(res.message || "Authentication OTP sent to registered mobile number");
      toast.success(res.message || "Authentication OTP sent successfully");
    } catch (err: any) {
      const { message } = getAbhaError(err, "Failed to send authentication OTP");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1b: Verify Auth OTP only (do not send new mobile OTP yet)
  const handleVerifyAuthOtp = async () => {
    if (!authSessionKey || authOtp.length !== 6) {
      toast.error("Please enter the 6-digit authentication OTP");
      return;
    }
    setLoading(true);
    try {
      await abhaApi.verifyMobileUpdateAuthOtp({
        session_key: authSessionKey,
        otp: authOtp,
      });
      setAuthVerified(true);
      toast.success("Authentication OTP verified successfully");
    } catch (err: any) {
      const { message } = getAbhaError(err, "Authentication OTP verification failed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1c: Send OTP to new mobile after auth verified and 30s cooldown complete
  const handleSendNewMobileOtp = async () => {
    if (!authSessionKey) return;
    if (cooldownTimer > 0) {
      toast.error(`Please wait ${cooldownTimer}s before sending OTP to new mobile number`);
      return;
    }
    setSendingNewOtp(true);
    try {
      const res = await abhaApi.requestMobileUpdateNewOtp({
        session_key: authSessionKey,
        new_mobile: cleanNewMobile,
      });
      toast.success(res.message || `OTP sent to new mobile number ${cleanNewMobile}`);
      setStep("verify_new");
    } catch (err: any) {
      const { message } = getAbhaError(err, "Failed to send OTP to new mobile number");
      toast.error(message);
    } finally {
      setSendingNewOtp(false);
    }
  };

  // Step 2a: Resend OTP on new mobile
  const handleResendNewMobileOtp = async () => {
    if (!authSessionKey) return;
    try {
      const res = await abhaApi.resendMobileUpdateOtp({
        session_key: authSessionKey,
        new_mobile: cleanNewMobile,
      });
      toast.success(res.message || "OTP resent to new mobile number");
    } catch (err: any) {
      const { message } = getAbhaError(err, "Failed to resend OTP");
      toast.error(message);
    }
  };

  // Step 2b: Verify OTP on new mobile & commit update
  const handleVerifyNewMobileOtp = async () => {
    if (!authSessionKey || newMobileOtp.length !== 6) {
      toast.error("Please enter the 6-digit OTP received on the new mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyMobileUpdateOtp({
        session_key: authSessionKey,
        otp: newMobileOtp,
        patient_id: patientId,
      });
      setStep("success");
      toast.success(res.message || "Mobile number updated in ABHA successfully!");
      setTimeout(() => {
        onSuccess(cleanNewMobile);
        onClose();
      }, 1500);
    } catch (err: any) {
      const { message } = getAbhaError(err, "Failed to verify new mobile number with ABHA");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Mobile Number with ABHA"
      size="md"
      closeOnOutsideClick={false}
    >
      <div className="space-y-4">
        {/* Step Progress Tracker */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                authVerified
                  ? "bg-emerald-100 text-emerald-700"
                  : step === "auth"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {authVerified ? <Check className="h-3 w-3" /> : "1"}
            </span>
            <span
              className={`font-medium ${
                step === "auth" ? "text-slate-900 font-semibold" : "text-slate-500"
              }`}
            >
              Authenticate Patient
            </span>
          </div>

          <div className="h-px w-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : step === "verify_new"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step === "success" ? <Check className="h-3 w-3" /> : "2"}
            </span>
            <span
              className={`font-medium ${
                step === "verify_new"
                  ? "text-slate-900 font-semibold"
                  : "text-slate-400"
              }`}
            >
              Verify New Mobile
            </span>
          </div>
        </div>

        {/* Patient & ABHA Summary Header */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-950 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-sky-600" />
              {patientName || "Patient"} {patientUhid ? `(${patientUhid})` : ""}
            </span>
            <span className="font-mono text-slate-500">
              {abhaNumber || abhaAddress || "ABHA Linked"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-sky-100/80 pt-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[11px]">Current Mobile</span>
              <span className="font-mono font-medium text-slate-700">
                {currentMobile || "Not set"}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-sky-400 shrink-0 mx-2" />
            <div className="space-y-0.5 text-right">
              <span className="text-sky-600 font-semibold block text-[11px]">New Mobile</span>
              <span className="font-mono font-bold text-sky-900 bg-sky-100/70 px-2 py-0.5 rounded">
                {cleanNewMobile}
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: Authenticate Patient */}
        {step === "auth" && (
          <div className="space-y-4">
            {!authOtpSent ? (
              // Step 1a: Select method & Send Auth OTP
              <>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Step 1: Authorization Required</span>
                  <p className="mt-0.5">
                    ABDM requires authenticating the patient via Aadhaar OTP or current registered mobile OTP before updating profile details.
                  </p>
                </div>

                <OtpSystemSelector
                  value={otpSystem}
                  onChange={setOtpSystem}
                  disabled={loading}
                  label="Authentication Method"
                />

                {otpSystem === "aadhaar" && (
                  <AbhaConsentPanel
                    checked={consentAccepted}
                    onChange={setConsentAccepted}
                    disabled={loading}
                    variant="aadhaar-authentication"
                    beneficiaryName={patientName}
                  />
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestAuthOtp}
                    disabled={loading || (otpSystem === "aadhaar" && !consentAccepted)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Send Authentication OTP</span>
                  </button>
                </div>
              </>
            ) : !authVerified ? (
              // Step 1b: Auth OTP Sent - Patient enters OTP
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="text-slate-600 font-medium">Verify Patient Identity</span>
                  {cooldownTimer > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3 text-amber-600" />
                      <span>Next OTP in <strong className="font-mono">{cooldownTimer}s</strong></span>
                    </div>
                  )}
                </div>

                <ResendableOtpField
                  value={authOtp}
                  onChange={setAuthOtp}
                  onResend={handleRequestAuthOtp}
                  length={6}
                  label="Enter Authentication OTP"
                  autoFocus
                  otpSentMessage={authOtpMessage}
                />

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthOtpSent(false);
                      setAuthOtp("");
                      setAuthOtpMessage(null);
                      setCooldownTimer(0);
                    }}
                    disabled={loading}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Change Method
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyAuthOtp}
                    disabled={loading || authOtp.length !== 6}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Verify Authentication OTP</span>
                  </button>
                </div>
              </div>
            ) : (
              // Step 1c: Auth OTP Verified! Ready to send OTP to new mobile
              <div className="space-y-3 pt-1">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      Authentication Successful
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                        Step 1 Verified
                      </span>
                    </p>
                    <p className="text-emerald-800 leading-relaxed">
                      Patient identity has been confirmed. Now send verification OTP to the new mobile number:{" "}
                      <span className="font-bold font-mono text-emerald-950">{cleanNewMobile}</span>.
                    </p>
                  </div>
                </div>

                {cooldownTimer > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-mono font-bold text-xs shrink-0 animate-pulse">
                      {cooldownTimer}s
                    </div>
                    <div className="text-xs text-amber-950 space-y-0.5">
                      <p className="font-semibold text-amber-900">ABDM 30-Second Rate Limit Cooldown</p>
                      <p className="text-amber-800">
                        ABDM requires a 30-second interval between OTP requests. You can send the OTP to new mobile in{" "}
                        <span className="font-bold font-mono">{cooldownTimer}s</span>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 flex items-center justify-between text-xs text-sky-950">
                    <span className="text-sky-800">Ready to send OTP to:</span>
                    <span className="font-mono font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
                      {cleanNewMobile}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={sendingNewOtp}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendNewMobileOtp}
                    disabled={sendingNewOtp || cooldownTimer > 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNewOtp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : cooldownTimer > 0 ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {cooldownTimer > 0
                        ? `Send OTP to New Number (${cooldownTimer}s)`
                        : "Send OTP to New Number"}
                    </span>
                    {cooldownTimer === 0 && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Verify New Mobile Number */}
        {step === "verify_new" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-950 space-y-1">
                <p className="font-semibold">Step 2: Enter Verification Code</p>
                <p>
                  ABDM has dispatched a 6-digit verification code to the new mobile number:{" "}
                  <span className="font-mono font-bold text-sky-900">{cleanNewMobile}</span>.
                </p>
              </div>
            </div>

            <ResendableOtpField
              value={newMobileOtp}
              onChange={setNewMobileOtp}
              onResend={handleResendNewMobileOtp}
              length={6}
              label={`Enter OTP sent to ${cleanNewMobile}`}
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyNewMobileOtp}
                disabled={loading || newMobileOtp.length !== 6}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Confirm & Update ABHA Mobile</span>
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {step === "success" && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Mobile Number Updated with ABHA!
            </h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your registered mobile number in ABHA and patient profile has been updated to{" "}
              <span className="font-mono font-semibold text-slate-900">{cleanNewMobile}</span>.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
