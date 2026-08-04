"use client";

import { useState } from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { ResendableOtpField } from "@/components/common/ResendableOtpField";
import { abhaApi } from "@/services/abhaApi";
import { getErrorMessage } from "@/utils/errorHandler";

export interface AbhaCardDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  abhaNumber: string;
}

export function AbhaCardDownloadModal({ isOpen, onClose, abhaNumber }: AbhaCardDownloadModalProps) {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setSessionKey(null);
    setOtp("");
    setOtpSent(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isSessionExpiredError = (error: any) => {
    const msg = getErrorMessage(error);
    return typeof msg === "string" && msg.toLowerCase().includes("session expired");
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const res = await abhaApi.requestLinkOtp({ abha_number: abhaNumber });
      setSessionKey(res.session_key);
      setOtpSent(true);
      toast.success(res.message || "OTP sent to registered mobile");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndDownload = async () => {
    if (!sessionKey || !otp) {
      toast.error("Please enter OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyLinkOtp({ session_key: sessionKey, otp });
      if (!res.card_session_key) {
        toast.error("ABHA card is not available for download right now. Please try again.");
        return;
      }
      const blob = await abhaApi.downloadAbhaCard(res.card_session_key);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "abha-card.png";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ABHA card downloaded successfully");
      handleClose();
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setSessionKey(null);
        setOtp("");
        setOtpSent(false);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "Failed to verify OTP and download ABHA card");
      }
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
        <Download className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Download ABHA Card</h2>
        <p className="text-xs text-slate-500">Verify with OTP to download the card for {abhaNumber}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="sm" closeOnOutsideClick={false}>
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>ABHA: {abhaNumber}</span>
        </div>

        {!otpSent ? (
          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Send OTP</span>
          </button>
        ) : (
          <div className="space-y-4">
            <ResendableOtpField
              value={otp}
              onChange={setOtp}
              onResend={handleRequestOtp}
              disabled={loading}
              autoFocus
              startCooldownOnMount
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndDownload}
                disabled={loading || !otp}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Verify & Download</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
