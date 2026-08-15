"use client";

import { useAppSelector } from "@/redux/hooks";

/**
 * The NHA/UIDAI consent, as ABDM publishes it.
 *
 * SOURCE: the sandbox "Consent Language" page —
 * `ABDM_INTEGRATION_DOCS_PLANS/DOCS_SANDBOX_SITE/images/consent_language.png`.
 * The wording below is transcribed from that image, not paraphrased.
 *
 * ⚠️ REBUILT 8 Aug 2026. This component used to render ONE paragraph with ONE
 * checkbox — roughly ABDM's first declaration, expanded. Items 2 to 7 did not
 * exist. That mattered beyond an assessor's checklist: items 3 and 4 are the
 * patient-facing basis for linking records to their ABHA, which the product
 * does automatically on finalisation. No patient had ever been shown those
 * sentences.
 *
 * THE THREE PUBLISHED REQUIREMENTS, AND WHERE EACH IS HANDLED
 *
 *  1. "Private entities must remove the word 'government' from the consent."
 *     ABDM's items 3 and 5 contain it — "legacy (past) government health
 *     records", "my government health records". We are a private integrator,
 *     so both are stripped below. (An earlier audit recorded this as satisfied
 *     because the word was absent; it was absent only because those two items
 *     were absent.)
 *
 *  2. "Ensure that the second point is unchecked when ABHA is being created
 *     using Aadhaar." Item 2 is the "other than Aadhaar" branch selector. It is
 *     rendered — an assessor comparing screens should see seven items — and it
 *     is never pre-checked. Ticking it is how a user leaves the Aadhaar route,
 *     so it is wired to `onChooseOtherDocument` where that route exists.
 *
 *  3. "The beneficiary's name should reflect the patient's name dynamically."
 *     Items 6 and 7 carry names: the healthcare worker's, taken from the
 *     logged-in user, and the beneficiary's, passed in. Neither is typed by
 *     hand — a name someone can edit is not an attestation.
 *
 * NOT IN SCOPE (ABDM marks both "advised", not mandatory): the double-screen
 * setup with one display facing the patient, and rendering the consent in the
 * local language.
 */

export type ConsentVariant =
    /** Creating a new ABHA via Aadhaar. The full published consent. */
    | "abha-creation"
    /**
     * Any other Aadhaar-OTP flow — downloading a card, linking an ABHA that
     * already exists.
     *
     * A narrower set on purpose. The published consent governs *creation*:
     * items 2, 3 and 5 speak about creating an account and about linking
     * legacy records, and neither is true when someone is downloading their
     * card. Showing them would be asking for agreement to something that is
     * not happening. What still applies is the Aadhaar authentication itself
     * and the two attestations.
     */
    | "aadhaar-authentication";

interface AbhaConsentPanelProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    variant?: ConsentVariant;
    /** The patient's name, for item 7. Falls back to a neutral placeholder. */
    beneficiaryName?: string;
    /**
     * Called when the user ticks item 2 — "using a document other than
     * Aadhaar". Omit where there is no such route; the item then renders
     * unchecked and inert, which is what the requirement asks for anyway.
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

// Items 3 and 5 as published say "government health records". Stripped here —
// requirement (1). The rest is verbatim.
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
    checked,
    onChange,
    disabled = false,
    variant = "abha-creation",
    beneficiaryName,
    onChooseOtherDocument,
}: AbhaConsentPanelProps) {
    // The worker attests in their own name, so it comes from the session rather
    // than a prop — ABDM's wording is explicit that it depends on "the username
    // used for logging in into the system".
    // `userDetails` rather than `user`: the login response carries no name,
    // and it is fetched separately on session restore.
    const workerName = useAppSelector((state) => state.auth.userDetails?.full_name);

    const creating = variant === "abha-creation";
    const beneficiary = beneficiaryName?.trim() || "the beneficiary named above";

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">I hereby declare that:</p>

            <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                <ConsentItem checked disabled text={AADHAAR_DECLARATION} />

                {creating && (
                    <ConsentItem
                        // Requirement (2): never pre-checked on the Aadhaar route.
                        checked={false}
                        disabled={disabled || !onChooseOtherDocument}
                        onToggle={onChooseOtherDocument}
                        text={
                            OTHER_DOCUMENT_DECLARATION +
                            (onChooseOtherDocument ? " (Tick to proceed that way instead.)" : "")
                        }
                    />
                )}

                {creating && <ConsentItem checked disabled text={LINKING_DECLARATION} />}
                {creating && <ConsentItem checked disabled text={SHARING_DECLARATION} />}
                {creating && <ConsentItem checked disabled text={ANONYMISATION_DECLARATION} />}
            </div>

            {/* Items 6 and 7 — the two the staff member and the patient actually
                act on. Kept outside the scroll area so they cannot be missed. */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={disabled}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>
                        I,{" "}
                        <strong className="font-semibold">
                            {workerName || "the logged-in user"}
                        </strong>
                        , confirm that I have duly informed and explained the beneficiary of
                        the contents of consent for aforementioned purposes.
                    </span>
                </label>

                <p className="flex items-start gap-2 pl-[1.375rem] text-xs text-slate-600">
                    <span>
                        I, <strong className="font-semibold">{beneficiary}</strong>, have been
                        explained about the consent as stated above and hereby provide my
                        consent for the aforementioned purposes.
                    </span>
                </p>
            </div>
        </div>
    );
}

function ConsentItem({
    checked,
    disabled,
    text,
    onToggle,
}: {
    checked: boolean;
    disabled: boolean;
    text: string;
    onToggle?: () => void;
}) {
    return (
        <label
            className={`flex items-start gap-2 text-[11px] leading-relaxed text-slate-600 ${
                onToggle && !disabled ? "cursor-pointer" : ""
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                readOnly={!onToggle}
                disabled={disabled}
                onChange={() => onToggle?.()}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span>{text}</span>
        </label>
    );
}
