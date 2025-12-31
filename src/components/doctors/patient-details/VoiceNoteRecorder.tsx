"use client";

import React, { useState } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

interface VoiceNoteRecorderProps {
  onTranscriptComplete: (text: string) => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onTranscriptComplete,
}) => {
  const {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceRecording({
    onTranscript: (text) => {
      // Automatically add completed transcripts
    },
  });

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      if (transcript) {
        onTranscriptComplete(transcript);
        resetTranscript();
      }
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">
              Voice Recording Not Supported
            </p>
            <p className="mt-1 text-sm text-rose-700">
              Your browser doesn't support voice recording. Please use Google Chrome
              or Microsoft Edge for this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleRecording}
            className={`group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition ${
              isRecording
                ? "animate-pulse bg-rose-500 shadow-lg shadow-rose-500/50"
                : "bg-sky-500 shadow-md hover:bg-sky-600 hover:shadow-lg"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-6 w-6 text-white" />
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}

            {/* Pulse ring when recording */}
            {isRecording && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            )}
          </button>

          <div>
            <p className="font-semibold text-slate-900">
              {isRecording ? "Recording..." : "Click to Start"}
            </p>
            <p className="text-sm text-slate-600">
              {isRecording
                ? "Click again to stop and save"
                : "Click the microphone to start recording"}
            </p>
          </div>
        </div>
      </div>

      {/* Live transcript preview */}
      {(isRecording || interimTranscript) && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-medium text-sky-900">Live Transcript:</p>
          <p className="mt-2 text-sm text-slate-700">
            {transcript}
            <span className="italic text-slate-500">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium">💡 Tips:</p>
        <ul className="mt-2 space-y-1">
          <li>• Speak clearly and at a normal pace</li>
          <li>• The transcript will be automatically added to your note</li>
          <li>• You can edit the text after recording</li>
        </ul>
      </div>
    </div>
  );
};
