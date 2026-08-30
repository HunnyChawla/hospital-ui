"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  FileText,
  Printer,
  CheckCircle2,
  Calendar,
  Clock,
  Pill,
  Plus,
  Trash2,
  X,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  AutoFillDischargeSummary,
  DischargeMedicationItem,
  SaveDischargeSummaryRequest,
} from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { IpdDischargeSummaryPrint } from "./IpdDischargeSummaryPrint";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface IpdDischargeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  onSuccess?: () => void;
}

const STANDARD_CONDITIONS = [
  "Stable / Improved",
  "Recovered / Cured",
  "Satisfactory",
  "Stationary / Unchanged",
  "Deteriorated / Worsened",
  "Guarded / Critical",
  "Hemodynamically Unstable",
  "Transferred in Critical State",
  "Expired / Deceased",
];

export function IpdDischargeSummaryModal({
  isOpen,
  onClose,
  admissionId,
  onSuccess,
}: IpdDischargeSummaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summaryData, setSummaryData] = useState<AutoFillDischargeSummary | null>(null);

  // Editable Form State
  const [dischargeDate, setDischargeDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dischargeType, setDischargeType] = useState("normal");
  const [conditionAtDischarge, setConditionAtDischarge] = useState("Stable / Improved");
  const [isCustomCondition, setIsCustomCondition] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [clinicalCourse, setClinicalCourse] = useState("");
  const [admissionVitals, setAdmissionVitals] = useState("");
  const [dischargeVitals, setDischargeVitals] = useState("");
  const [investigationsSummary, setInvestigationsSummary] = useState("");
  const [hospitalTreatment, setHospitalTreatment] = useState("");
  const [dischargeMeds, setDischargeMeds] = useState<DischargeMedicationItem[]>([]);
  const [dischargeAdvice, setDischargeAdvice] = useState("");
  const [dietAdvice, setDietAdvice] = useState("");
  const [activityAdvice, setActivityAdvice] = useState("");
  const [emergencyWarningSigns, setEmergencyWarningSigns] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [followupInstructions, setFollowupInstructions] = useState("");

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: summaryData ? `Discharge_Summary_${summaryData.admission_number}` : "Discharge_Summary",
  });

  // Load auto-fill data on modal open
  useEffect(() => {
    if (isOpen && admissionId) {
      const fetchAutoFill = async () => {
        setLoading(true);
        try {
          // Check if already finalized or fetch auto-fill
          const saved = await ipdDoctorApi.getDischargeSummary(admissionId);
          const autoData = await ipdDoctorApi.getDischargeSummaryAutoFill(admissionId);

          const source = saved || autoData;
          setSummaryData(autoData);

          setDischargeDate(
            saved ? String(saved.discharge_date) : String(autoData.discharge_date)
          );
          setDischargeType(source.discharge_type || "normal");
          const initCondition = source.condition_at_discharge || "Stable / Improved";
          setConditionAtDischarge(initCondition);
          setIsCustomCondition(!STANDARD_CONDITIONS.includes(initCondition));
          setFinalDiagnosis(source.final_diagnosis || autoData.final_diagnosis || "");
          setProvisionalDiagnosis(source.provisional_diagnosis || autoData.provisional_diagnosis || "");
          setChiefComplaints(source.chief_complaints || autoData.chief_complaints || "");
          setClinicalCourse(source.clinical_course || autoData.clinical_course || "");
          setAdmissionVitals(source.admission_vitals_summary || autoData.admission_vitals_summary || "");
          setDischargeVitals(source.discharge_vitals_summary || autoData.discharge_vitals_summary || "");
          setInvestigationsSummary(source.investigations_summary || autoData.investigations_summary || "");
          setHospitalTreatment(source.hospital_treatment_summary || autoData.hospital_treatment_summary || "");
          setDischargeMeds(
            (source.discharge_medications as DischargeMedicationItem[]) || autoData.discharge_medications || []
          );
          setDischargeAdvice(source.discharge_advice || autoData.discharge_advice || "");
          setDietAdvice(source.diet_advice || autoData.diet_advice || "");
          setActivityAdvice(source.activity_advice || autoData.activity_advice || "");
          setEmergencyWarningSigns(source.emergency_warning_signs || autoData.emergency_warning_signs || "");
          setFollowupDate(
            source.followup_date ? String(source.followup_date) : autoData.followup_date ? String(autoData.followup_date) : ""
          );
          setFollowupInstructions(source.followup_instructions || autoData.followup_instructions || "");
        } catch (err) {
          console.error("Failed to load discharge summary data", err);
          toast.error("Failed to auto-generate discharge summary data");
        } finally {
          setLoading(false);
        }
      };

      fetchAutoFill();
    }
  }, [isOpen, admissionId]);

  // Add empty discharge medication row
  const handleAddMedicationRow = () => {
    setDischargeMeds([
      ...dischargeMeds,
      {
        medicine_name: "",
        dose: "1 Tab",
        route: "Oral",
        frequency: "OD",
        duration: "5 days",
        timing: "After meals",
        instructions: "Take with water",
      },
    ]);
  };

  const handleRemoveMedicationRow = (index: number) => {
    setDischargeMeds(dischargeMeds.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof DischargeMedicationItem, value: string) => {
    const updated = [...dischargeMeds];
    updated[index] = { ...updated[index], [field]: value };
    setDischargeMeds(updated);
  };

  // Quick follow-up chip handlers
  const handleSetFollowupDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().slice(0, 10);
    setFollowupDate(dateStr);
    const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    setFollowupInstructions(`Review in OPD with ${summaryData?.doctor_name || "Doctor"} after ${days} days (${formatted}) or earlier if symptoms recur.`);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalDiagnosis.trim()) {
      toast.error("Please specify the final diagnosis");
      return;
    }

    setSaving(true);
    try {
      const payload: SaveDischargeSummaryRequest = {
        discharge_date: dischargeDate,
        discharge_type: dischargeType,
        condition_at_discharge: conditionAtDischarge,
        provisional_diagnosis: provisionalDiagnosis.trim() || null,
        final_diagnosis: finalDiagnosis.trim(),
        chief_complaints: chiefComplaints.trim() || null,
        clinical_course: clinicalCourse.trim() || null,
        admission_vitals_summary: admissionVitals.trim() || null,
        discharge_vitals_summary: dischargeVitals.trim() || null,
        investigations_summary: investigationsSummary.trim() || null,
        hospital_treatment_summary: hospitalTreatment.trim() || null,
        discharge_medications: dischargeMeds.filter((m) => m.medicine_name.trim()),
        discharge_advice: dischargeAdvice.trim() || null,
        diet_advice: dietAdvice.trim() || null,
        activity_advice: activityAdvice.trim() || null,
        emergency_warning_signs: emergencyWarningSigns.trim() || null,
        followup_date: followupDate || null,
        followup_instructions: followupInstructions.trim() || null,
      };

      await ipdDoctorApi.saveDischargeSummary(admissionId, payload);
      toast.success("Discharge Summary finalized and saved!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to save discharge summary");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Print payload preview
  const currentSummaryForPrint: AutoFillDischargeSummary | null = summaryData
    ? {
        ...summaryData,
        discharge_date: dischargeDate as any,
        discharge_type: dischargeType,
        condition_at_discharge: conditionAtDischarge,
        provisional_diagnosis: provisionalDiagnosis,
        final_diagnosis: finalDiagnosis,
        chief_complaints: chiefComplaints,
        clinical_course: clinicalCourse,
        admission_vitals_summary: admissionVitals,
        discharge_vitals_summary: dischargeVitals,
        investigations_summary: investigationsSummary,
        hospital_treatment_summary: hospitalTreatment,
        discharge_medications: dischargeMeds,
        discharge_advice: dischargeAdvice,
        diet_advice: dietAdvice,
        activity_advice: activityAdvice,
        emergency_warning_signs: emergencyWarningSigns,
        followup_date: followupDate as any,
        followup_instructions: followupInstructions,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-sm">
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Auto-Populated Inpatient Discharge Summary
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  Auto-Filled from Hospital Stay
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <strong className="text-slate-800">{summaryData?.patient_name}</strong> ({summaryData?.uhid}) • Admission #{summaryData?.admission_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Preview</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 mx-auto animate-spin rounded-full border-3 border-slate-200 border-t-sky-600" />
              <p className="text-sm font-semibold text-slate-700">
                Gathering hospital stay records, vitals, progress notes, and MAR...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Section 1: Quick Confirmations (Minimal Input) */}
            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span>⚡</span>
                <span>Discharge Status & Type</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Discharge Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dischargeDate}
                    onChange={(e) => setDischargeDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Discharge Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dischargeType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setDischargeType(newType);
                      if (newType === "deceased") {
                        setConditionAtDischarge("Expired / Deceased");
                        setIsCustomCondition(false);
                      } else if (conditionAtDischarge === "Expired / Deceased") {
                        setConditionAtDischarge("Stable / Improved");
                        setIsCustomCondition(false);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="normal">Normal / Planned Discharge</option>
                    <option value="ama">AMA (Against Medical Advice)</option>
                    <option value="lama">LAMA (Leave Against Medical Advice)</option>
                    <option value="transfer">Transferred to other facility</option>
                    <option value="deceased">Deceased</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Condition at Discharge <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={STANDARD_CONDITIONS.includes(conditionAtDischarge) ? conditionAtDischarge : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomCondition(true);
                        if (STANDARD_CONDITIONS.includes(conditionAtDischarge)) {
                          setConditionAtDischarge("");
                        }
                      } else {
                        setIsCustomCondition(false);
                        setConditionAtDischarge(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="Stable / Improved">Stable / Improved</option>
                    <option value="Recovered / Cured">Recovered / Cured</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Stationary / Unchanged">Stationary / Unchanged</option>
                    <option value="Deteriorated / Worsened">Deteriorated / Worsened</option>
                    <option value="Guarded / Critical">Guarded / Critical</option>
                    <option value="Hemodynamically Unstable">Hemodynamically Unstable</option>
                    <option value="Transferred in Critical State">Transferred in Critical State</option>
                    <option value="Expired / Deceased">Expired / Deceased</option>
                    <option value="custom">Other / Custom Condition...</option>
                  </select>
                  {isCustomCondition && (
                    <input
                      type="text"
                      placeholder="Specify custom condition at discharge..."
                      value={conditionAtDischarge}
                      onChange={(e) => setConditionAtDischarge(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-sky-300 bg-sky-50/50 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none font-semibold text-slate-900"
                      required
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Diagnosis */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Provisional / Initial Diagnosis
                </label>
                <input
                  type="text"
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                  placeholder="e.g. Acute febrile illness with LRTI"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Final Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  placeholder="e.g. Community Acquired Pneumonia - Resolved"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none bg-white"
                  required
                />
              </div>
            </div>

            {/* Section 3: Reason for Admission & Course in Hospital */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Chief Complaints & Reason for Admission
                </label>
                <input
                  type="text"
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-800">
                    Course in Hospital & Clinical Progress (Auto-Synthesized from SOAP Notes)
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">Editable summary</span>
                </div>
                <textarea
                  rows={4}
                  value={clinicalCourse}
                  onChange={(e) => setClinicalCourse(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Section 4: Vitals & Investigations Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <p className="font-bold text-slate-800">Vitals Summary (Admission vs Discharge)</p>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Admission Vitals:</span>
                  <input
                    type="text"
                    value={admissionVitals}
                    onChange={(e) => setAdmissionVitals(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Discharge Vitals:</span>
                  <input
                    type="text"
                    value={dischargeVitals}
                    onChange={(e) => setDischargeVitals(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <p className="font-bold text-slate-800">Investigations Summary</p>
                <textarea
                  rows={3}
                  value={investigationsSummary}
                  onChange={(e) => setInvestigationsSummary(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Section 5: Treatment Given (Hospital Stay) */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                In-Hospital Treatment Summary (from MAR Administrations)
              </label>
              <textarea
                rows={2}
                value={hospitalTreatment}
                onChange={(e) => setHospitalTreatment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Section 6: Discharge Medications (Rx on Discharge) */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900">
                    Discharge Medications (Rx on Discharge)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (Pre-filled from active medications)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddMedicationRow}
                  className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              {dischargeMeds.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No discharge medications added. Click &quot;Add Medicine&quot; to prescribe.
                </p>
              ) : (
                <div className="space-y-2">
                  {dischargeMeds.map((med, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center rounded-xl bg-slate-50 p-2 border border-slate-100"
                    >
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          value={med.medicine_name}
                          onChange={(e) => handleMedChange(idx, "medicine_name", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Dose (e.g. 500mg)"
                          value={med.dose}
                          onChange={(e) => handleMedChange(idx, "dose", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="text"
                          placeholder="Route"
                          value={med.route}
                          onChange={(e) => handleMedChange(idx, "route", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Freq (e.g. BD, OD)"
                          value={med.frequency}
                          onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none font-semibold text-emerald-800"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Duration (e.g. 5 days)"
                          value={med.duration}
                          onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="text"
                          placeholder="Timing"
                          value={med.timing || ""}
                          onChange={(e) => handleMedChange(idx, "timing", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicationRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 7: Discharge Advice & Instructions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Dietary Advice</label>
                <textarea
                  rows={2}
                  value={dietAdvice}
                  onChange={(e) => setDietAdvice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Physical Activity</label>
                <textarea
                  rows={2}
                  value={activityAdvice}
                  onChange={(e) => setActivityAdvice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">General Advice</label>
                <textarea
                  rows={2}
                  value={dischargeAdvice}
                  onChange={(e) => setDischargeAdvice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Emergency Warning Signs */}
            <div>
              <label className="block font-bold text-rose-800 mb-1">
                ⚠️ Emergency Warning Signs (When to seek immediate emergency care)
              </label>
              <input
                type="text"
                value={emergencyWarningSigns}
                onChange={(e) => setEmergencyWarningSigns(e.target.value)}
                className="w-full rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none text-rose-950 font-medium"
              />
            </div>

            {/* Section 8: Follow-up OPD Appointment */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-900">📅 Follow-up Appointment</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Quick chips:</span>
                  {[3, 5, 7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSetFollowupDays(d)}
                      className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 transition shadow-2xs"
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Follow-up Instructions
                  </label>
                  <input
                    type="text"
                    value={followupInstructions}
                    onChange={(e) => setFollowupInstructions(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Printer className="h-4 w-4" />
                <span>Print Document</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? "Saving..." : "Save & Finalize Discharge Summary"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Hidden printable content for react-to-print */}
        {currentSummaryForPrint && (
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
            <div ref={printRef} className="print-content">
              <IpdDischargeSummaryPrint summary={currentSummaryForPrint} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
