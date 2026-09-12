"use client";

import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Building2, 
  PlaneTakeoff, 
  ArrowRightLeft, 
  Skull, 
  AlertTriangle, 
  UserX,
  Stethoscope,
  HeartPulse,
  Activity,
  FileCheck
} from "lucide-react";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

/**
 * Badge for Admission Status (ACTIVE, DISCHARGE_INITIATED, DISCHARGED, CANCELLED)
 */
export function AdmissionStatusBadge({
  status,
  className = "",
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let label = "Unknown";
  let bgClasses = "bg-slate-100 text-slate-700 border-slate-200";
  let Icon = Clock;

  switch (norm) {
    case "ACTIVE":
    case "ADMITTED":
      label = "Admitted";
      bgClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
      Icon = Building2;
      break;
    case "DISCHARGE_INITIATED":
      label = "Discharge Initiated";
      bgClasses = "bg-purple-50 text-purple-700 border-purple-200";
      Icon = Clock;
      break;
    case "DISCHARGED":
      label = "Discharged";
      bgClasses = "bg-slate-100 text-slate-700 border-slate-200";
      Icon = CheckCircle2;
      break;
    case "CANCELLED":
      label = "Cancelled";
      bgClasses = "bg-rose-50 text-rose-700 border-rose-200";
      Icon = XCircle;
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] font-medium gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${sizeClasses} ${bgClasses} ${className}`}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />}
      <span>{label}</span>
    </span>
  );
}

/**
 * Badge for Patient Physical/Presence Status (IN_HOSPITAL, ON_LEAVE, TRANSFERRED, EXPIRED, LAMA, DAMA, ABSCONDED)
 */
export function PatientStatusBadge({
  status,
  className = "",
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const norm = (status || "IN_HOSPITAL").toUpperCase();

  let label = "In Hospital";
  let bgClasses = "bg-teal-50 text-teal-700 border-teal-200";
  let Icon = Building2;

  switch (norm) {
    case "IN_HOSPITAL":
      label = "In Hospital";
      bgClasses = "bg-teal-50 text-teal-700 border-teal-200";
      Icon = Building2;
      break;
    case "ON_LEAVE":
      label = "On Leave";
      bgClasses = "bg-sky-50 text-sky-700 border-sky-200";
      Icon = PlaneTakeoff;
      break;
    case "TRANSFERRED":
      label = "Transferred";
      bgClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
      Icon = ArrowRightLeft;
      break;
    case "EXPIRED":
      label = "Expired";
      bgClasses = "bg-slate-800 text-white border-slate-700";
      Icon = Skull;
      break;
    case "LAMA":
      label = "LAMA";
      bgClasses = "bg-amber-50 text-amber-700 border-amber-200";
      Icon = AlertTriangle;
      break;
    case "DAMA":
      label = "DAMA";
      bgClasses = "bg-amber-50 text-amber-700 border-amber-200";
      Icon = AlertTriangle;
      break;
    case "ABSCONDED":
      label = "Absconded";
      bgClasses = "bg-rose-50 text-rose-700 border-rose-200";
      Icon = UserX;
      break;
    case "DISCHARGED":
      label = "Discharged";
      bgClasses = "bg-slate-100 text-slate-700 border-slate-200";
      Icon = CheckCircle2;
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] font-medium gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${sizeClasses} ${bgClasses} ${className}`}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />}
      <span>{label}</span>
    </span>
  );
}

/**
 * Badge for Clinical Care Status (ADMITTED, UNDER_TREATMENT, RECOVERY, READY_FOR_DISCHARGE, DISCHARGED)
 */
export function CareStatusBadge({
  status,
  className = "",
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const norm = (status || "ADMITTED").toUpperCase();

  let label = "Admitted";
  let bgClasses = "bg-sky-50 text-sky-700 border-sky-200";
  let Icon = Stethoscope;

  switch (norm) {
    case "ADMITTED":
      label = "Admitted";
      bgClasses = "bg-sky-50 text-sky-700 border-sky-200";
      Icon = Stethoscope;
      break;
    case "UNDER_TREATMENT":
      label = "In Treatment";
      bgClasses = "bg-teal-50 text-teal-700 border-teal-200";
      Icon = Activity;
      break;
    case "RECOVERY":
      label = "Recovery";
      bgClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
      Icon = HeartPulse;
      break;
    case "READY_FOR_DISCHARGE":
      label = "Ready for Discharge";
      bgClasses = "bg-purple-50 text-purple-700 border-purple-200";
      Icon = FileCheck;
      break;
    case "DISCHARGED":
      label = "Discharged";
      bgClasses = "bg-slate-100 text-slate-700 border-slate-200";
      Icon = CheckCircle2;
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] font-medium gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${sizeClasses} ${bgClasses} ${className}`}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />}
      <span>{label}</span>
    </span>
  );
}
