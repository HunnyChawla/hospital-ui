"use client";

import React, { useMemo } from "react";
import clsx from "clsx";
import { Check, AlertTriangle, X, Palette, Eye } from "lucide-react";

export interface ColorVisionInputProps {
  status: string; // "NORMAL" | "ABNORMAL" | ""
  onStatusChange: (status: string) => void;
  plates: string; // e.g. "10/14" or "14/14"
  onPlatesChange: (plates: string) => void;
  deficiency: string; // "RED_GREEN" | "BLUE_YELLOW" | "TOTAL" | ""
  onDeficiencyChange: (deficiency: string) => void;
  peerStatus?: string; // Other eye's status ("NORMAL" | "ABNORMAL" | "")
  colorScheme?: "blue" | "green" | "neutral";
  compact?: boolean;
  eyeLabel?: string;
  readOnly?: boolean;
}

const DEFICIENCY_OPTIONS = [
  { value: "RED_GREEN", label: "Red-Green" },
  { value: "BLUE_YELLOW", label: "Blue-Yellow" },
  { value: "TOTAL", label: "Total" },
] as const;

const STANDARD_TOTAL_PLATES = ["14", "24", "38"] as const;

export function ColorVisionInput({
  status,
  onStatusChange,
  plates,
  onPlatesChange,
  deficiency,
  onDeficiencyChange,
  peerStatus = "",
  colorScheme = "neutral",
  compact = false,
  eyeLabel,
  readOnly = false,
}: ColorVisionInputProps) {
  // Check if either this eye or the other eye is marked abnormal
  const hasAnyAbnormal = status === "ABNORMAL" || peerStatus === "ABNORMAL";

  // Parse plates into read vs total if formatted like "X/Y"
  const { platesReadPart, totalPlatesPart } = useMemo(() => {
    if (!plates) {
      return {
        platesReadPart: status === "NORMAL" ? "14" : "",
        totalPlatesPart: "14",
      };
    }
    if (plates.includes("/")) {
      const [read, total] = plates.split("/");
      return { platesReadPart: read.trim(), totalPlatesPart: total.trim() || "14" };
    }
    return { platesReadPart: plates.trim(), totalPlatesPart: "14" };
  }, [plates, status]);

  const handleStatusClick = (newStatus: "NORMAL" | "ABNORMAL") => {
    if (readOnly) return;
    if (status === newStatus) {
      // Toggle off
      onStatusChange("");
      onPlatesChange("");
      onDeficiencyChange("");
      return;
    }
    onStatusChange(newStatus);
    if (newStatus === "ABNORMAL") {
      if (!deficiency) {
        onDeficiencyChange("RED_GREEN");
      }
      if (!plates) {
        onPlatesChange("10/14");
      }
    } else {
      // If Normal, default plates to standard full score
      const tot = totalPlatesPart || "14";
      onPlatesChange(`${tot}/${tot}`);
      onDeficiencyChange("");
    }
  };

  const handleReadNumberChange = (val: string) => {
    const cleanNum = val.replace(/\D/g, "");
    onPlatesChange(cleanNum ? `${cleanNum}/${totalPlatesPart || "14"}` : "");
  };

  const handleTotalPlatesSelect = (tot: string) => {
    if (status === "NORMAL") {
      // When normal, total selection automatically sets full score
      onPlatesChange(`${tot}/${tot}`);
    } else {
      const currentRead = platesReadPart || "10";
      onPlatesChange(`${currentRead}/${tot}`);
    }
  };

  const isOD = colorScheme === "blue";
  const isOS = colorScheme === "green";

  return (
    <div
      className={clsx(
        "rounded-lg border transition-all duration-200 flex flex-col justify-between",
        compact ? "p-2.5 bg-slate-50/70" : "p-3.5 bg-white shadow-xs",
        isOD && "border-blue-200/80",
        isOS && "border-green-200/80",
        !isOD && !isOS && "border-slate-200"
      )}
    >
      <div>
        {/* Header / Label */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Palette
              className={clsx(
                compact ? "h-3.5 w-3.5" : "h-4 w-4",
                isOD ? "text-blue-600" : isOS ? "text-green-600" : "text-slate-600"
              )}
            />
            <span
              className={clsx(
                "font-bold uppercase tracking-wider",
                compact ? "text-[10px] text-slate-500" : "text-xs text-slate-700"
              )}
            >
              {eyeLabel ? `${eyeLabel} Color Vision` : "Color Vision"}
            </span>
          </div>

          {status && !readOnly && (
            <button
              type="button"
              onClick={() => {
                onStatusChange("");
                onPlatesChange("");
                onDeficiencyChange("");
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 transition"
              title="Clear color vision"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Status Segmented Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleStatusClick("NORMAL")}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-md font-semibold transition py-1.5 px-2 text-xs",
              status === "NORMAL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
            )}
          >
            {status === "NORMAL" && <Check className="h-3.5 w-3.5" />}
            <span>Normal</span>
          </button>

          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleStatusClick("ABNORMAL")}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-md font-semibold transition py-1.5 px-2 text-xs",
              status === "ABNORMAL"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800"
            )}
          >
            {status === "ABNORMAL" && <AlertTriangle className="h-3.5 w-3.5" />}
            <span>Abnormal</span>
          </button>
        </div>

        {/* Symmetrical Layout Section */}
        {hasAnyAbnormal ? (
          <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
            {status === "ABNORMAL" ? (
              /* ABNORMAL EYE: Plates Input + Deficiency Buttons */
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Plates / Pages Read
                    </label>
                    <span className="text-[10px] font-bold text-amber-700">
                      Score: {platesReadPart || "0"}/{totalPlatesPart || "14"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={platesReadPart}
                        onChange={(e) => handleReadNumberChange(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400">/</span>
                    <div className="flex items-center gap-1">
                      {STANDARD_TOTAL_PLATES.map((tot) => (
                        <button
                          key={tot}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleTotalPlatesSelect(tot)}
                          className={clsx(
                            "rounded px-2 py-1 text-[11px] font-bold transition",
                            totalPlatesPart === tot
                              ? "bg-slate-800 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                          title={`Out of ${tot} plates`}
                        >
                          {tot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Color Deficiency
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {DEFICIENCY_OPTIONS.map((opt) => {
                      const isSelected = deficiency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={readOnly}
                          onClick={() => onDeficiencyChange(opt.value)}
                          className={clsx(
                            "rounded-md py-1 px-1 text-center text-xs transition truncate font-medium",
                            isSelected
                              ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : status === "NORMAL" ? (
              /* NORMAL EYE (when peer is abnormal): Same 2-row structure for perfect vertical sync */
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Plates / Pages Read
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Score: {platesReadPart || totalPlatesPart}/{totalPlatesPart || "14"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={platesReadPart || totalPlatesPart}
                        onChange={(e) => handleReadNumberChange(e.target.value)}
                        placeholder={`e.g. ${totalPlatesPart}`}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400">/</span>
                    <div className="flex items-center gap-1">
                      {STANDARD_TOTAL_PLATES.map((tot) => (
                        <button
                          key={tot}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleTotalPlatesSelect(tot)}
                          className={clsx(
                            "rounded px-2 py-1 text-[11px] font-bold transition",
                            totalPlatesPart === tot
                              ? "bg-slate-800 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                          title={`Out of ${tot} plates`}
                        >
                          {tot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Clinical Finding
                  </label>
                  <div className="flex items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/90 py-1 px-2 text-xs font-semibold text-emerald-800 h-[26px]">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Full Spectrum (No deficiency)</span>
                  </div>
                </div>
              </>
            ) : (
              /* UNTESTED EYE (when peer is abnormal): Exact height-matched placeholder */
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-2 text-center h-[98px]">
                <Eye className="h-4 w-4 text-slate-300 mb-1" />
                <p className="text-xs font-medium text-slate-500">Not recorded for this eye</p>
                <p className="text-[10px] text-slate-400">Click Normal or Abnormal above</p>
              </div>
            )}
          </div>
        ) : (
          /* NEITHER EYE IS ABNORMAL */
          status === "NORMAL" && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-2.5 py-1.5 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">All plates read correctly</span>
              </div>
              <span className="font-bold text-[10px] text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {plates || "14/14"}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
