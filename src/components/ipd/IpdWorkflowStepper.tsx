"use client";

import React from "react";
import { Admission } from "@/services/admissionsApi";
import { 
  Check, 
  Bed, 
  ClipboardCheck, 
  Activity, 
  FileText, 
  CreditCard, 
  LogOut,
  Clock
} from "lucide-react";

interface IpdWorkflowStepperProps {
  admission: Admission;
  className?: string;
  isInvoicePaid?: boolean;
}

interface Step {
  id: number;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  status: "completed" | "current" | "upcoming" | "cancelled";
  timestamp?: string | null;
}

export function IpdWorkflowStepper({
  admission,
  className = "",
  isInvoicePaid = false,
}: IpdWorkflowStepperProps) {
  const admStatus = (admission.status || "").toUpperCase();
  const careStatus = (admission.care_status || "ADMITTED").toUpperCase();
  const hasBed = !!admission.bed_id;
  const isCancelled = admStatus === "CANCELLED";

  // Compute step statuses
  const steps: Step[] = [
    {
      id: 1,
      label: "Admission",
      sublabel: admission.admission_number || "Admitted",
      icon: Clock,
      status: isCancelled ? "cancelled" : "completed",
      timestamp: admission.admission_date,
    },
    {
      id: 2,
      label: "Bed Assigned",
      sublabel: admission.bed_number ? `Bed ${admission.bed_number}` : "Pending",
      icon: Bed,
      status: isCancelled
        ? "cancelled"
        : hasBed
        ? "completed"
        : "current",
      timestamp: hasBed ? admission.ward_name : undefined,
    },
    {
      id: 3,
      label: "Assessment",
      sublabel: careStatus === "ADMITTED" && !hasBed ? "Pending" : "Evaluated",
      icon: ClipboardCheck,
      status: isCancelled
        ? "cancelled"
        : ["UNDER_TREATMENT", "RECOVERY", "READY_FOR_DISCHARGE"].includes(careStatus) ||
          ["DISCHARGE_INITIATED", "DISCHARGED"].includes(admStatus)
        ? "completed"
        : careStatus === "ADMITTED" && hasBed
        ? "current"
        : "upcoming",
    },
    {
      id: 4,
      label: "Treatment",
      sublabel: careStatus === "RECOVERY" ? "Recovery" : careStatus === "UNDER_TREATMENT" ? "In Progress" : careStatus === "READY_FOR_DISCHARGE" ? "Complete" : "Pending",
      icon: Activity,
      status: isCancelled
        ? "cancelled"
        : ["RECOVERY", "READY_FOR_DISCHARGE"].includes(careStatus) ||
          ["DISCHARGE_INITIATED", "DISCHARGED"].includes(admStatus)
        ? "completed"
        : careStatus === "UNDER_TREATMENT"
        ? "current"
        : "upcoming",
    },
    {
      id: 5,
      label: "Discharge Init",
      sublabel: admStatus === "DISCHARGE_INITIATED" || admStatus === "DISCHARGED" ? "Initiated" : "Pending",
      icon: FileText,
      status: isCancelled
        ? "cancelled"
        : admStatus === "DISCHARGED"
        ? "completed"
        : admStatus === "DISCHARGE_INITIATED"
        ? "current"
        : "upcoming",
      timestamp: admission.discharge_date,
    },
    {
      id: 6,
      label: "Billing Clearance",
      sublabel: admStatus === "DISCHARGED" || isInvoicePaid ? "Cleared" : admission.invoice_id ? "Bill Pending" : "Pending",
      icon: CreditCard,
      status: isCancelled
        ? "cancelled"
        : admStatus === "DISCHARGED" || isInvoicePaid
        ? "completed"
        : admStatus === "DISCHARGE_INITIATED"
        ? "current"
        : "upcoming",
    },
    {
      id: 7,
      label: "Discharged",
      sublabel: admStatus === "DISCHARGED" ? "Complete" : "Pending",
      icon: LogOut,
      status: isCancelled
        ? "cancelled"
        : admStatus === "DISCHARGED"
        ? "completed"
        : "upcoming",
      timestamp: admission.discharge_date,
    },
  ];

  return (
    <div className={`w-full bg-white rounded-2xl border border-slate-100 p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Inpatient Lifecycle Roadmap
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage progression across clinical care, billing, and administrative clearance
          </p>
        </div>
      </div>

      {/* Stepper container */}
      <div className="relative overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex items-start justify-between min-w-[620px] relative px-2">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";
            const isCancelledStep = step.status === "cancelled";

            return (
              <div
                key={step.id}
                className="relative z-10 flex flex-col items-center text-center flex-1 min-w-[80px]"
              >
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCancelledStep
                      ? "bg-rose-100 text-rose-600 ring-2 ring-rose-200"
                      : isCompleted
                      ? "bg-teal-600 text-white shadow-sm ring-4 ring-teal-50"
                      : isCurrent
                      ? "bg-sky-500 text-white shadow-sm ring-4 ring-sky-100"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 space-y-0.5">
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent
                        ? "text-sky-700"
                        : isCompleted
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {step.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
