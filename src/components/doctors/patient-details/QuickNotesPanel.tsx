"use client";

import React, { useState } from "react";
import { Plus, FileText, Mic, Save, RefreshCw, Trash2 } from "lucide-react";
import { VoiceNoteRecorder } from "./VoiceNoteRecorder";
import { ClinicalNote } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { addNote, deleteNote } from "@/redux/clinicalNotesSlice";
import { toast } from "sonner";

interface QuickNotesPanelProps {
  patientId: string;
  doctorId: string;
  visitId?: string;
  notes: ClinicalNote[];
  loading?: boolean;
  onRefresh: () => void;
}

type NoteType = "soap" | "quick" | "voice" | "follow_up";

export const QuickNotesPanel: React.FC<QuickNotesPanelProps> = ({
  patientId,
  doctorId,
  visitId,
  notes,
  loading = false,
  onRefresh,
}) => {
  const dispatch = useAppDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>("quick");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noteTypeOptions: { value: NoteType; label: string; icon: any }[] = [
    { value: "quick", label: "Quick Note", icon: FileText },
    { value: "soap", label: "SOAP Note", icon: FileText },
    { value: "voice", label: "Voice Note", icon: Mic },
    { value: "follow_up", label: "Follow-up", icon: FileText },
  ];

  const handleVoiceTranscript = (text: string) => {
    setNoteContent((prev) => (prev ? `${prev}\n\n${text}` : text));
    setShowVoiceRecorder(false);
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        addNote({
          patient_id: patientId,
          doctor_id: doctorId,
          visit_id: visitId,
          note_type: noteType,
          content: noteContent,
          is_private: false,
        })
      ).unwrap();

      toast.success("Note saved successfully");
      setNoteContent("");
      setIsAdding(false);
      setShowVoiceRecorder(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await dispatch(deleteNote(noteId)).unwrap();
      toast.success("Note deleted successfully");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Clinical Notes</h3>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add Note
            </button>
          )}
        </div>
      </div>

      {/* Add note form */}
      {isAdding && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-4">
            {/* Note type selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Note Type
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {noteTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setNoteType(option.value)}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                        noteType === option.value
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice recorder toggle */}
            {noteType === "voice" && (
              <div>
                <button
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                >
                  <Mic className="h-4 w-4" />
                  {showVoiceRecorder ? "Hide Voice Recorder" : "Show Voice Recorder"}
                </button>
              </div>
            )}

            {/* Voice recorder */}
            {showVoiceRecorder && (
              <VoiceNoteRecorder onTranscriptComplete={handleVoiceTranscript} />
            )}

            {/* Note content */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={8}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                placeholder={
                  noteType === "soap"
                    ? "Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:"
                    : "Enter your clinical notes here..."
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNoteContent("");
                  setShowVoiceRecorder(false);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No Notes Yet</h3>
          <p className="mt-2 text-sm text-slate-600">
            Start documenting patient care by adding your first note.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        note.note_type === "soap"
                          ? "bg-purple-100 text-purple-700"
                          : note.note_type === "voice"
                          ? "bg-sky-100 text-sky-700"
                          : note.note_type === "follow_up"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {note.note_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(note.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {note.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="ml-4 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
