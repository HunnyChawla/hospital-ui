"use client";

import React from "react";
import { Modal } from "./Modal";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
import { ShieldCheck, Calendar, Terminal, Info, CheckCircle2 } from "lucide-react";

export interface VersionInfo {
  service: string;
  version: string;
  build_timestamp?: string;
  source_sha256?: string;
  hash_algorithm?: string;
  verification_command?: string;
  verification_powershell?: string;
}

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VersionInfo | null;
}

export function VersionModal({ isOpen, onClose, data }: VersionModalProps) {
  if (!data) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/60">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Build & Security Audit Details</h3>
            <p className="text-xs font-normal text-slate-500">Cryptographic release integrity verification</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-1">
        {/* Top Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-teal-50/40 to-sky-50/80 p-3.5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Application</span>
            <p className="text-sm font-bold text-slate-900">{data.service || "Hospital UI"}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Release Version</span>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                v{data.version}
              </span>
            </div>
          </div>
        </div>

        {/* SHA-256 Hash Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Source Code SHA-256 Checksum
              </span>
            </div>
            {data.source_sha256 && (
              <CopyToClipboardButton
                value={data.source_sha256}
                label="Copy SHA-256"
                successMessage="SHA-256 hash copied to clipboard"
                size="sm"
                className="text-slate-500 hover:text-sky-600"
              />
            )}
          </div>
          <p className="font-mono text-xs font-semibold text-slate-800 break-all select-all">
            {data.source_sha256 || "Unverified development build"}
          </p>
        </div>

        {/* Build / Release Date */}
        {data.build_timestamp && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Release Timestamp
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {new Date(data.build_timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Verification Command for Auditors */}
        {data.verification_command && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-white shadow-inner">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-sky-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Audit Verification (Linux / Mac / Git Bash)
                </span>
              </div>
              <CopyToClipboardButton
                value={data.verification_command}
                label="Copy Command"
                successMessage="Verification command copied"
                size="sm"
                className="text-slate-400 hover:text-white"
              />
            </div>
            <code className="block font-mono text-xs text-emerald-400 bg-slate-950/80 p-2 rounded-lg break-all select-all">
              {data.verification_command}
            </code>

            {data.verification_powershell && (
              <>
                <div className="flex items-center justify-between pt-3 pb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Windows PowerShell
                  </span>
                  <CopyToClipboardButton
                    value={data.verification_powershell}
                    label="Copy PowerShell Command"
                    successMessage="PowerShell command copied"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  />
                </div>
                <code className="block font-mono text-xs text-cyan-300 bg-slate-950/80 p-2 rounded-lg break-all select-all">
                  {data.verification_powershell}
                </code>
              </>
            )}

            <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-sky-400" />
              <span>
                Auditors can run this command against the repository tag to prove the code produces this exact hash.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
