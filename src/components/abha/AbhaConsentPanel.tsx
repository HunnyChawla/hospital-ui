"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import { Check, AlertCircle } from "lucide-react";

export type ConsentVariant =
    /** Creating a new ABHA via Aadhaar. The full published consent. */
    | "abha-creation"
    /**
     * Any other Aadhaar-OTP flow — downloading a card, linking an ABHA that
     * already exists.
     */
    | "aadhaar-authentication";

export interface AbhaConsentPanelProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    variant?: ConsentVariant;
    /** The patient's name, for item 7. If empty or not provided, an optional inline input field is shown. */
    beneficiaryName?: string;
    /** Callback when the user enters or changes the optional beneficiary name manually. */
    onBeneficiaryNameChange?: (name: string) => void;
    /**
     * Called when the user ticks item 2 — "using a document other than Aadhaar".
     */
    onChooseOtherDocument?: () => void;
}

/**
 * Item 1 — Aadhaar / VID authentication. Transcribed verbatim.
 */
const AADHAAR_DECLARATION =
    "I am voluntarily sharing my Aadhaar Number / Virtual ID issued by the Unique " +
    "Identification Authority of India (“UIDAI”), and my demographic information " +
    "for the purpose of creating an Ayushman Bharat Health Account number (“ABHA " +
    "number”) and Ayushman Bharat Health Account address (“ABHA Address”). I " +
    "authorize NHA to use my Aadhaar number / Virtual ID for performing Aadhaar based " +
    "authentication with UIDAI as per the provisions of the Aadhaar (Targeted Delivery " +
    "of Financial and other Subsidies, Benefits and Services) Act, 2016 for the " +
    "aforesaid purpose. I understand that UIDAI will share my e-KYC details, or " +
    "response of “Yes” with NHA upon successful authentication.";

const OTHER_DOCUMENT_DECLARATION =
    "I intend to create Ayushman Bharat Health Account Number (“ABHA number”) and " +
    "Ayushman Bharat Health Account address (“ABHA Address”) using document other " +
    "than Aadhaar.";

// Items 3 and 5 as published say "government health records". Stripped here for private entities.
const LINKING_DECLARATION =
    "I consent to usage of my ABHA address and ABHA number for linking of my legacy " +
    "(past) health records and those which will be generated during this encounter.";

const SHARING_DECLARATION =
    "I authorize the sharing of all my health records with healthcare provider(s) for " +
    "the purpose of providing healthcare services to me during this encounter.";

const ANONYMISATION_DECLARATION =
    "I consent to the anonymization and subsequent use of my health records for public " +
    "health purposes.";

export function AbhaConsentPanel({
    checked: _checked,
    onChange,
    disabled = false,
    variant = "abha-creation",
    beneficiaryName,
    onBeneficiaryNameChange,
    onChooseOtherDocument,
}: AbhaConsentPanelProps) {
    const workerName = useAppSelector((state) => state.auth.userDetails?.full_name);
    const creating = variant === "abha-creation";

    // Internal state for each declaration checkbox: NOT pre-selected by default
    const [item1, setItem1] = useState(false);
    const [item2, setItem2] = useState(false); // Optional
    const [item3, setItem3] = useState(false);
    const [item4, setItem4] = useState(false);
    const [item5, setItem5] = useState(false);
    const [item6, setItem6] = useState(false);
    const [item7, setItem7] = useState(false);

    // Optional manual beneficiary name state if not passed from parent
    const [manualBeneficiaryName, setManualBeneficiaryName] = useState("");

    const effectiveName = beneficiaryName?.trim() || manualBeneficiaryName.trim();
    const beneficiaryDisplayName = effectiveName || "the beneficiary named above";
    const showManualNameField = !beneficiaryName?.trim();

    // Check whether all mandatory checkboxes are selected (Item 2 is optional)
    const isAllMandatoryChecked = creating
        ? Boolean(item1 && item3 && item4 && item5 && item6 && item7)
        : Boolean(item1 && item6 && item7);

    const requiredCount = creating ? 6 : 3;
    const checkedRequiredCount = creating
        ? [item1, item3, item4, item5, item6, item7].filter(Boolean).length
        : [item1, item6, item7].filter(Boolean).length;

    const handleToggleItem = (itemNum: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
        if (disabled) return;
        if (itemNum === 2 && onChooseOtherDocument) {
            onChooseOtherDocument();
            return;
        }

        const next1 = itemNum === 1 ? !item1 : item1;
        const next2 = itemNum === 2 ? !item2 : item2;
        const next3 = itemNum === 3 ? !item3 : item3;
        const next4 = itemNum === 4 ? !item4 : item4;
        const next5 = itemNum === 5 ? !item5 : item5;
        const next6 = itemNum === 6 ? !item6 : item6;
        const next7 = itemNum === 7 ? !item7 : item7;

        if (itemNum === 1) setItem1(next1);
        if (itemNum === 2) setItem2(next2);
        if (itemNum === 3) setItem3(next3);
        if (itemNum === 4) setItem4(next4);
        if (itemNum === 5) setItem5(next5);
        if (itemNum === 6) setItem6(next6);
        if (itemNum === 7) setItem7(next7);

        const allMandatory = creating
            ? Boolean(next1 && next3 && next4 && next5 && next6 && next7)
            : Boolean(next1 && next6 && next7);

        onChange(allMandatory);
    };

    const handleToggleAllMandatory = () => {
        if (disabled) return;
        const target = !isAllMandatoryChecked;
        setItem1(target);
        setItem3(target);
        setItem4(target);
        setItem5(target);
        setItem6(target);
        setItem7(target);

        const allMandatory = target;
        onChange(allMandatory);
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-800">I hereby declare that:</p>
                    <p className="text-[11px] text-slate-500">
                        {checkedRequiredCount} of {requiredCount} required declarations selected
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleToggleAllMandatory}
                    disabled={disabled}
                    className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50 transition-colors shadow-2xs"
                >
                    {isAllMandatoryChecked ? "Deselect All" : "Select All Required"}
                </button>
            </div>

            <div className="space-y-2.5">
                {/* 1. Aadhaar Declaration (Mandatory) */}
                <ConsentItem
                    checked={item1}
                    disabled={disabled}
                    onToggle={() => handleToggleItem(1)}
                    required
                    text={AADHAAR_DECLARATION}
                />

                {/* 2. Other Document (Optional) */}
                {creating && (
                    <ConsentItem
                        checked={item2}
                        disabled={disabled}
                        onToggle={() => handleToggleItem(2)}
                        optional
                        text={
                            OTHER_DOCUMENT_DECLARATION +
                            (onChooseOtherDocument ? " (Click to switch to other document registration.)" : "")
                        }
                    />
                )}

                {/* 3. Linking Declaration (Mandatory) */}
                {creating && (
                    <ConsentItem
                        checked={item3}
                        disabled={disabled}
                        onToggle={() => handleToggleItem(3)}
                        required
                        text={LINKING_DECLARATION}
                    />
                )}

                {/* 4. Sharing Declaration (Mandatory) */}
                {creating && (
                    <ConsentItem
                        checked={item4}
                        disabled={disabled}
                        onToggle={() => handleToggleItem(4)}
                        required
                        text={SHARING_DECLARATION}
                    />
                )}

                {/* 5. Anonymisation Declaration (Mandatory) */}
                {creating && (
                    <ConsentItem
                        checked={item5}
                        disabled={disabled}
                        onToggle={() => handleToggleItem(5)}
                        required
                        text={ANONYMISATION_DECLARATION}
                    />
                )}

                {/* 6. Staff Declaration (Mandatory) */}
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 pt-1 border-t border-slate-200">
                    <input
                        type="checkbox"
                        checked={item6}
                        onChange={() => handleToggleItem(6)}
                        disabled={disabled}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>
                        I,{" "}
                        <strong className="font-semibold text-slate-900">
                            {workerName || "the logged-in user"}
                        </strong>
                        , confirm that I have duly informed and explained the beneficiary of the
                        contents of consent for aforementioned purposes. <span className="text-red-500 font-semibold">*</span>
                    </span>
                </label>

                {/* 7. Beneficiary Consent (Mandatory with inline name input) */}
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                    <input
                        type="checkbox"
                        checked={item7}
                        onChange={() => handleToggleItem(7)}
                        disabled={disabled}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="leading-relaxed">
                        I,{" "}
                        {showManualNameField ? (
                            <input
                                id="beneficiary-name-manual"
                                type="text"
                                value={manualBeneficiaryName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setManualBeneficiaryName(val);
                                    onBeneficiaryNameChange?.(val);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                disabled={disabled}
                                placeholder="Beneficiary name (optional)"
                                className="inline-block mx-1 my-0.5 w-44 sm:w-52 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500 align-baseline font-medium"
                            />
                        ) : (
                            <strong className="font-semibold text-slate-900">
                                {beneficiaryDisplayName}
                            </strong>
                        )}
                        , have been explained about the consent as stated above and hereby provide
                        my consent for the aforementioned purposes. <span className="text-red-500 font-semibold">*</span>
                    </span>
                </label>
            </div>

            {/* Validation status badge */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                {isAllMandatoryChecked ? (
                    <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        Consent declarations accepted
                    </p>
                ) : (
                    <p className="text-amber-700 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        Please check all required declarations (*) to enable OTP
                    </p>
                )}
            </div>
        </div>
    );
}

function ConsentItem({
    checked,
    disabled = false,
    text,
    onToggle,
    required = false,
    optional = false,
}: {
    checked: boolean;
    disabled?: boolean;
    text: string;
    onToggle: () => void;
    required?: boolean;
    optional?: boolean;
}) {
    return (
        <label
            className={`flex items-start gap-2 text-[11px] leading-relaxed text-slate-600 select-none ${
                !disabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={onToggle}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>
                {text}
                {required && <span className="text-red-500 font-semibold ml-0.5">*</span>}
                {optional && <span className="text-slate-400 text-[10px] ml-1">(Optional)</span>}
            </span>
        </label>
    );
}
