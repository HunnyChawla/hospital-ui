"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Stethoscope,
  FlaskConical,
  Heart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Loader2,
  Save,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  ConsentStatus,
  FitnessStatus,
  InvestigationsStatus,
  PlannedSurgery,
  PreOpClearance,
  UpsertPreOpClearanceRequest,
} from "@/types";
import { preOpClearanceApi } from "@/services/preOpClearanceApi";
import { plannedSurgeriesApi } from "@/services/plannedSurgeriesApi";
import { getErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";

interface PreOpClearanceTabProps {
  plannedSurgery: PlannedSurgery;
  readOnly?: boolean;
  onRefresh?: () => void;
}

// ─── Status Badge Helpers ─────────────────────────────────────────────────────

const CONSENT_CONFIG: Record<ConsentStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  pending: { label: "Pending", icon: <Clock className="h-3.5 w-3.5" />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  signed: { label: "Signed ✓", icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  not_required: { label: "Not Required", icon: <Ban className="h-3.5 w-3.5" />, cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

const INV_CONFIG: Record<InvestigationsStatus, { label: string; cls: string }> = {
  not_ordered: { label: "Not Ordered", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  ordered: { label: "Ordered", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  cleared: { label: "Cleared ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  not_required: { label: "Not Required", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

const FITNESS_CONFIG: Record<FitnessStatus, { label: string; cls: string }> = {
  not_required: { label: "Not Required", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  cleared: { label: "Cleared ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  not_fit: { label: "Not Fit ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

function StatusBadge({ config }: { config: { label: string; cls: string; icon?: React.ReactNode } }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${config.cls}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Select Field ─────────────────────────────────────────────────────────────
function SelectField<T extends string>({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isSelected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              } disabled:opacity-50`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextareaField({
  label, value, onChange, placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-300 outline-none transition resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PreOpClearanceTab({ plannedSurgery, readOnly = false, onRefresh }: PreOpClearanceTabProps) {
  const [data, setData] = useState<PreOpClearance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [consentSignedBy, setConsentSignedBy] = useState("");
  const [consentWitness, setConsentWitness] = useState("");
  const [consentNotes, setConsentNotes] = useState("");
  const [invStatus, setInvStatus] = useState<InvestigationsStatus>("not_ordered");
  const [invNotes, setInvNotes] = useState("");
  const [cardiacStatus, setCardiacStatus] = useState<FitnessStatus>("not_required");
  const [cardiacBy, setCardiacBy] = useState("");
  const [cardiacNotes, setCardiacNotes] = useState("");
  const [anaesthesiaStatus, setAnaesthesiaStatus] = useState<FitnessStatus>("not_required");
  const [anaesthesiaBy, setAnaesthesiaBy] = useState("");
  const [anaesthesiaNotes, setAnaesthesiaNotes] = useState("");
  const [clearingNotes, setClearingNotes] = useState("");

  useEffect(() => {
    setLoading(true);
    preOpClearanceApi
      .get(plannedSurgery.id)
      .then((rec) => {
        setData(rec);
        // Populate form from fetched data
        setConsentStatus(rec.consent_status);
        setConsentSignedBy(rec.consent_signed_by || "");
        setConsentWitness(rec.consent_witness || "");
        setConsentNotes(rec.consent_notes || "");
        setInvStatus(rec.investigations_status);
        setInvNotes(rec.investigations_notes || "");
        setCardiacStatus(rec.cardiac_fitness_status);
        setCardiacBy(rec.cardiac_fitness_by || "");
        setCardiacNotes(rec.cardiac_fitness_notes || "");
        setAnaesthesiaStatus(rec.anaesthesia_status);
        setAnaesthesiaBy(rec.anaesthesia_cleared_by || "");
        setAnaesthesiaNotes(rec.anaesthesia_notes || "");
        setClearingNotes(rec.clearing_notes || "");
      })
      .catch(() => toast.error("Could not load pre-op clearance data"))
      .finally(() => setLoading(false));
  }, [plannedSurgery.id]);

  const handleSave = async (markCleared?: boolean) => {
    setSaving(true);
    try {
      const payload: UpsertPreOpClearanceRequest = {
        consent_status: consentStatus,
        consent_signed_by: consentSignedBy || null,
        consent_witness: consentWitness || null,
        consent_notes: consentNotes || null,
        investigations_status: invStatus,
        investigations_notes: invNotes || null,
        cardiac_fitness_status: cardiacStatus,
        cardiac_fitness_by: cardiacBy || null,
        cardiac_fitness_notes: cardiacNotes || null,
        anaesthesia_status: anaesthesiaStatus,
        anaesthesia_cleared_by: anaesthesiaBy || null,
        anaesthesia_notes: anaesthesiaNotes || null,
        clearing_notes: clearingNotes || null,
        ...(markCleared !== undefined && { is_cleared_for_ot: markCleared }),
      };
      const updated = await preOpClearanceApi.upsert(plannedSurgery.id, payload);
      setData(updated);
      
      if (markCleared) {
        // Automatically transition the surgery status to "in_ot_preparation" (OT Ready)
        await plannedSurgeriesApi.update(plannedSurgery.id, {
          status: "in_ot_preparation"
        });
        toast.success("Marked as Cleared for OT ✓ (Status updated to OT Ready)");
      } else {
        toast.success("Pre-op clearance saved");
      }
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Loading pre-op data…</span>
      </div>
    );
  }

  const isCleared = data?.is_cleared_for_ot || false;
  const isTerminalStatus = ["surgery_completed", "cancelled_by_patient", "cancelled_by_hospital", "cancelled", "lost_to_followup"].includes(plannedSurgery.status);
  const isFieldsDisabled = isTerminalStatus || readOnly;

  return (
    <div className="space-y-5">
      {/* Read Only notice banner */}
      {readOnly && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <Info className="h-5 w-5 text-indigo-600 shrink-0" />
          <p className="text-xs font-medium text-indigo-800">
            Pre-op clearance is view-only here. Updates are managed by clinical staff on the Day Care screen.
          </p>
        </div>
      )}

      {/* Overall clearance banner */}
      {isCleared ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Cleared for OT</p>
            {data?.cleared_by && (
              <p className="text-xs text-emerald-700">By: {data.cleared_by} {data.cleared_at ? `· ${new Date(data.cleared_at).toLocaleString()}` : ""}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Pre-op clearance not yet completed</p>
        </div>
      )}

      {/* ─── Consent Section ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Consent</h4>
          <StatusBadge config={CONSENT_CONFIG[consentStatus]} />
        </div>
        <SelectField<ConsentStatus>
          label="Consent Status"
          value={consentStatus}
          options={[
            { value: "pending", label: "Pending" },
            { value: "signed", label: "Signed" },
            { value: "not_required", label: "Not Required" },
          ]}
          onChange={setConsentStatus}
          disabled={isFieldsDisabled}
        />
        {consentStatus === "signed" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Signed By</label>
              <input
                type="text"
                value={consentSignedBy}
                onChange={(e) => setConsentSignedBy(e.target.value)}
                placeholder="Patient / attendant name"
                disabled={isFieldsDisabled}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Witness</label>
              <input
                type="text"
                value={consentWitness}
                onChange={(e) => setConsentWitness(e.target.value)}
                placeholder="Witness name"
                disabled={isFieldsDisabled}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        )}
        <TextareaField
          label="Consent Notes"
          value={consentNotes}
          onChange={setConsentNotes}
          placeholder="Any special consent conditions or patient concerns"
          disabled={isFieldsDisabled}
        />
      </div>

      {/* ─── Investigations Section ───────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Pre-Op Investigations</h4>
          <StatusBadge config={INV_CONFIG[invStatus]} />
        </div>
        <SelectField<InvestigationsStatus>
          label="Investigations Status"
          value={invStatus}
          options={[
            { value: "not_ordered", label: "Not Ordered" },
            { value: "ordered", label: "Ordered / In Progress" },
            { value: "completed", label: "Completed (Awaiting Review)" },
            { value: "cleared", label: "Cleared" },
            { value: "not_required", label: "Not Required" },
          ]}
          onChange={setInvStatus}
          disabled={isFieldsDisabled}
        />
        <TextareaField
          label="Investigation Notes"
          value={invNotes}
          onChange={setInvNotes}
          placeholder="Lab test names, pending reports, abnormal findings"
          disabled={isFieldsDisabled}
        />
      </div>

      {/* ─── Cardiac Fitness ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Cardiac Fitness</h4>
          <StatusBadge config={FITNESS_CONFIG[cardiacStatus]} />
        </div>
        <SelectField<FitnessStatus>
          label="Cardiac Fitness Status"
          value={cardiacStatus}
          options={[
            { value: "not_required", label: "Not Required" },
            { value: "pending", label: "Pending" },
            { value: "cleared", label: "Cleared" },
            { value: "not_fit", label: "Not Fit" },
          ]}
          onChange={setCardiacStatus}
          disabled={isFieldsDisabled}
        />
        {cardiacStatus !== "not_required" && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cleared By (Doctor Name)</label>
            <input
              type="text"
              value={cardiacBy}
              onChange={(e) => setCardiacBy(e.target.value)}
              placeholder="Cardiologist name"
              disabled={isFieldsDisabled}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}
        <TextareaField
          label="Cardiac Notes"
          value={cardiacNotes}
          onChange={setCardiacNotes}
          placeholder="Echo findings, ECG report, cardiologist remarks"
          disabled={isFieldsDisabled}
        />
      </div>

      {/* ─── Anaesthesia Fitness ─────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-800">Anaesthesia Fitness</h4>
          <StatusBadge config={FITNESS_CONFIG[anaesthesiaStatus]} />
        </div>
        <SelectField<FitnessStatus>
          label="Anaesthesia Status"
          value={anaesthesiaStatus}
          options={[
            { value: "not_required", label: "Not Required" },
            { value: "pending", label: "Pending" },
            { value: "cleared", label: "Cleared" },
            { value: "not_fit", label: "Not Fit for GA" },
          ]}
          onChange={setAnaesthesiaStatus}
          disabled={isFieldsDisabled}
        />
        {anaesthesiaStatus !== "not_required" && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cleared By (Anaesthetist)</label>
            <input
              type="text"
              value={anaesthesiaBy}
              onChange={(e) => setAnaesthesiaBy(e.target.value)}
              placeholder="Anaesthetist name"
              disabled={isFieldsDisabled}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}
        <TextareaField
          label="Anaesthesia Notes"
          value={anaesthesiaNotes}
          onChange={setAnaesthesiaNotes}
          placeholder="GA/LA preference, allergy history, risk level"
          disabled={isFieldsDisabled}
        />
      </div>

      {/* ─── Actions ─────────────────────────────────────────── */}
      {!isFieldsDisabled && (
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>

          {!isCleared && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Mark Cleared for OT
            </button>
          )}
        </div>
      )}
    </div>
  );
}
