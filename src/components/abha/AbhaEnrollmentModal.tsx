"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Smartphone,
  User,
  Fingerprint,
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  abhaApi,
  type AbhaEnrollmentResult,
  type AbhaProfileDto,
} from "@/services/abhaApi";
import { getErrorMessage } from "@/utils/errorHandler";


export interface AbhaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: AbhaProfileDto, aadhaarNumber?: string) => void;
  patientId?: string;
  initialMobile?: string;
  initialName?: string;
}

type TabType = "aadhaar_otp" | "demographic" | "biometric" | "document" | "link_existing";

export function AbhaEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  initialMobile = "",
  initialName = "",
}: AbhaEnrollmentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("aadhaar_otp");

  // Aadhaar OTP State
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarMobile, setAadhaarMobile] = useState(initialMobile);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Demographic State
  const [demoName, setDemoName] = useState(initialName);
  const [demoGender, setDemoGender] = useState("M");
  const [demoDob, setDemoDob] = useState("");

  // Biometric State
  const [bioType, setBioType] = useState<"bio" | "face" | "iris">("bio");
  const [pidData, setPidData] = useState("");

  // Document State
  const [docType, setDocType] = useState("DRIVING_LICENCE");
  const [docId, setDocId] = useState("");

  // Link Existing State
  const [linkAbhaNumber, setLinkAbhaNumber] = useState("");
  const [linkSessionKey, setLinkSessionKey] = useState<string | null>(null);
  const [linkOtp, setLinkOtp] = useState("");
  const [linkOtpSent, setLinkOtpSent] = useState(false);

  // Cooldown states for Resend OTP
  const [resendCooldown, setResendCooldown] = useState(0);
  const [linkResendCooldown, setLinkResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (linkResendCooldown > 0) {
      timer = setInterval(() => {
        setLinkResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [linkResendCooldown]);

  // Address Suggestions State
  const [suggestedAddresses, setSuggestedAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showAddressSelection, setShowAddressSelection] = useState(false);

  // Loading & Result
  const [loading, setLoading] = useState(false);
  const [resultProfile, setResultProfile] = useState<AbhaProfileDto | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSessionKey(null);
    setOtp("");
    setOtpSent(false);
    setLinkSessionKey(null);
    setLinkOtp("");
    setLinkOtpSent(false);
    setSuggestedAddresses([]);
    setSelectedAddress("");
    setShowAddressSelection(false);
    setResultProfile(null);
    setResendCooldown(0);
    setLinkResendCooldown(0);
  };

  // --------------------------------------------------------------------------
  // Handlers: Aadhaar OTP
  // --------------------------------------------------------------------------
  const handleRequestAadhaarOtp = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestAadhaarOtp({ aadhaar_number: aadhaarNumber });
      setSessionKey(res.session_key);
      setOtpSent(true);
      setResendCooldown(30); // 30 seconds cooldown for resending
      toast.success(res.message || "OTP sent to Aadhaar registered mobile");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to send Aadhaar OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!sessionKey || !otp) {
      toast.error("Please enter OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyAadhaarOtp({
        session_key: sessionKey,
        otp,
        mobile: aadhaarMobile,
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Demographic Auth
  // --------------------------------------------------------------------------
  const handleDemographicEnroll = async () => {
    if (!aadhaarNumber || !demoName || !demoDob) {
      toast.error("Please fill all required demographic fields");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.enrolByDemographic({
        aadhaar_number: aadhaarNumber,
        name: demoName,
        gender: demoGender,
        date_of_birth: demoDob,
        mobile: aadhaarMobile,
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Demographic enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Biometric Auth
  // --------------------------------------------------------------------------
  const handleBiometricEnroll = async () => {
    if (!aadhaarNumber || !pidData) {
      toast.error("Please provide Aadhaar and biometric PID data");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.enrolByBiometric({
        aadhaar_number: aadhaarNumber,
        bio_type: bioType,
        pid_data: pidData,
        mobile: aadhaarMobile,
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Biometric enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Document Auth (e.g. Driving License)
  // --------------------------------------------------------------------------
  const handleDocumentEnroll = async () => {
    if (!docId || !demoName || !demoDob) {
      toast.error("Please provide document ID and demographic details");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.enrolByDocument({
        document_type: docType,
        document_id: docId,
        demographics: {
          name: demoName,
          gender: demoGender,
          dob: demoDob,
        },
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Document enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Link Existing ABHA
  // --------------------------------------------------------------------------
  const handleRequestLinkOtp = async () => {
    if (!linkAbhaNumber) {
      toast.error("Please enter existing ABHA Number or registered Mobile");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestLinkOtp({ abha_number: linkAbhaNumber });
      setLinkSessionKey(res.session_key);
      setLinkOtpSent(true);
      setLinkResendCooldown(30); // 30 seconds cooldown for resending
      toast.success(res.message || "OTP sent to registered mobile");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to request link OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLinkOtp = async () => {
    if (!linkSessionKey || !linkOtp) {
      toast.error("Please enter link OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyLinkOtp({
        session_key: linkSessionKey,
        otp: linkOtp,
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to verify link OTP");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Common Success & Address Selection Handlers
  // --------------------------------------------------------------------------
  const handleEnrollmentSuccess = (res: AbhaEnrollmentResult) => {
    if (res.suggested_addresses && res.suggested_addresses.length > 0) {
      setSuggestedAddresses(res.suggested_addresses);
      // Auto-select first suggested address as default
      const defaultAddr = res.auto_selected_address || res.suggested_addresses[0];
      setSelectedAddress(defaultAddr);
      setShowAddressSelection(true);
      setSessionKey(res.session_key || sessionKey);
      setResultProfile(res.profile);
    } else {
      setResultProfile(res.profile);
      toast.success(res.message || "ABHA profile retrieved successfully");
    }
  };

  const handleConfirmAddress = async () => {
    if (!sessionKey || !selectedAddress) {
      toast.error("Please select an ABHA address");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.confirmAddress({
        session_key: sessionKey,
        abha_address: selectedAddress,
      });
      setResultProfile(res.profile);
      setShowAddressSelection(false);
      toast.success("ABHA address confirmed successfully");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to confirm ABHA address");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndSync = () => {
    if (!resultProfile) return;
    onSuccess(resultProfile, aadhaarNumber || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Ayushman Bharat Health Account (ABHA)
              </h2>
              <p className="text-xs text-slate-500">
                Enroll new patient or link existing ABHA profile (Optional)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* STEP: Address Selection if Suggested */}
          {showAddressSelection && resultProfile ? (
            <div className="space-y-6">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>ABHA Number Created: {resultProfile.abha_number}</span>
                </div>
                <p className="text-xs mt-1 text-emerald-700">
                  Please select an ABHA address (@abdm) for this profile. We have auto-selected the first suggestion, but you can change it below.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select ABHA Address
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
                  {suggestedAddresses.map((addr) => (
                    <label
                      key={addr}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAddress === addr
                          ? "border-emerald-500 bg-emerald-50/50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="abha_address"
                        value={addr}
                        checked={selectedAddress === addr}
                        onChange={() => setSelectedAddress(addr)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="font-medium text-slate-900">{addr}</span>
                      {addr === suggestedAddresses[0] && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">
                          Auto-selected
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddressSelection(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddress}
                  disabled={loading || !selectedAddress}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Confirm Address</span>
                </button>
              </div>
            </div>
          ) : resultProfile ? (
            /* STEP: Final Verified Profile Card */
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md mb-3">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  ABHA Profile Verified!
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Ready to store ABHA details in patient records
                </p>

                <div className="mt-6 flex flex-col md:flex-row gap-6 bg-white rounded-xl p-6 border border-emerald-100 shadow-sm text-left">
                  {/* Photo Column */}
                  <div className="flex flex-col items-center justify-start gap-2">
                    {resultProfile.photo_base64 ? (
                      <img 
                        src={resultProfile.photo_base64.startsWith("data:") ? resultProfile.photo_base64 : `data:image/jpeg;base64,${resultProfile.photo_base64}`} 
                        alt="Profile Photo" 
                        className="h-24 w-24 rounded-xl object-cover border border-emerald-100 shadow-sm"
                      />
                    ) : (
                      <div className="h-24 w-24 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-200 text-slate-400 text-xs">
                        <User className="h-8 w-8 mb-1" />
                        <span>No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">ABHA Number</span>
                      <p className="font-semibold text-slate-900 text-base">
                        {resultProfile.abha_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">ABHA Address</span>
                      <p className="font-semibold text-emerald-700 text-base">
                        {resultProfile.abha_address || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Full Name</span>
                      <p className="font-medium text-slate-800 text-base">
                        {resultProfile.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Mobile Number</span>
                      <p className="font-medium text-slate-800 text-base">
                        {resultProfile.mobile || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Gender</span>
                      <p className="font-medium text-slate-800 capitalize text-base">
                        {resultProfile.gender || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Date of Birth</span>
                      <p className="font-medium text-slate-800 text-base">
                        {resultProfile.dob || "N/A"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">Email Address</span>
                      <p className="font-medium text-slate-800 text-base truncate">
                        {resultProfile.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetState}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Start Over</span>
                </button>
                <button
                  type="button"
                  onClick={handleCompleteAndSync}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
                >
                  <span>Attach ABHA to Patient</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP: Enrollment Form with Multi-Modal Tabs */
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("aadhaar_otp")}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                    activeTab === "aadhaar_otp"
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Aadhaar OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("demographic")}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                    activeTab === "demographic"
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Demographic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("biometric")}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                    activeTab === "biometric"
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Fingerprint className="h-4 w-4" />
                  <span>Biometric</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("document")}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                    activeTab === "document"
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Driving License</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("link_existing")}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
                    activeTab === "link_existing"
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Link Existing</span>
                </button>
              </div>

              {/* TAB 1: AADHAAR OTP */}
              {activeTab === "aadhaar_otp" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      12-digit Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                      disabled={otpSent}
                      placeholder="e.g. 123456789012"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={aadhaarMobile}
                      onChange={(e) => setAadhaarMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleRequestAadhaarOtp}
                      disabled={loading || aadhaarNumber.length !== 12}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Send Aadhaar OTP</span>
                    </button>
                  ) : (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Enter 6-digit OTP <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-widest text-center focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <div className="flex items-center justify-between text-xs px-1 mt-1.5">
                          <span className="text-slate-500">Didn't receive OTP?</span>
                          {resendCooldown > 0 ? (
                            <span className="text-slate-400 font-medium">
                              Resend in <span className="font-semibold text-slate-600">{resendCooldown}s</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRequestAadhaarOtp}
                              disabled={loading}
                              className="text-sky-600 font-semibold hover:text-sky-700 hover:underline transition-colors disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setResendCooldown(0);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Change Aadhaar
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyAadhaarOtp}
                          disabled={loading || !otp}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>Verify OTP & Enroll</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DEMOGRAPHIC AUTH */}
              {activeTab === "demographic" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      12-digit Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456789012"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name (as in Aadhaar) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={demoGender}
                        onChange={(e) => setDemoGender(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="O">Other (O)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date of Birth (YYYY-MM-DD or YYYY) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={demoDob}
                        onChange={(e) => setDemoDob(e.target.value)}
                        placeholder="e.g. 1990-05-15 or 1990"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={aadhaarMobile}
                        onChange={(e) => setAadhaarMobile(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDemographicEnroll}
                    disabled={loading || aadhaarNumber.length !== 12 || !demoName || !demoDob}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Enroll by Demographic Auth</span>
                  </button>
                </div>
              )}

              {/* TAB 3: BIOMETRIC AUTH */}
              {activeTab === "biometric" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      12-digit Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456789012"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Biometric Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bioType}
                        onChange={(e) => setBioType(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      >
                        <option value="bio">Fingerprint (Bio)</option>
                        <option value="face">Face Auth (RD Service)</option>
                        <option value="iris">Iris Scan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={aadhaarMobile}
                        onChange={(e) => setAadhaarMobile(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      PID Data (from RD Device) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={pidData}
                      onChange={(e) => setPidData(e.target.value)}
                      placeholder="Base64 encoded PID XML/JSON from RD Service..."
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleBiometricEnroll}
                    disabled={loading || aadhaarNumber.length !== 12 || !pidData}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Enroll by Biometric Auth</span>
                  </button>
                </div>
              )}

              {/* TAB 4: DOCUMENT ENROLLMENT */}
              {activeTab === "document" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      >
                        <option value="DRIVING_LICENCE">Driving License</option>
                        <option value="PAN_CARD">PAN Card</option>
                        <option value="VOTER_ID">Voter ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Document ID / Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={docId}
                        onChange={(e) => setDocId(e.target.value)}
                        placeholder="e.g. DL-1234567890"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="Name as in document"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date of Birth (YYYY-MM-DD) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={demoDob}
                        onChange={(e) => setDemoDob(e.target.value)}
                        placeholder="1990-05-15"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDocumentEnroll}
                    disabled={loading || !docId || !demoName || !demoDob}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Enroll by Government Document</span>
                  </button>
                </div>
              )}

              {/* TAB 5: LINK EXISTING ABHA */}
              {activeTab === "link_existing" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      14-digit ABHA Number or Registered Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={linkAbhaNumber}
                      onChange={(e) => setLinkAbhaNumber(e.target.value)}
                      disabled={linkOtpSent}
                      placeholder="e.g. 12-3456-7890-1234 or 9876543210"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                    />
                  </div>

                  {!linkOtpSent ? (
                    <button
                      type="button"
                      onClick={handleRequestLinkOtp}
                      disabled={loading || !linkAbhaNumber}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Request Link OTP</span>
                    </button>
                  ) : (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Enter 6-digit OTP <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={linkOtp}
                          onChange={(e) => setLinkOtp(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-widest text-center focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <div className="flex items-center justify-between text-xs px-1 mt-1.5">
                          <span className="text-slate-500">Didn't receive OTP?</span>
                          {linkResendCooldown > 0 ? (
                            <span className="text-slate-400 font-medium">
                              Resend in <span className="font-semibold text-slate-600">{linkResendCooldown}s</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRequestLinkOtp}
                              disabled={loading}
                              className="text-sky-600 font-semibold hover:text-sky-700 hover:underline transition-colors disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setLinkOtpSent(false);
                            setLinkResendCooldown(0);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Change ABHA Number
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyLinkOtp}
                          disabled={loading || !linkOtp}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>Verify & Link ABHA</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>ABHA enrollment is optional and does not affect regular patient registration.</span>
          <span className="text-emerald-700 font-medium">Ayushman Bharat Digital Mission (ABDM)</span>
        </div>
      </div>
    </div>
  );
}
