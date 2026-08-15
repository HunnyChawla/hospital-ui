"use client";

import React, { useState } from "react";
import {
    Search,
    Loader2,
    ShieldCheck,
    Users,
    ArrowLeft,
    BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/common/Modal";
import {
    abhaApi,
    type FindAbhaBy,
    type FoundAbhaAccount,
} from "@/services/abhaApi";
import { getAbhaError } from "@/utils/abhaErrors";

/**
 * Find a patient's ABHA at the registration desk.
 *
 * The patient cannot remember their ABHA. Staff search by mobile or Aadhaar,
 * the patient approves with an OTP on their own phone, and the desk gets it
 * back.
 *
 * ⚠️ ONE MOBILE OFTEN COVERS A WHOLE FAMILY.
 *
 * When it does, ABDM returns every account and the desk must ask which one is
 * the patient's. Picking the first would attach a mother's records to her son,
 * and nothing downstream would notice. So `requires_selection` gets its own
 * step in this component rather than being resolved silently — and the step
 * shows enough (name, gender, date of birth, masked number) for the patient to
 * recognise themselves.
 *
 * The OTP is not a formality. ABDM's Find ABHA that skips patient
 * authentication is restricted to government integrators and is not available
 * to us — which is also right: looking up someone's health identifier should
 * need them to agree.
 */

type Step = "search" | "otp" | "choose" | "done";

export interface FindAbhaModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called with the account the patient confirmed as theirs. */
    onFound: (account: FoundAbhaAccount) => void;
}

export function FindAbhaModal({ isOpen, onClose, onFound }: FindAbhaModalProps) {
    const [step, setStep] = useState<Step>("search");
    const [loading, setLoading] = useState(false);

    const [searchBy, setSearchBy] = useState<FindAbhaBy>("mobile");
    const [value, setValue] = useState("");
    const [otp, setOtp] = useState("");

    const [sessionKey, setSessionKey] = useState("");
    const [accounts, setAccounts] = useState<FoundAbhaAccount[]>([]);

    const reset = () => {
        setStep("search");
        setLoading(false);
        setValue("");
        setOtp("");
        setSessionKey("");
        setAccounts([]);
    };

    const close = () => {
        reset();
        onClose();
    };

    // Aadhaar is 12 digits, a mobile 10. Enforced here so a mistyped number
    // fails at the desk rather than as an opaque ABDM rejection.
    const expectedLength = searchBy === "aadhaar" ? 12 : 10;
    const canSearch = value.length === expectedLength;

    const handleSearch = async () => {
        setLoading(true);
        try {
            const started = await abhaApi.findRequestOtp({ search_by: searchBy, value });
            setSessionKey(started.session_key);
            setStep("otp");
            toast.success(started.message || "OTP sent to the patient's phone");
        } catch (e) {
            const { message } = getAbhaError(e, "Could not start the ABHA lookup");
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const found = await abhaApi.findVerifyOtp({ session_key: sessionKey, otp });

            if (found.accounts.length === 0) {
                toast.error("No ABHA is linked to that number");
                return;
            }

            setAccounts(found.accounts);

            // The server decides this, not the count — it knows the flow.
            if (found.requires_selection) {
                setStep("choose");
                return;
            }

            finish(found.accounts[0]);
        } catch (e) {
            const { message } = getAbhaError(e, "Could not verify the OTP");
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleChoose = async (account: FoundAbhaAccount) => {
        if (!account.abha_number) {
            toast.error("That account has no ABHA number to select");
            return;
        }
        setLoading(true);
        try {
            const confirmed = await abhaApi.findSelectAccount({
                session_key: sessionKey,
                abha_number: account.abha_number,
            });
            finish(confirmed.accounts[0] ?? account);
        } catch (e) {
            const { message } = getAbhaError(e, "Could not select that ABHA");
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const finish = (account: FoundAbhaAccount) => {
        setStep("done");
        onFound(account);
        toast.success(`Found ${account.name || "the patient"}'s ABHA`);
        close();
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title="Find patient's ABHA" size="md">
            <div className="space-y-5">
                {step === "search" && (
                    <>
                        <div className="flex gap-2">
                            {(["mobile", "aadhaar"] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        setSearchBy(option);
                                        setValue("");
                                    }}
                                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                                        searchBy === option
                                            ? "border-sky-500 bg-sky-50 text-sky-700"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {option === "mobile" ? "Mobile number" : "Aadhaar number"}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label
                                htmlFor="find-abha-value"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                {searchBy === "mobile" ? "Mobile number" : "Aadhaar number"}
                            </label>
                            <input
                                id="find-abha-value"
                                inputMode="numeric"
                                value={value}
                                onChange={(e) =>
                                    setValue(e.target.value.replace(/\D/g, "").slice(0, expectedLength))
                                }
                                placeholder={searchBy === "mobile" ? "9876543210" : "1234 5678 9012"}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                                The patient will receive an OTP on their own phone and must
                                approve the lookup.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={loading || !canSearch}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                            Send OTP
                        </button>
                    </>
                )}

                {step === "otp" && (
                    <>
                        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>Ask the patient to read out the OTP they just received.</span>
                        </div>

                        <div>
                            <label
                                htmlFor="find-abha-otp"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                OTP
                            </label>
                            <input
                                id="find-abha-otp"
                                inputMode="numeric"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="6-digit OTP"
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm tracking-widest focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep("search")}
                                disabled={loading}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleVerify}
                                disabled={loading || otp.length < 4}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Verify
                            </button>
                        </div>
                    </>
                )}

                {step === "choose" && (
                    <>
                        {/* ⚠️ The step that stops a mother's records reaching her son. */}
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <Users className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                <strong>{accounts.length} ABHAs</strong> are registered on this
                                number — families often share one phone. Ask the patient which is
                                theirs.
                            </span>
                        </div>

                        <ul className="space-y-2">
                            {accounts.map((account) => (
                                <li key={account.abha_number ?? account.abha_address}>
                                    <button
                                        type="button"
                                        onClick={() => handleChoose(account)}
                                        disabled={loading}
                                        className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {account.name || "Unnamed"}
                                                </p>
                                                {/* Enough to recognise yourself, without
                                                    reading a full ABHA number aloud at a
                                                    counter other patients can hear. */}
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {[
                                                        account.gender,
                                                        account.date_of_birth,
                                                        maskAbha(account.abha_number),
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            </div>
                                            {account.kyc_verified && (
                                                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </Modal>
    );
}

/**
 * `91-3408-6674-8437` → `XX-XXXX-XXXX-8437`.
 *
 * A registration counter is a public place. The last four digits are enough
 * for a patient to recognise their own account; the rest is theirs to keep.
 * ABDM's own guidance masks it the same way on the ABHA card.
 */
function maskAbha(abhaNumber?: string | null): string | null {
    if (!abhaNumber) return null;
    const digits = abhaNumber.replace(/\D/g, "");
    if (digits.length < 4) return null;
    return `XX-XXXX-XXXX-${digits.slice(-4)}`;
}
