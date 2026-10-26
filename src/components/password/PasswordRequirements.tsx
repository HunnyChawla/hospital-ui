"use client";

import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import { validatePassword, PasswordContext } from "@/utils/passwordPolicy";

interface PasswordRequirementsProps {
  password?: string;
  context?: PasswordContext;
  showDetails?: boolean;
}

export function PasswordRequirements({
  password = "",
  context,
  showDetails = true,
}: PasswordRequirementsProps) {
  const result = useMemo(
    () => validatePassword(password, context),
    [password, context]
  );

  const { ruleStatuses, strength, strengthPercentage } = result;

  // Only show requirements once user starts typing or when showDetails is true
  const isTyping = password.length > 0;

  const strengthColor = useMemo(() => {
    switch (strength) {
      case "strong":
        return "bg-emerald-500 text-emerald-700";
      case "good":
        return "bg-sky-500 text-sky-700";
      case "fair":
        return "bg-amber-500 text-amber-700";
      case "weak":
      default:
        return "bg-rose-500 text-rose-700";
    }
  }, [strength]);

  const strengthLabel = useMemo(() => {
    switch (strength) {
      case "strong":
        return "Strong";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "weak":
      default:
        return "Weak";
    }
  }, [strength]);

  return (
    <div className="space-y-3 pt-1">
      {/* Strength indicator bar */}
      {isTyping && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">Password strength</span>
            <span className={strengthColor.split(" ")[1]}>{strengthLabel}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${strengthColor.split(" ")[0]}`}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements checklist */}
      {showDetails && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600">
          <p className="mb-2 font-medium text-slate-700">Password must contain:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              {ruleStatuses.minLength ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span className={ruleStatuses.minLength ? "text-emerald-700" : "text-slate-500"}>
                At least 12 characters
              </span>
            </li>
            <li className="flex items-center gap-2">
              {ruleStatuses.uppercase && ruleStatuses.lowercase ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span
                className={
                  ruleStatuses.uppercase && ruleStatuses.lowercase
                    ? "text-emerald-700"
                    : "text-slate-500"
                }
              >
                Uppercase (A-Z) and lowercase (a-z) letters
              </span>
            </li>
            <li className="flex items-center gap-2">
              {ruleStatuses.number ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span className={ruleStatuses.number ? "text-emerald-700" : "text-slate-500"}>
                At least one number (0-9)
              </span>
            </li>
            <li className="flex items-center gap-2">
              {ruleStatuses.specialChar ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span className={ruleStatuses.specialChar ? "text-emerald-700" : "text-slate-500"}>
                At least one special character (!@#$%^&*...)
              </span>
            </li>
            {isTyping && (!ruleStatuses.notCommon || !ruleStatuses.notRepeating || !ruleStatuses.notSequential || !ruleStatuses.notContextual) && (
              <li className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-rose-600">
                <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>
                  {!ruleStatuses.notCommon
                    ? "Password is too common or easily guessable"
                    : !ruleStatuses.notRepeating
                    ? "Too many repeating characters (e.g. 'aaaa')"
                    : !ruleStatuses.notSequential
                    ? "Sequential patterns not allowed (e.g. '1234')"
                    : "Cannot contain parts of your name or email"}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
