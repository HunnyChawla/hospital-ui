"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Users,
  BadgeCheck,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import { Tabs, type TabItem } from "@/components/common/Tabs";
import { ResendableOtpField } from "@/components/common/ResendableOtpField";
import { AbhaConsentPanel } from "@/components/abha/AbhaConsentPanel";
import { AbhaCardPreviewModal } from "@/components/abha/AbhaCardPreviewModal";
import { OtpSystemSelector } from "@/components/abha/OtpSystemSelector";
import {
  abhaApi,
  type AbdmOtpSystem,
  type AbhaEnrollmentResult,
  type AbhaLinkCheckResponseDto,
  type AbhaProfileDto,
} from "@/services/abhaApi";
import { patientsApi, type CreatePatientRequest } from "@/services/patientsApi";
import { patientKeys } from "@/hooks/queries/usePatients";
import { Patient } from "@/types";
import { getErrorMessage } from "@/utils/errorHandler";
import { getAbhaError } from "@/utils/abhaErrors";
import { formatAbhaLinkInput, formatAbhaOrMobileInput, formatAadhaarDisplay } from "@/utils/format";
import { ABDM_X_CM_ID } from "@/utils/env";
import { validateAbhaAddress } from "@/utils/abha";


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
  onSuccess: (
    profile: AbhaProfileDto,
    sessionKey: string,
    aadhaarNumber?: string,
    existingPatient?: Patient | null
  ) => void;
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

const normalizeGender = (gender?: string | null): "male" | "female" | "other" => {
  if (!gender) return "male";
  const g = gender.trim().toLowerCase();
  if (g.startsWith("f")) return "female";
  if (g.startsWith("m")) return "male";
  return "other";
};

const formatDobToIso = (dob?: string | null): string => {
  if (!dob) {
    return new Date().toISOString().split("T")[0];
  }
  const clean = dob.trim().replace(/\//g, "-");
  const parts = clean.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    } else if (parts[2].length === 4) {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  } else if (parts.length === 1 && parts[0].length === 4) {
    return `${parts[0]}-01-01`;
  }
  return dob;
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
  const [aadhaarOtpSystem, setAadhaarOtpSystem] = useState<AbdmOtpSystem>("aadhaar");
  const [aadhaarMobile, setAadhaarMobile] = useState(initialMobile);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [aadhaarOtpMessage, setAadhaarOtpMessage] = useState<string | null>(null);
  const [aadhaarConsentAccepted, setAadhaarConsentAccepted] = useState(false);

  // Aadhaar mobile-verification sub-step: entered when enrol/byAadhaar returns a profile with no
  // mobile, meaning the mobile the operator entered isn't the one linked to the Aadhaar record and
  // has to be OTP-verified on its own before enrollment can continue to address selection.
  const [needsMobileVerification, setNeedsMobileVerification] = useState(false);
  const [mobileVerifyOtpSystem, setMobileVerifyOtpSystem] = useState<AbdmOtpSystem>("abdm");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerifyOtpMessage, setMobileVerifyOtpMessage] = useState<string | null>(null);
  const [pendingEnrollmentResult, setPendingEnrollmentResult] =
    useState<AbhaEnrollmentResult | null>(null);

  // Document State
  const [docType, setDocType] = useState("DRIVING_LICENCE");
  const [docId, setDocId] = useState("");
  const [docMobile, setDocMobile] = useState(initialMobile);
  const [docOtpSystem, setDocOtpSystem] = useState<AbdmOtpSystem>("abdm");
  const [docSessionKey, setDocSessionKey] = useState<string | null>(null);
  const [docOtp, setDocOtp] = useState("");
  const [docOtpSent, setDocOtpSent] = useState(false);
  const [docOtpMessage, setDocOtpMessage] = useState<string | null>(null);
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
  const [linkOtpSystem, setLinkOtpSystem] = useState<AbdmOtpSystem>("aadhaar");
  const [linkSessionKey, setLinkSessionKey] = useState<string | null>(null);
  const [linkOtp, setLinkOtp] = useState("");
  const [linkOtpSent, setLinkOtpSent] = useState(false);
  const [linkOtpMessage, setLinkOtpMessage] = useState<string | null>(null);
  const [linkConsentAccepted, setLinkConsentAccepted] = useState(false);
  const [linkAccounts, setLinkAccounts] = useState<AbhaProfileDto[]>([]);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  const [selectedLinkAccount, setSelectedLinkAccount] = useState<AbhaProfileDto | null>(null);

  // Address Suggestions State
  const [cmId, setCmId] = useState<string>(ABDM_X_CM_ID || "sbx");
  const [suggestedAddresses, setSuggestedAddresses] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const customAddressValidation = useMemo(
    () => validateAbhaAddress(customAddress),
    [customAddress]
  );

  // Loading & Result
  const [loading, setLoading] = useState(false);
  const [resultProfile, setResultProfile] = useState<AbhaProfileDto | null>(null);
  // Session key backing the verified resultProfile - looked up server-side at sync time, so the
  // patient record can only ever be updated with data that actually came from ABDM.
  const [resultSessionKey, setResultSessionKey] = useState<string | null>(null);
  const [cardSessionKey, setCardSessionKey] = useState<string | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  // Result of the server-side "can this ABHA be linked?" pre-check. Runs as soon as a final
  // verified profile exists so a duplicate is caught here - before the parent form creates a
  // patient record - rather than after the patient already exists.
  const [linkConflict, setLinkConflict] = useState<AbhaLinkCheckResponseDto | null>(null);
  const [checkingLink, setCheckingLink] = useState(false);
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  const [loadingExistingPatient, setLoadingExistingPatient] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const queryClient = useQueryClient();

  // Tenant HIP configuration - warn instead of letting enrollment silently fail
  const { data: abdmConfig } = useQuery({
    queryKey: ["abha-config"],
    queryFn: () => abhaApi.getConfig(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const hipNotConfigured = isOpen && abdmConfig !== undefined && !abdmConfig.hip_id;
  // Only ever populated when a patientId was supplied - there's nothing to compare against
  // while adding a brand-new patient.
  const identityMismatches = linkConflict?.identity_mismatches ?? [];

  const resetState = () => {
    setActiveTab("aadhaar_otp");
    setAadhaarNumber("");
    setSessionKey(null);
    setOtp("");
    setOtpSent(false);
    setAadhaarOtpMessage(null);
    setAadhaarOtpSystem("aadhaar");
    setAadhaarConsentAccepted(false);
    setAadhaarMobile(initialMobile);
    setNeedsMobileVerification(false);
    setMobileVerifyOtpSystem("abdm");
    setMobileOtp("");
    setMobileOtpSent(false);
    setMobileVerifyOtpMessage(null);
    setPendingEnrollmentResult(null);
    setLinkAbhaNumber("");
    setLinkSessionKey(null);
    setLinkOtpSystem("aadhaar");
    setLinkOtp("");
    setLinkOtpSent(false);
    setLinkOtpMessage(null);
    setLinkConsentAccepted(false);
    setLinkAccounts([]);
    setShowAccountSelection(false);
    setSelectedLinkAccount(null);
    setSuggestedAddresses([]);
    setSelectedAddress("");
    setShowAddressSelection(false);
    setIsCustomAddress(false);
    setCustomAddress("");
    setResultProfile(null);
    setResultSessionKey(null);
    setLinkConflict(null);
    setCheckingLink(false);
    setExistingPatient(null);
    setLoadingExistingPatient(false);
    setSavingToDb(false);
    setCardSessionKey(null);
    setDocType("DRIVING_LICENCE");
    setDocId("");
    setDocMobile(initialMobile);
    setDocOtpSystem("abdm");
    setDocSessionKey(null);
    setDocOtp("");
    setDocOtpSent(false);
    setDocOtpMessage(null);
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
    setIsCardPreviewOpen(false);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const isSessionExpiredError = (error: any) => getAbhaError(error).code === "SESSION_EXPIRED";

  /**
   * Ask the server whether this ABHA is already linked to someone else. Fails open: a
   * pre-check outage must never block a legitimate enrollment, and the sync endpoint plus the
   * DB unique index remain the real authority.
   */
  const runLinkPrecheck = async (sessionKey: string, currentProfile?: AbhaProfileDto | null) => {
    setCheckingLink(true);
    setLoadingExistingPatient(true);
    try {
      const result = await abhaApi.checkLinkConflict({
        session_key: sessionKey,
        patient_id: patientId ?? null,
      });
      setLinkConflict(result);

      let foundPatient: Patient | null = null;
      if (result.conflict_patient_id) {
        try {
          const apiPatient = await patientsApi.getById(result.conflict_patient_id);
          foundPatient = patientsApi.mapToPatients([apiPatient])[0] || null;
        } catch (err) {
          console.warn("Failed to fetch conflict patient by ID:", err);
        }
      } else if (result.conflict_patient_uhid) {
        try {
          const apiPatient = await patientsApi.getByUhid(result.conflict_patient_uhid);
          foundPatient = patientsApi.mapToPatients([apiPatient])[0] || null;
        } catch (err) {
          console.warn("Failed to fetch conflict patient by UHID:", err);
        }
      }

      // If no conflict_patient_id was returned, but we started from add-patient (patientId is omitted):
      // check whether a matching patient already exists in the hospital
      if (!foundPatient && !patientId) {
        const prof = currentProfile || resultProfile;
        if (prof) {
          try {
            if (prof.abha_number) {
              const res = await patientsApi.search({ abha_number: prof.abha_number, page_size: 1 });
              if (res.items && res.items.length > 0) {
                foundPatient = patientsApi.mapToPatients(res.items)[0];
              }
            }
            if (!foundPatient && prof.abha_address) {
              const res = await patientsApi.search({ abha_address: prof.abha_address, page_size: 1 });
              if (res.items && res.items.length > 0) {
                foundPatient = patientsApi.mapToPatients(res.items)[0];
              }
            }
            if (!foundPatient && prof.mobile && prof.mobile.length === 10) {
              const res = await patientsApi.search({ mobile: prof.mobile, page_size: 5 });
              if (res.items && res.items.length > 0) {
                if (res.items.length === 1) {
                  foundPatient = patientsApi.mapToPatients(res.items)[0];
                } else if (prof.name) {
                  const profNameClean = prof.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                  const matched = res.items.find((item) => {
                    const fullName = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return fullName && profNameClean && (fullName.includes(profNameClean) || profNameClean.includes(fullName));
                  });
                  foundPatient = matched ? patientsApi.mapToPatients([matched])[0] : patientsApi.mapToPatients(res.items)[0];
                } else {
                  foundPatient = patientsApi.mapToPatients(res.items)[0];
                }
              }
            }
          } catch (err) {
            console.warn("Patient lookup by ABHA/mobile failed:", err);
          }
        }
      }

      setExistingPatient(foundPatient);
    } catch (error) {
      console.warn("ABHA link pre-check failed; deferring to the sync call", error);
      setLinkConflict(null);
    } finally {
      setCheckingLink(false);
      setLoadingExistingPatient(false);
    }
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
        otp_system: aadhaarOtpSystem,
        consent_accepted: aadhaarConsentAccepted,
      });
      setSessionKey(res.session_key);
      setOtpSent(true);
      setAadhaarOtpMessage(res.message || "OTP sent to Aadhaar registered mobile");
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
    if (aadhaarMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyAadhaarOtp({
        session_key: sessionKey,
        otp,
        mobile: aadhaarMobile,
      });

      const enteredMobileClean = aadhaarMobile.replace(/\D/g, "").slice(-10);
      const resMobileClean = (res.profile?.mobile || "").replace(/\D/g, "");
      const isMasked = resMobileClean.length < 10;
      const isDifferentMobile = Boolean(
        resMobileClean &&
          (isMasked
            ? !enteredMobileClean.endsWith(resMobileClean)
            : enteredMobileClean !== resMobileClean.slice(-10))
      );

      // If ABDM returned no mobile (Aadhaar unlinked) OR the account exists with a different mobile:
      if (!res.profile?.mobile || isDifferentMobile) {
        setPendingEnrollmentResult(res);
        if (res.session_key) setSessionKey(res.session_key);
        setNeedsMobileVerification(true);
        if (isDifferentMobile && res.profile?.mobile) {
          toast.info("ABHA account exists with a different mobile number. Please verify to update.");
        } else {
          toast.info("Please verify the mobile number to continue enrollment");
        }
        return;
      }
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setSessionKey(null);
        setOtp("");
        setOtpSent(false);
        setAadhaarOtpMessage(null);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "OTP verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Aadhaar Mobile Verification (when ABDM returns no mobile on the profile)
  // --------------------------------------------------------------------------
  const handleRequestMobileVerifyOtp = async () => {
    if (!sessionKey) {
      toast.error("Your session has expired. Please start enrollment again.");
      return;
    }
    if (aadhaarMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.requestAadhaarMobileOtp({
        session_key: sessionKey,
        mobile: aadhaarMobile,
        otp_system: mobileVerifyOtpSystem,
      });
      setMobileOtpSent(true);
      const defaultMsg = `OTP sent to mobile number ${aadhaarMobile}`;
      const displayMsg =
        res.message && /\d/.test(res.message)
          ? res.message
          : (res.message ? `${res.message} (${aadhaarMobile})` : defaultMsg);
      setMobileVerifyOtpMessage(displayMsg);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileVerifyOtp = async () => {
    if (!sessionKey || !mobileOtp) {
      toast.error("Please enter OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.verifyAadhaarMobileOtp({
        session_key: sessionKey,
        otp: mobileOtp,
      });
      // Carry the verified mobile back onto the stashed enrollment result so the address
      // suggestions from the Aadhaar step aren't lost.
      const merged: AbhaEnrollmentResult = pendingEnrollmentResult
        ? {
            ...pendingEnrollmentResult,
            profile: {
              ...pendingEnrollmentResult.profile,
              ...res.profile,
              mobile: res.profile?.mobile || aadhaarMobile,
            },
          }
        : res;
      setNeedsMobileVerification(false);
      setMobileOtp("");
      setMobileOtpSent(false);
      setMobileVerifyOtpMessage(null);
      setPendingEnrollmentResult(null);
      toast.success(res.message || "Mobile number verified successfully");
      handleEnrollmentSuccess(merged);
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setMobileOtp("");
        setMobileOtpSent(false);
        setMobileVerifyOtpMessage(null);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "Mobile verification failed");
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
      const res = await abhaApi.requestDocumentOtp({
        mobile: docMobile,
        otp_system: docOtpSystem,
      });
      setDocSessionKey(res.session_key);
      setDocOtpSent(true);
      const defaultMsg = `OTP sent to mobile number ${docMobile}`;
      const displayMsg =
        res.message && /\d/.test(res.message)
          ? res.message
          : (res.message ? `${res.message} (${docMobile})` : defaultMsg);
      setDocOtpMessage(displayMsg);
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
      setDocOtpMessage(null);
      prefillDocumentFieldsFromExistingPatient();
      toast.success(res.message || "Mobile number verified successfully");
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setDocSessionKey(null);
        setDocOtp("");
        setDocOtpSent(false);
        setDocOtpMessage(null);
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
      toast.error("Please enter existing ABHA Number, Aadhaar Number, registered Mobile, or ABHA Address");
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
        otp_system: linkOtpSystem,
        consent_accepted: linkConsentAccepted,
      });
      setLinkSessionKey(res.session_key);
      setLinkOtpSent(true);
      const cleanMob = linkAbhaNumber.replace(/\D/g, "");
      const isMobile = cleanMob.length === 10;
      const defaultMsg = isMobile
        ? `OTP sent to mobile number ${cleanMob}`
        : "OTP sent to registered mobile number";
      const displayMsg =
        res.message && /\d/.test(res.message)
          ? res.message
          : isMobile
            ? (res.message ? `${res.message} (${cleanMob})` : defaultMsg)
            : (res.message || defaultMsg);
      setLinkOtpMessage(displayMsg);
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
      if (res.requires_selection && res.accounts && res.accounts.length > 1) {
        setLinkAccounts(res.accounts);
        setSelectedLinkAccount(res.accounts[0] || null);
        setShowAccountSelection(true);
        if (res.session_key) setLinkSessionKey(res.session_key);
        toast.info("Multiple ABHA accounts found for this mobile number. Please select an account.");
        return;
      }
      setLinkOtpMessage(null);
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setLinkSessionKey(null);
        setLinkOtp("");
        setLinkOtpSent(false);
        setLinkOtpMessage(null);
        setShowAccountSelection(false);
        setLinkAccounts([]);
        toast.error("Your OTP session has expired. Please request a new OTP.");
      } else {
        toast.error(getErrorMessage(error) || "Failed to verify link OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLinkAccount = async (account?: AbhaProfileDto) => {
    const targetAccount = account || selectedLinkAccount;
    if (!linkSessionKey || !targetAccount) {
      toast.error("Please select an ABHA account");
      return;
    }
    const identifier = targetAccount.abha_number || targetAccount.abha_address;
    if (!identifier) {
      toast.error("Selected account has no valid ABHA number or address");
      return;
    }
    setLoading(true);
    try {
      const res = await abhaApi.selectLinkAccount({
        session_key: linkSessionKey,
        abha_number: identifier,
      });
      setShowAccountSelection(false);
      handleEnrollmentSuccess(res);
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        setLinkSessionKey(null);
        setLinkOtp("");
        setLinkOtpSent(false);
        setShowAccountSelection(false);
        setLinkAccounts([]);
        toast.error("Your session has expired. Please request OTP again.");
      } else {
        toast.error(getErrorMessage(error) || "Failed to select ABHA account");
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
    if (res.cm_id) setCmId(res.cm_id);
    const effectiveSessionKey = res.session_key || sessionKey;
    const currentCmId = res.cm_id || cmId || ABDM_X_CM_ID || "sbx";

    // Linking existing ABHA or existing account with pre-set address skips address creation
    if (activeTab === "link_existing" || (!res.is_new_abha && res.profile?.abha_address)) {
      setResultProfile(res.profile || null);
      setResultSessionKey(effectiveSessionKey);
      setShowAddressSelection(false);
      toast.success(res.message || "ABHA profile retrieved successfully");
      if (effectiveSessionKey) void runLinkPrecheck(effectiveSessionKey, res.profile || null);
      return;
    }

    // Enrollment flows (Aadhaar OTP / DL): Always proceed to Address Selection step
    let suggestions = (res.suggested_addresses || []).map((addr) => addr.split("@")[0]);
    if (suggestions.length === 0 && res.profile) {
      const namePart = (res.profile.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const numPart = res.profile.mobile ? res.profile.mobile.slice(-4) : "";
      if (namePart) {
        suggestions = [
          `${namePart}`,
          `${namePart}${numPart}`,
          `${namePart}.1`,
        ];
      }
    }

    setSuggestedAddresses(suggestions);
    const rawDefault = res.auto_selected_address || suggestions[0] || (res.profile?.abha_address ?? "");
    const defaultAddr = rawDefault.split("@")[0];
    setSelectedAddress(defaultAddr);
    setIsCustomAddress(false);
    setCustomAddress("");
    setShowAddressSelection(true);
    setSessionKey(effectiveSessionKey);
    setResultProfile(res.profile || null);
    setResultSessionKey(effectiveSessionKey);
  };

  const handleConfirmAddress = async () => {
    const rawTarget = isCustomAddress ? customAddress.trim() : selectedAddress.trim();
    if (!sessionKey || !rawTarget) {
      toast.error("Please select or enter an ABHA address");
      return;
    }

    // Clean address format: strip spaces, lowercase, and any pre-existing @suffix
    const cleanTarget = rawTarget.toLowerCase().replace(/\s+/g, "");
    const handleOnly = cleanTarget.split("@")[0];

    if (isCustomAddress) {
      const validation = validateAbhaAddress(handleOnly);
      if (!validation.isValid) {
        toast.error(validation.error || "Please enter a valid custom ABHA address");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await abhaApi.confirmAddress({
        session_key: sessionKey,
        abha_address: handleOnly,
      });
      if (res.cm_id) setCmId(res.cm_id);
      setResultProfile(res.profile || null);
      setResultSessionKey(res.session_key || sessionKey);
      setShowAddressSelection(false);
      toast.success("ABHA address confirmed successfully");
      void runLinkPrecheck(res.session_key || sessionKey, res.profile || null);
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

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleCompleteAndSync = async () => {
    if (!resultProfile || !resultSessionKey) return;
    if (checkingLink || loadingExistingPatient || savingToDb) return;
    if (!existingPatient && !patientId && linkConflict?.can_link === false) return;

    setSavingToDb(true);
    try {
      let targetPatient: Patient | null = null;
      const targetId = existingPatient?.id || patientId;

      if (targetId) {
        // CASE 1: EXISTING PATIENT -> Sync ABHA details directly into database
        await abhaApi.syncToPatient(targetId, {
          session_key: resultSessionKey,
          sync_demographics: true,
          override_mismatch: true,
        });

        if (resultProfile.photo_base64) {
          try {
            await patientsApi.update(targetId, {
              photo_base64: resultProfile.photo_base64,
            });
          } catch (e) {
            console.warn("Failed to update patient photo:", e);
          }
        }

        const updatedApiPatient = await patientsApi.getById(targetId);
        targetPatient = patientsApi.mapToPatients([updatedApiPatient])[0] || null;

        queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(targetId) });
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        queryClient.invalidateQueries({ queryKey: ["patient", targetId] });

        toast.success("ABHA details successfully attached and saved to patient record!");
      } else {
        // CASE 2: NEW PATIENT -> Create patient directly in database and sync ABHA
        let firstName = "Patient";
        let lastName: string | null = null;
        if (resultProfile.name) {
          const parts = resultProfile.name.trim().split(/\s+/);
          firstName = parts[0] || "Patient";
          if (parts.length > 1) {
            lastName = parts.slice(1).join(" ");
          }
        }

        const normalizedDob = formatDobToIso(resultProfile.dob);
        const normalizedGender = normalizeGender(resultProfile.gender);
        const extractedMobile = (
          resultProfile.mobile ||
          aadhaarMobile ||
          docMobile ||
          (linkAbhaNumber.replace(/\D/g, "").length === 10 ? linkAbhaNumber.replace(/\D/g, "") : "") ||
          "9999999999"
        ).replace(/\D/g, "").slice(-10);

        const newPatientData: CreatePatientRequest = {
          first_name: firstName,
          last_name: lastName,
          mobile: extractedMobile,
          email: resultProfile.email?.trim() || null,
          date_of_birth: normalizedDob,
          gender: normalizedGender,
          address: resultProfile.address?.trim() || null,
          city: resultProfile.district?.trim() || null,
          state: resultProfile.state?.trim() || null,
          pincode: resultProfile.pincode?.trim() || null,
          category: "General",
          photo_base64: resultProfile.photo_base64 || null,
        };

        const createdApiPatient = await patientsApi.create(newPatientData);

        try {
          await abhaApi.syncToPatient(createdApiPatient.id, {
            session_key: resultSessionKey,
            sync_demographics: true,
            override_mismatch: true,
          });
        } catch (syncErr: any) {
          console.warn("ABHA sync to newly created patient warning:", syncErr);
        }

        const fullSavedPatient = await patientsApi.getById(createdApiPatient.id);
        targetPatient = patientsApi.mapToPatients([fullSavedPatient])[0];

        queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ["patients"] });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("patient:created", {
              detail: {
                patientId: targetPatient.id,
                patient: targetPatient,
              },
            })
          );
        }

        toast.success("Patient created and ABHA attached successfully!");
      }

      const profile = resultProfile;
      const sessionK = resultSessionKey;
      const aadhaar = aadhaarNumber || undefined;
      const finalPatient = targetPatient;

      resetState();
      onSuccess(profile, sessionK, aadhaar, finalPatient || undefined);
      onClose();
    } catch (err: any) {
      const { message } = getAbhaError(err, "Failed to attach ABHA to patient");
      toast.error(message, { duration: 8000 });
    } finally {
      setSavingToDb(false);
    }
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
          Enroll new patient or link existing ABHA profile
        </p>
      </div>
    </div>
  );

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleModalClose} title={modalTitle} size="lg" closeOnOutsideClick={false}>
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

        {/* STEP: Verify Mobile - ABDM returned no mobile or a different mobile on the enrolled profile */}
        {needsMobileVerification ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="text-xs space-y-1">
                {pendingEnrollmentResult?.profile?.mobile ? (
                  <>
                    <p className="font-semibold text-amber-900">
                      Account already exists with a different mobile number
                    </p>
                    <p>
                      ABHA registered mobile:{" "}
                      <span className="font-mono font-semibold text-amber-950">
                        {pendingEnrollmentResult.profile.mobile}
                      </span>
                    </p>
                    <p>
                      Entered mobile:{" "}
                      <span className="font-mono font-semibold text-amber-950">
                        {aadhaarMobile}
                      </span>
                    </p>
                    <p className="text-amber-700">
                      To update your ABHA profile mobile number to{" "}
                      <span className="font-mono font-semibold">{aadhaarMobile}</span>, verify it with an
                      OTP below, or continue with the currently registered mobile.
                    </p>
                  </>
                ) : (
                  <p>
                    This mobile number isn&apos;t the one registered with the Aadhaar record, so it
                    couldn&apos;t be linked automatically. Verify it with an OTP to finish enrollment.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {pendingEnrollmentResult?.profile?.mobile
                  ? "Mobile Number to Update in ABHA"
                  : "Mobile Number"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={aadhaarMobile}
                onChange={(e) => setAadhaarMobile(e.target.value.replace(/\D/g, ""))}
                disabled={mobileOtpSent}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
              />
            </div>

            {!mobileOtpSent ? (
              <>
                <OtpSystemSelector
                  value={mobileVerifyOtpSystem}
                  onChange={setMobileVerifyOtpSystem}
                  disabled={loading}
                  size="sm"
                />
                <div className="flex flex-col sm:flex-row gap-2.5">
                  {pendingEnrollmentResult?.profile?.mobile && (
                    <button
                      type="button"
                      onClick={() => {
                        const prevResult = pendingEnrollmentResult;
                        setNeedsMobileVerification(false);
                        setMobileOtp("");
                        setMobileOtpSent(false);
                        setPendingEnrollmentResult(null);
                        handleEnrollmentSuccess(prevResult);
                      }}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Keep Registered Mobile ({pendingEnrollmentResult.profile.mobile})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRequestMobileVerifyOtp}
                    disabled={loading || aadhaarMobile.length !== 10}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Send OTP</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <ResendableOtpField
                  value={mobileOtp}
                  onChange={setMobileOtp}
                  onResend={handleRequestMobileVerifyOtp}
                  disabled={loading}
                  autoFocus
                  startCooldownOnMount
                  otpSentMessage={mobileVerifyOtpMessage}
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOtpSent(false);
                      setMobileOtp("");
                      setMobileVerifyOtpMessage(null);
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Change Mobile Number
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyMobileVerifyOtp}
                    disabled={loading || !mobileOtp}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {pendingEnrollmentResult?.profile?.mobile
                        ? "Verify & Update Mobile"
                        : "Verify & Continue"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : /* STEP: Address Selection */
        showAddressSelection && resultProfile ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>ABHA Number Created: {resultProfile.abha_number || "Generated"}</span>
              </div>
              <p className="text-xs mt-1 text-emerald-700">
                Please select or create an ABHA address for this profile. You can choose one of the suggestions or create a custom one below.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Select or Create ABHA Address
              </label>
              {/* Suggestions List */}
              {suggestedAddresses.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
                  {suggestedAddresses.map((addr, idx) => {
                    const handle = addr.split("@")[0];
                    return (
                      <label
                        key={addr}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          !isCustomAddress && selectedAddress === handle
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="abha_address_choice"
                          value={handle}
                          checked={!isCustomAddress && selectedAddress === handle}
                          onChange={() => {
                            setIsCustomAddress(false);
                            setSelectedAddress(handle);
                          }}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="font-medium text-slate-900 text-sm">
                          {handle}
                        </span>
                        {idx === 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full ml-auto">
                            Recommended
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Custom Address Option */}
              <div
                className={`p-3.5 rounded-xl border transition-colors ${
                  isCustomAddress
                    ? "border-emerald-500 bg-emerald-50/30"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="abha_address_choice"
                    value="custom"
                    checked={isCustomAddress}
                    onChange={() => {
                      setIsCustomAddress(true);
                      if (!customAddress && suggestedAddresses[0]) {
                        const initHandle = suggestedAddresses[0]
                          .split("@")[0]
                          .toLowerCase()
                          .replace(/[^a-z0-9._]/g, "")
                          .slice(0, 18);
                        setCustomAddress(initHandle);
                      }
                    }}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-900">
                    Create custom ABHA address
                  </span>
                </label>

                {isCustomAddress && (
                  <div className="mt-3 pl-7 space-y-3">
                    {/* Custom Address Input with Suffix */}
                    <div>
                      <div className="flex rounded-lg shadow-sm">
                        <input
                          type="text"
                          value={customAddress}
                          onChange={(e) => {
                            const raw = e.target.value
                              .split("@")[0]
                              .toLowerCase()
                              .replace(/[^a-z0-9._]/g, "")
                              .slice(0, 18);
                            setCustomAddress(raw);
                          }}
                          placeholder="e.g. rahul.sharma"
                          maxLength={18}
                          autoFocus
                          className={`block w-full min-w-0 rounded-l-lg border px-3.5 py-2 text-sm transition-colors focus:outline-none focus:ring-1 ${
                            customAddress && !customAddressValidation.isValid
                              ? "border-amber-300 bg-amber-50/20 text-slate-900 focus:border-amber-500 focus:ring-amber-500"
                              : customAddress && customAddressValidation.isValid
                              ? "border-emerald-500 bg-emerald-50/20 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                              : "border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                          }`}
                        />
                        <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600 select-none">
                          @{cmId || "sbx"}
                        </span>
                      </div>
                    </div>

                    {/* ABHA Address Policy & Validation Rules Box (ABDM CRT_ABHA_112) */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
                        <span className="font-semibold text-slate-700">
                          ABHA Address Policy & Validation Rules
                        </span>
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            customAddress.length === 0
                              ? "bg-slate-200 text-slate-600"
                              : customAddressValidation.isValid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {customAddress.length} / 18 chars
                        </span>
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {/* Rule 1: Min 8 chars */}
                        <li className="flex items-center gap-2">
                          {customAddress.length === 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                          ) : customAddressValidation.ruleStatuses.minLength ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={
                              customAddress.length > 0 && customAddressValidation.ruleStatuses.minLength
                                ? "text-emerald-700 font-medium"
                                : customAddress.length > 0 && !customAddressValidation.ruleStatuses.minLength
                                ? "text-amber-700 font-medium"
                                : ""
                            }
                          >
                            1. Minimum length: <strong>8 characters</strong>
                          </span>
                        </li>

                        {/* Rule 2: Max 18 chars */}
                        <li className="flex items-center gap-2">
                          {customAddress.length === 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                          ) : customAddressValidation.ruleStatuses.maxLength ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          )}
                          <span
                            className={
                              customAddress.length > 0 && customAddressValidation.ruleStatuses.maxLength
                                ? "text-emerald-700 font-medium"
                                : ""
                            }
                          >
                            2. Maximum length: <strong>18 characters</strong>
                          </span>
                        </li>

                        {/* Rule 3: Special characters allowed - 1 dot (.) and/or 1 underscore (_) */}
                        <li className="flex items-center gap-2">
                          {customAddress.length === 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                          ) : customAddressValidation.ruleStatuses.specialCharCount ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          )}
                          <span
                            className={
                              customAddress.length > 0 && customAddressValidation.ruleStatuses.specialCharCount
                                ? "text-emerald-700 font-medium"
                                : customAddress.length > 0 && !customAddressValidation.ruleStatuses.specialCharCount
                                ? "text-rose-600 font-medium"
                                : ""
                            }
                          >
                            3. Special characters allowed: <strong>at most 1 dot (.) and/or 1 underscore (_)</strong>
                          </span>
                        </li>

                        {/* Rule 4: Dot and underscore in between */}
                        <li className="flex items-center gap-2">
                          {customAddress.length === 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                          ) : customAddressValidation.ruleStatuses.inBetween ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          )}
                          <span
                            className={
                              customAddress.length > 0 && customAddressValidation.ruleStatuses.inBetween
                                ? "text-emerald-700 font-medium"
                                : customAddress.length > 0 && !customAddressValidation.ruleStatuses.inBetween
                                ? "text-rose-600 font-medium"
                                : ""
                            }
                          >
                            4. Dot and underscore must be <strong>in between</strong> (cannot be at the beginning or end)
                          </span>
                        </li>

                        {/* Rule 5: Alphanumeric */}
                        <li className="flex items-center gap-2">
                          {customAddress.length === 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                          ) : customAddressValidation.ruleStatuses.alphanumeric ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          )}
                          <span
                            className={
                              customAddress.length > 0 && customAddressValidation.ruleStatuses.alphanumeric
                                ? "text-emerald-700 font-medium"
                                : ""
                            }
                          >
                            5. Alphanumeric: <strong>only numbers, only letters, or any combination allowed</strong>
                          </span>
                        </li>
                      </ul>

                      {/* Live Feedback Messages */}
                      {customAddress.length > 0 && !customAddressValidation.isValid && customAddressValidation.error && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 text-amber-700 text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>{customAddressValidation.error}</span>
                        </div>
                      )}

                      {customAddress.length > 0 && customAddressValidation.isValid && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 text-emerald-700 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>
                            Valid ABHA Address: <span className="font-mono">{customAddress}@{cmId || "sbx"}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                disabled={
                  loading ||
                  (isCustomAddress ? !customAddressValidation.isValid : !selectedAddress)
                }
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
                  {resultProfile.email && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">Email Address</span>
                      <p className="font-medium text-slate-800 text-base truncate">
                        {resultProfile.email}
                      </p>
                    </div>
                  )}
                  {(resultProfile.address || resultProfile.district || resultProfile.state || resultProfile.pincode) && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-400 font-medium block">Address</span>
                      <p className="font-medium text-slate-800 text-sm">
                        {[
                          resultProfile.address,
                          resultProfile.district,
                          resultProfile.state,
                          resultProfile.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Existing patient found: show info banner that they can attach to this patient */}
            {existingPatient && (
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
                <Users className="h-5 w-5 shrink-0 mt-0.5 text-sky-600" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Existing Patient Found in Records</p>
                  <p className="text-xs text-sky-800">
                    Patient <strong>{existingPatient.name}</strong> (UHID:{" "}
                    <span className="font-mono font-semibold">{existingPatient.healthId || linkConflict?.conflict_patient_uhid}</span>
                    {existingPatient.mobile ? `, Mobile: ${existingPatient.mobile}` : ""}) already exists in hospital records.
                  </p>
                  <p className="text-xs text-sky-700">
                    Click <strong>&ldquo;Attach ABHA to Patient&rdquo;</strong> below to save and attach this ABHA profile directly to their record.
                  </p>
                </div>
              </div>
            )}

            {/* Blocking: this ABHA already belongs to another patient in this hospital (and could not load patient object). */}
            {!existingPatient && !patientId && linkConflict?.can_link === false && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">This ABHA cannot be attached</p>
                  <p className="text-xs">{linkConflict.message}</p>
                  {linkConflict.conflict_patient_uhid && (
                    <p className="text-xs">
                      Open patient{" "}
                      <span className="font-semibold">{linkConflict.conflict_patient_uhid}</span> to
                      review the existing record, or use &ldquo;Start Over&rdquo; to attach a
                      different ABHA.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Non-blocking advisories: an unverified legacy record carries the same ABHA, or
                the profile's DOB/gender differ from the patient this is being attached to. */}
            {!existingPatient && linkConflict?.can_link !== false && linkConflict?.warning && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs">{linkConflict.warning}</p>
              </div>
            )}
            {linkConflict?.can_link !== false && identityMismatches.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold">
                    This ABHA profile doesn&apos;t match the patient&apos;s record:
                  </p>
                  <ul className="list-disc pl-4 text-xs">
                    {identityMismatches.map((mismatch) => (
                      <li key={mismatch}>{mismatch}</li>
                    ))}
                  </ul>
                  <p className="text-xs">
                    Confirm this is the correct patient &mdash; an admin may need to override.
                  </p>
                </div>
              </div>
            )}

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
                disabled={checkingLink || loadingExistingPatient || savingToDb || (!existingPatient && !patientId && linkConflict?.can_link === false)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {(checkingLink || loadingExistingPatient || savingToDb) && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {savingToDb
                    ? "Attaching & Saving…"
                    : checkingLink || loadingExistingPatient
                    ? "Checking…"
                    : "Attach ABHA to Patient"}
                </span>
                {!checkingLink && !loadingExistingPatient && !savingToDb && <ArrowRight className="h-4 w-4" />}
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

                {!otpSent ? (
                  <>
                    <OtpSystemSelector
                      value={aadhaarOtpSystem}
                      onChange={setAadhaarOtpSystem}
                      disabled={loading}
                      size="sm"
                    />
                    {/* Creating a new ABHA via Aadhaar — the full published
                        consent, all seven declarations. */}
                    <AbhaConsentPanel
                      variant="abha-creation"
                      checked={aadhaarConsentAccepted}
                      onChange={setAadhaarConsentAccepted}
                      disabled={loading}
                      beneficiaryName={initialName}
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
                      otpSentMessage={aadhaarOtpMessage}
                    />

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
                      <p className="mt-1 text-xs text-slate-400">
                        This number will be linked to the new ABHA. If it isn&apos;t the one registered
                        with Aadhaar, we&apos;ll ask you to verify it with a separate OTP.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setAadhaarOtpMessage(null);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Change Aadhaar
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyAadhaarOtp}
                        disabled={loading || !otp || aadhaarMobile.length !== 10}
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
                      <>
                        <OtpSystemSelector
                          value={docOtpSystem}
                          onChange={setDocOtpSystem}
                          disabled={loading}
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={handleRequestDocumentOtp}
                          disabled={loading || docMobile.length !== 10}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
                        >
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>Send OTP</span>
                        </button>
                      </>
                    ) : (
                      <div className="space-y-4 pt-2 border-t border-slate-100">
                        <ResendableOtpField
                          value={docOtp}
                          onChange={setDocOtp}
                          onResend={handleRequestDocumentOtp}
                          disabled={loading}
                          autoFocus
                          startCooldownOnMount
                          otpSentMessage={docOtpMessage}
                        />

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDocOtpSent(false);
                              setDocOtp("");
                              setDocOtpMessage(null);
                            }}
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
                {showAccountSelection && linkAccounts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sky-900">
                      <Users className="h-5 w-5 shrink-0 text-sky-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-sky-900">
                          Multiple ABHA Accounts Found ({linkAccounts.length})
                        </h4>
                        <p className="text-xs text-sky-700 mt-0.5">
                          Multiple ABHA profiles are registered with mobile number <strong>{linkAbhaNumber}</strong>. Please select the account for <strong>{initialName || "this patient"}</strong> to proceed.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {linkAccounts.map((acc, idx) => {
                        const isSelected = selectedLinkAccount?.abha_number
                          ? selectedLinkAccount.abha_number === acc.abha_number
                          : selectedLinkAccount?.abha_address === acc.abha_address || idx === 0;
                        const key = acc.abha_number || acc.abha_address || `acc-${idx}`;

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedLinkAccount(acc)}
                            className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                              isSelected
                                ? "border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-500/20"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200 overflow-hidden">
                                {acc.photo_base64 ? (
                                  <img
                                    src={
                                      acc.photo_base64.startsWith("data:")
                                        ? acc.photo_base64
                                        : `data:image/jpeg;base64,${acc.photo_base64}`
                                    }
                                    alt={acc.name || "Profile"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : acc.name ? (
                                  acc.name.charAt(0).toUpperCase()
                                ) : (
                                  <User className="h-5 w-5 text-slate-500" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 text-sm truncate">
                                    {acc.name || "Unnamed Profile"}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    <BadgeCheck className="h-3 w-3 text-emerald-600" />
                                    Verified
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                  {acc.abha_number && (
                                    <span className="font-mono text-slate-700 font-medium">
                                      ABHA: {formatAbhaOrMobileInput(acc.abha_number)}
                                    </span>
                                  )}
                                  {acc.abha_address && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">
                                      {acc.abha_address}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  {acc.gender && (
                                    <span>
                                      Gender: {acc.gender === "M" ? "Male" : acc.gender === "F" ? "Female" : acc.gender}
                                    </span>
                                  )}
                                  {acc.gender && acc.dob && <span>•</span>}
                                  {acc.dob && <span>DOB: {acc.dob}</span>}
                                </div>
                              </div>

                              <div className="flex items-center self-center pl-2">
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                    isSelected
                                      ? "border-sky-600 bg-sky-600 text-white"
                                      : "border-slate-300 bg-white group-hover:border-slate-400"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountSelection(false);
                          setLinkAccounts([]);
                        }}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to OTP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectLinkAccount()}
                        disabled={loading || !selectedLinkAccount}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>Link Selected ABHA Profile</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ABHA Number, Aadhaar Number, Registered Mobile, or ABHA Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={linkAbhaNumber}
                        onChange={(e) => {
                          const val = formatAbhaLinkInput(e.target.value);
                          setLinkAbhaNumber(val);
                          const digits = val.replace(/\D/g, "");
                          if (/[a-zA-Z@]/.test(val)) {
                            // ABHA Address: default to abdm (mobile OTP) if not already chosen
                          } else if (digits.length === 10) {
                            setLinkOtpSystem("abdm");
                          } else if (digits.length === 12) {
                            setLinkOtpSystem("aadhaar");
                          } else if (digits.length === 14) {
                            setLinkOtpSystem("aadhaar");
                          }
                        }}
                        disabled={linkOtpSent}
                        placeholder="e.g. 12-3456-7890-1234, 1234 5678 9012, 9876543210, or name@abdm"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                      />
                    </div>

                    {!linkOtpSent ? (
                      <>
                        <OtpSystemSelector
                          value={linkOtpSystem}
                          onChange={setLinkOtpSystem}
                          disabled={loading}
                          size="sm"
                        />
                        {/* Linking an ABHA that already exists — nothing is
                            being created, so the creation-specific declarations
                            do not apply. */}
                        <AbhaConsentPanel
                          variant="aadhaar-authentication"
                          checked={linkConsentAccepted}
                          onChange={setLinkConsentAccepted}
                          disabled={loading}
                          beneficiaryName={initialName}
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
                          otpSentMessage={linkOtpMessage}
                        />

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setLinkOtpSent(false);
                              setLinkOtp("");
                              setLinkOtpMessage(null);
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Change Identifier
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
                  </>
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
