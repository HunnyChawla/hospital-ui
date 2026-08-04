"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Smartphone,
  User,
  FileText,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { Tabs, type TabItem } from "@/components/common/Tabs";
import { ResendableOtpField } from "@/components/common/ResendableOtpField";
import { AbhaConsentPanel } from "@/components/abha/AbhaConsentPanel";
import { AbhaCardPreviewModal } from "@/components/abha/AbhaCardPreviewModal";
import {
  abhaApi,
  type AbhaEnrollmentResult,
  type AbhaProfileDto,
} from "@/services/abhaApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { formatAbhaOrMobileInput, formatAadhaarDisplay } from "@/utils/format";


export interface AbhaEnrollmentExistingPatientDetails {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface AbhaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: AbhaProfileDto, aadhaarNumber?: string) => void;
  patientId?: string;
  initialMobile?: string;
  initialName?: string;
  /** Personal details of the existing patient this enrollment is meant to link to. When
   * provided, the document (Driving License) tab auto-fills its personal-details form
   * from these once mobile OTP is verified, instead of leaving them blank. */
  existingPatientDetails?: AbhaEnrollmentExistingPatientDetails;
}

const genderToCode = (gender?: string | null): string | null => {
  if (!gender) return null;
  const letter = gender.trim().charAt(0).toUpperCase();
  return letter === "M" || letter === "F" || letter === "O" ? letter : null;
};

const ALLOWED_DOC_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];

/** ABDM expects a bare base64 string for document photos, not a Data-URL. */
const toBareBase64 = (dataUrl: string): string => dataUrl.split(",")[1] ?? dataUrl;

type TabType = "aadhaar_otp" | "document" | "link_existing";

const TABS: TabItem<TabType>[] = [
  { key: "aadhaar_otp", label: "Aadhaar OTP", icon: Smartphone },
  { key: "document", label: "Driving License", icon: FileText },
  { key: "link_existing", label: "Link Existing", icon: ShieldCheck },
];

export function AbhaEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  initialMobile = "",
  initialName = "",
  existingPatientDetails,
}: AbhaEnrollmentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("aadhaar_otp");

  // Aadhaar OTP State
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarMobile, setAadhaarMobile] = useState(initialMobile);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [aadhaarConsentAccepted, setAadhaarConsentAccepted] = useState(false);

  // Document State
  const [docType, setDocType] = useState("DRIVING_LICENCE");
  const [docId, setDocId] = useState("");
  const [docMobile, setDocMobile] = useState(initialMobile);
  const [docSessionKey, setDocSessionKey] = useState<string | null>(null);
  const [docOtp, setDocOtp] = useState("");
  const [docOtpSent, setDocOtpSent] = useState(false);
  const [docOtpVerified, setDocOtpVerified] = useState(false);
  const [docFirstName, setDocFirstName] = useState("");
  const [docMiddleName, setDocMiddleName] = useState("");
  const [docLastName, setDocLastName] = useState("");
  const [docGender, setDocGender] = useState("M");
  const [docDob, setDocDob] = useState("");
  const [docAddress, setDocAddress] = useState("");
  const [docState, setDocState] = useState("");
  const [docDistrict, setDocDistrict] = useState("");
  const [docPinCode, setDocPinCode] = useState("");
  const [docFrontPhoto, setDocFrontPhoto] = useState<string | null>(null);
  const [docBackPhoto, setDocBackPhoto] = useState<string | null>(null);

  // Link Existing State
  const [linkAbhaNumber, setLinkAbhaNumber] = useState("");
  const [linkSessionKey, setLinkSessionKey] = useState<string | null>(null);
  const [linkOtp, setLinkOtp] = useState("");
  const [linkOtpSent, setLinkOtpSent] = useState(false);
  const [linkConsentAccepted, setLinkConsentAccepted] = useState(false);

  // Address Suggestions State
  const [suggestedAddresses, setSuggestedAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showAddressSelection, setShowAddressSelection] = useState(false);

  // Loading & Result
  const [loading, setLoading] = useState(false);
  const [resultProfile, setResultProfile] = useState<AbhaProfileDto | null>(null);
  const [cardSessionKey, setCardSessionKey] = useState<string | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // Tenant HIP configuration - warn instead of letting enrollment silently fail
  const { data: abdmConfig } = useQuery({
    queryKey: ["abha-config"],
    queryFn: () => abhaApi.getConfig(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const hipNotConfigured = isOpen && abdmConfig !== undefined && !abdmConfig.hip_id;

  const resetState = () => {
    setSessionKey(null);
    setOtp("");
    setOtpSent(false);
    setAadhaarConsentAccepted(false);
    setLinkSessionKey(null);
    setLinkOtp("");
    setLinkOtpSent(false);
    setLinkConsentAccepted(false);
    setSuggestedAddresses([]);
    setSelectedAddress("");
    setShowAddressSelection(false);
    setResultProfile(null);
    setCardSessionKey(null);
    setDocMobile(initialMobile);
    setDocSessionKey(null);
    setDocOtp("");
    setDocOtpSent(false);
    setDocOtpVerified(false);
    setDocFirstName("");
    setDocMiddleName("");
    setDocLastName("");
    setDocGender("M");
    setDocDob("");
    setDocAddress("");
    setDocState("");
    setDocDistrict("");
    setDocPinCode("");
    setDocFrontPhoto(null);
    setDocBackPhoto(null);
  };

  const isSessionExpiredError = (error: any) => {
    const msg = getErrorMessage(error);
    return typeof msg === "string" && msg.toLowerCase().includes("session expired");
  };

  // --------------------------------------------------------------------------
  // Handlers: Aadhaar OTP
  // --------------------------------------------------------------------------
  const handleRequestAadhaarOtp = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    if (!aadhaarConsentAccepted) {
      toast.error("Please read and accept the consent to proceed");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestAadhaarOtp({
        aadhaar_number: aadhaarNumber,
        consent_accepted: aadhaarConsentAccepted,
      });
      setSessionKey(res.session_key);
      setOtpSent(true);
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
      if (isSessionExpiredError(error)) {
        setSessionKey(null);
        setOtp("");
        setOtpSent(false);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "OTP verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Document Auth (e.g. Driving License)
  // --------------------------------------------------------------------------
  const handleRequestDocumentOtp = async () => {
    if (!docMobile || docMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestDocumentOtp({ mobile: docMobile });
      setDocSessionKey(res.session_key);
      setDocOtpSent(true);
      toast.success(res.message || "OTP sent to the provided mobile number");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Populate the document-detail form from the patient record we're linking to, so the
  // user isn't re-typing details already on file after verifying their mobile via OTP.
  const prefillDocumentFieldsFromExistingPatient = () => {
    if (!existingPatientDetails) return;
    const {
      firstName, middleName, lastName, gender, dateOfBirth, address, city, state, pincode,
    } = existingPatientDetails;
    if (firstName) setDocFirstName(firstName);
    if (middleName) setDocMiddleName(middleName);
    if (lastName) setDocLastName(lastName);
    const genderCode = genderToCode(gender);
    if (genderCode) setDocGender(genderCode);
    if (dateOfBirth) setDocDob(dateOfBirth);
    if (address) setDocAddress(address);
    if (state) setDocState(state);
    if (city) setDocDistrict(city);
    if (pincode) setDocPinCode(pincode);
  };

  const handleVerifyDocumentOtp = async () => {
    if (!docSessionKey || !docOtp) {
      toast.error("Please enter OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyDocumentOtp({ session_key: docSessionKey, otp: docOtp });
      setDocSessionKey(res.session_key);
      setDocOtpVerified(true);
      prefillDocumentFieldsFromExistingPatient();
      toast.success(res.message || "Mobile number verified successfully");
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setDocSessionKey(null);
        setDocOtp("");
        setDocOtpSent(false);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "OTP verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDocPhotoUpload = (side: "front" | "back") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_DOC_PHOTO_TYPES.includes(file.type)) {
      toast.error("Only PNG or JPG photos are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo file size must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (side === "front") setDocFrontPhoto(base64String);
      else setDocBackPhoto(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocPhoto = (side: "front" | "back") => {
    const inputId = side === "front" ? "doc-front-photo-upload" : "doc-back-photo-upload";
    if (side === "front") setDocFrontPhoto(null);
    else setDocBackPhoto(null);
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleDocumentEnroll = async () => {
    if (!docSessionKey || !docOtpVerified) {
      toast.error("Please verify your mobile number first");
      return;
    }
    if (!docId || !docFirstName || !docDob || !docAddress || !docState || !docDistrict || !docPinCode) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!docFrontPhoto || !docBackPhoto) {
      toast.error("Please upload both front and back side photos of the document");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.enrolByDocument({
        session_key: docSessionKey,
        document_type: docType,
        document_id: docId,
        first_name: docFirstName,
        middle_name: docMiddleName || undefined,
        last_name: docLastName || undefined,
        dob: docDob,
        gender: docGender,
        front_side_photo: toBareBase64(docFrontPhoto),
        back_side_photo: toBareBase64(docBackPhoto),
        address: docAddress,
        state: docState,
        district: docDistrict,
        pin_code: docPinCode,
      });
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setDocSessionKey(null);
        setDocOtp("");
        setDocOtpSent(false);
        setDocOtpVerified(false);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "Document enrollment failed");
      }
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
    if (!linkConsentAccepted) {
      toast.error("Please read and accept the consent to proceed");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestLinkOtp({
        abha_number: linkAbhaNumber,
        consent_accepted: linkConsentAccepted,
      });
      setLinkSessionKey(res.session_key);
      setLinkOtpSent(true);
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
      if (isSessionExpiredError(error)) {
        setLinkSessionKey(null);
        setLinkOtp("");
        setLinkOtpSent(false);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "Failed to verify link OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Common Success & Address Selection Handlers
  // --------------------------------------------------------------------------
  const handleEnrollmentSuccess = (res: AbhaEnrollmentResult) => {
    if (res.card_session_key) setCardSessionKey(res.card_session_key);
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
      if (isSessionExpiredError(error)) {
        resetState();
        toast.error("Your session has expired. Please start enrollment again.");
      } else {
        toast.error(getErrorMessage(error) || "Failed to confirm ABHA address");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAndSync = () => {
    if (!resultProfile) return;
    onSuccess(resultProfile, aadhaarNumber || undefined);
    onClose();
  };

  const handleDownloadCard = async () => {
    if (!cardSessionKey) return;
    try {
      const blob = await abhaApi.downloadAbhaCard(cardSessionKey);
      const url = window.URL.createObjectURL(blob);
      setCardPreviewUrl(url);
      setIsCardPreviewOpen(true);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to download ABHA card");
    }
  };

  const handleCardPreviewClose = () => {
    setIsCardPreviewOpen(false);
    if (cardPreviewUrl) {
      window.URL.revokeObjectURL(cardPreviewUrl);
      setCardPreviewUrl(null);
    }
  };

  const modalTitle = (
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
  );

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg" closeOnOutsideClick={false}>
      <div className="space-y-6">
        {hipNotConfigured && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs">
              Your hospital&apos;s ABDM facility ID isn&apos;t configured yet &mdash; enrollment may fail.
              Contact your admin to set it up under ABDM Settings.
            </p>
          </div>
        )}

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
              {cardSessionKey && (
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                >
                  <Download className="h-4 w-4" />
                  <span>Download ABHA Card</span>
                </button>
              )}
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
            <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

            {/* TAB 1: AADHAAR OTP */}
            {activeTab === "aadhaar_otp" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    12-digit Aadhaar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={formatAadhaarDisplay(aadhaarNumber)}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    disabled={otpSent}
                    placeholder="e.g. 1234 5678 9012"
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
                  <>
                    <AbhaConsentPanel
                      checked={aadhaarConsentAccepted}
                      onChange={setAadhaarConsentAccepted}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleRequestAadhaarOtp}
                      disabled={loading || aadhaarNumber.length !== 12 || !aadhaarConsentAccepted}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Send Aadhaar OTP</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <ResendableOtpField
                      value={otp}
                      onChange={setOtp}
                      onResend={handleRequestAadhaarOtp}
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

            {/* TAB 2: DOCUMENT ENROLLMENT (Driving License) */}
            {activeTab === "document" && (
              <div className="space-y-4">
                {!docOtpVerified ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={docMobile}
                        onChange={(e) => setDocMobile(e.target.value.replace(/\D/g, ""))}
                        disabled={docOtpSent}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Driving License enrollment requires mobile OTP verification before document details.
                      </p>
                    </div>

                    {!docOtpSent ? (
                      <button
                        type="button"
                        onClick={handleRequestDocumentOtp}
                        disabled={loading || docMobile.length !== 10}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>Send OTP</span>
                      </button>
                    ) : (
                      <div className="space-y-4 pt-2 border-t border-slate-100">
                        <ResendableOtpField
                          value={docOtp}
                          onChange={setDocOtp}
                          onResend={handleRequestDocumentOtp}
                          disabled={loading}
                          autoFocus
                          startCooldownOnMount
                        />

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setDocOtpSent(false)}
                            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Change Mobile Number
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyDocumentOtp}
                            disabled={loading || !docOtp}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>Verify OTP</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {existingPatientDetails && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        Personal details below were auto-filled from this patient&apos;s existing record. Please verify them against the document before submitting.
                      </p>
                    )}
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
                          placeholder="e.g. HR06BB5258"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docFirstName}
                          onChange={(e) => setDocFirstName(e.target.value)}
                          placeholder="First name as in document"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          value={docMiddleName}
                          onChange={(e) => setDocMiddleName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={docLastName}
                          onChange={(e) => setDocLastName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={docGender}
                          onChange={(e) => setDocGender(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        >
                          <option value="M">Male (M)</option>
                          <option value="F">Female (F)</option>
                          <option value="O">Other (O)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date of Birth (YYYY-MM-DD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docDob}
                          onChange={(e) => setDocDob(e.target.value)}
                          placeholder="1990-05-15"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={docAddress}
                        onChange={(e) => setDocAddress(e.target.value)}
                        placeholder="Street number 4, Sector 12"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docState}
                          onChange={(e) => setDocState(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          District <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docDistrict}
                          onChange={(e) => setDocDistrict(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={docPinCode}
                          onChange={(e) => setDocPinCode(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                      {(["front", "back"] as const).map((side) => {
                        const preview = side === "front" ? docFrontPhoto : docBackPhoto;
                        return (
                          <div key={side}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              {side === "front" ? "Front" : "Back"} Side Photo <span className="text-red-500">*</span>
                            </label>
                            {preview ? (
                              <div className="relative group">
                                <div className="h-24 border border-slate-200 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                  <img src={preview} alt={`Document ${side} side`} className="max-h-24 max-w-full object-contain" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDocPhoto(side)}
                                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  title={`Remove ${side} side photo`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <input
                                type="file"
                                id={`doc-${side}-photo-upload`}
                                accept="image/*"
                                onChange={handleDocPhotoUpload(side)}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400">Supported formats: PNG, JPG. Max size: 2MB each.</p>

                    <button
                      type="button"
                      onClick={handleDocumentEnroll}
                      disabled={
                        loading ||
                        !docId ||
                        !docFirstName ||
                        !docDob ||
                        !docAddress ||
                        !docState ||
                        !docDistrict ||
                        !docPinCode ||
                        !docFrontPhoto ||
                        !docBackPhoto
                      }
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Enroll by Government Document</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: LINK EXISTING ABHA */}
            {activeTab === "link_existing" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    14-digit ABHA Number or Registered Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={linkAbhaNumber}
                    onChange={(e) => setLinkAbhaNumber(formatAbhaOrMobileInput(e.target.value))}
                    disabled={linkOtpSent}
                    placeholder="e.g. 12-3456-7890-1234 or 9876543210"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                  />
                </div>

                {!linkOtpSent ? (
                  <>
                    <AbhaConsentPanel
                      checked={linkConsentAccepted}
                      onChange={setLinkConsentAccepted}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={handleRequestLinkOtp}
                      disabled={loading || !linkAbhaNumber || !linkConsentAccepted}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Request Link OTP</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <ResendableOtpField
                      value={linkOtp}
                      onChange={setLinkOtp}
                      onResend={handleRequestLinkOtp}
                      disabled={loading}
                      autoFocus
                      startCooldownOnMount
                    />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setLinkOtpSent(false)}
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

        {/* Footer info note */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
          <span>ABHA enrollment is optional and does not affect regular patient registration.</span>
          <span className="text-emerald-700 font-medium">Ayushman Bharat Digital Mission (ABDM)</span>
        </div>
      </div>
    </Modal>

    <AbhaCardPreviewModal isOpen={isCardPreviewOpen} onClose={handleCardPreviewClose} imageUrl={cardPreviewUrl} />
    </>
  );
}
