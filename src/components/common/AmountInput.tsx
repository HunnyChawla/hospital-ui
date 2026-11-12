"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "step" | "onChange"> {
  value: string | number;
  onValueChange: (value: string) => void;
  /** Increment/decrement step for ArrowUp/ArrowDown and stepper buttons. Defaults to 10. */
  arrowStep?: number;
  /** Optional step when holding Shift with ArrowUp/ArrowDown. Defaults to 100. */
  shiftArrowStep?: number;
  /** Starting number used when current value is empty and user presses ArrowUp/ArrowDown. */
  baseValue?: number | null;
  /** Native HTML step used for decimal validation without blocking arbitrary amounts. Defaults to "0.01". */
  validationStep?: string;
  /** Show compact inline ▲/▼ buttons; defaults to true. */
  showSteppers?: boolean;
  /** Class name applied to the outer relative wrapper (e.g., width classes like "w-28"). */
  wrapperClassName?: string;
}

function parseOptionalBound(bound: string | number | undefined): number | undefined {
  if (bound === undefined || bound === "") return undefined;
  const num = Number(bound);
  return Number.isFinite(num) ? num : undefined;
}

function roundCurrency(val: number): number {
  return Math.round(val * 100) / 100;
}

export function AmountInput({
  value,
  onValueChange,
  arrowStep = 10,
  shiftArrowStep = 100,
  baseValue,
  validationStep = "0.01",
  showSteppers = true,
  wrapperClassName,
  className,
  min,
  max,
  disabled,
  readOnly,
  onKeyDown,
  onWheel,
  ...rest
}: AmountInputProps) {
  const numericMin = parseOptionalBound(min);
  const numericMax = parseOptionalBound(max);

  const rawString = value === null || value === undefined ? "" : String(value);
  const parsedCurrent = rawString.trim() === "" ? NaN : Number(rawString);

  const stepAmount = (delta: number) => {
    if (disabled || readOnly) return;

    const fallbackBase =
      baseValue !== undefined && baseValue !== null && Number.isFinite(baseValue)
        ? baseValue
        : 0;
    const current = Number.isFinite(parsedCurrent) ? parsedCurrent : fallbackBase;

    let next = roundCurrency(current + delta);
    if (numericMin !== undefined) {
      next = Math.max(numericMin, next);
    }
    if (numericMax !== undefined) {
      next = Math.min(numericMax, next);
    }
    next = roundCurrency(next);

    onValueChange(String(next));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepAmount(e.shiftKey ? shiftArrowStep : arrowStep);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepAmount(-(e.shiftKey ? shiftArrowStep : arrowStep));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Prevent accidental scroll-wheel increments/decrements on focused numeric payment fields
    if (document.activeElement === e.currentTarget) {
      e.currentTarget.blur();
    }
    onWheel?.(e);
  };

  const isAtMin =
    numericMin !== undefined && Number.isFinite(parsedCurrent) && parsedCurrent <= numericMin;
  const isAtMax =
    numericMax !== undefined && Number.isFinite(parsedCurrent) && parsedCurrent >= numericMax;

  return (
    <div className={clsx("relative flex items-center", wrapperClassName || "w-full")}>
      <input
        {...rest}
        type="number"
        step={validationStep}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        className={clsx(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          showSteppers && "pr-7",
          className
        )}
      />
      {showSteppers && (
        <div className="absolute right-1 inset-y-1 flex flex-col justify-center gap-px">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || readOnly || isAtMax}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepAmount(arrowStep)}
            aria-label={`Increase amount by ${arrowStep}`}
            title={`+${arrowStep} (Shift + ↑ for +${shiftArrowStep})`}
            className="flex h-1/2 w-5 items-center justify-center rounded-t text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || readOnly || isAtMin}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepAmount(-arrowStep)}
            aria-label={`Decrease amount by ${arrowStep}`}
            title={`-${arrowStep} (Shift + ↓ for -${shiftArrowStep})`}
            className="flex h-1/2 w-5 items-center justify-center rounded-b text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
