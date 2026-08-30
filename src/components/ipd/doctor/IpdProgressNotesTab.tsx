"use client";

import React, { useState } from "react";
import {
  FileText,
  PlusCircle,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Stethoscope,
  X,
} from "lucide-react";
import { IpdProgressNote } from "@/types/ipdDoctor";
import { ipdDoctorApi } from "@/services/ipdDoctorApi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorHandler";

interface IpdProgressNotesTabProps {
  admissionId: string;
  progressNotes: IpdProgressNote[];
  onRefresh: () => void;
}

export function IpdProgressNotesTab({
  admissionId,
  progressNotes,
  onRefresh,
}: IpdProgressNotesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [noteType, setNoteType] = useState<string>("doctor_daily");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteTime, setNoteTime] = useState(new Date().toISOString().slice(0, 16));
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim() && !notes.trim()) {
      toast.error("Please enter progress note content");
      return;
    }

    setSubmitting(true);
    try {
      await ipdDoctorApi.createProgressNote(admissionId, {
        note_type: noteType,
        note_date: noteDate,
        note_time: new Date(noteTime).toISOString(),
        subjective: subjective.trim() || null,
        objective: objective.trim() || null,
        assessment: assessment.trim() || null,
        plan: plan.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success("Progress note recorded successfully");
      setShowAddModal(false);
      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlan("");
      setNotes("");
      onRefresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err) || "Failed to save progress note");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDt = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Daily Progress Notes</h3>
              <p className="text-xs text-slate-500">
                Doctor rounds, clinical progress (SOAP), and nursing shift observations
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNoteDate(new Date().toISOString().slice(0, 10));
              setNoteTime(new Date().toISOString().slice(0, 16));
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Progress Note</span>
          </button>
        </div>

        {/* Progress Notes Timeline */}
        {progressNotes.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold">No progress notes recorded yet</p>
            <p className="text-[11px] text-slate-400">
              Click &quot;Create Progress Note&quot; to write today&apos;s round observations.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {progressNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:shadow-sm transition"
              >
                {/* Note Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 capitalize">
                      {note.note_type.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      By {note.author_name || "Doctor"}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500">
                    ⏱️ {formatDt(note.note_time || `${note.note_date}T00:00:00`)}
                  </span>
                </div>

                {/* SOAP Content */}
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  {note.subjective && (
                    <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                      <p className="font-bold text-purple-900 mb-1">
                        S: Subjective (Complaints)
                      </p>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.subjective}
                      </p>
                    </div>
                  )}

                  {note.objective && (
                    <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                      <p className="font-bold text-sky-900 mb-1">
                        O: Objective (Findings & Vitals)
                      </p>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.objective}
                      </p>
                    </div>
                  )}

                  {note.assessment && (
                    <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                      <p className="font-bold text-emerald-900 mb-1">
                        A: Assessment (Impression)
                      </p>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.assessment}
                      </p>
                    </div>
                  )}

                  {note.plan && (
                    <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                      <p className="font-bold text-indigo-900 mb-1">
                        P: Plan (Action Plan)
                      </p>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.plan}
                      </p>
                    </div>
                  )}
                </div>

                {note.notes && (
                  <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-800">Additional Remarks:</p>
                    <p className="mt-0.5">{note.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Daily Progress Note */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-slate-900">Create Daily Progress Note (SOAP)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="mt-4 space-y-4 text-xs">
              {/* Type and Timestamp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Note Type
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="doctor_daily">Doctor Daily Round (SOAP)</option>
                    <option value="nursing_shift">Nursing Shift Note</option>
                    <option value="consultant_round">Consultant Round</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={noteTime}
                    onChange={(e) => {
                      setNoteTime(e.target.value);
                      if (e.target.value) setNoteDate(e.target.value.slice(0, 10));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Subjective */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  S — Subjective (Patient symptoms, complaints, appetite, sleep)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient is feeling better today, afebrile, appetite improved, no nausea..."
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Objective */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  O — Objective (Vitals summary, physical examination, lab findings)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Temp 98.6°F, BP 120/80, Pulse 76/min, Chest: B/L clear, Abdomen soft, non-tender..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Assessment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  A — Assessment (Clinical progress, response to antibiotics/treatment)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Responding well to IV Ceftriaxone. Acute infection resolving satisfactorily..."
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  P — Plan (Diagnostic workup, therapy adjustments, discharge planning)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Continue IV antibiotics x 24h, shift to oral cefixime tomorrow, repeat CBC, plan discharge in 2 days..."
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* General Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Additional Remarks / Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Encouraged oral fluid intake; patient counseled..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:shadow disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Progress Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
