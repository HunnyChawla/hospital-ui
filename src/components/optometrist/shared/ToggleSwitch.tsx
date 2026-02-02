"use client";

import clsx from "clsx";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  colorScheme?: "sky" | "green" | "amber" | "red";
  showLabels?: boolean;
  onLabel?: string;
  offLabel?: string;
  className?: string;
}

const colorSchemes = {
  sky: {
    track: "bg-sky-600",
    trackOff: "bg-slate-300",
  },
  green: {
    track: "bg-green-600",
    trackOff: "bg-slate-300",
  },
  amber: {
    track: "bg-amber-500",
    trackOff: "bg-slate-300",
  },
  red: {
    track: "bg-red-600",
    trackOff: "bg-slate-300",
  },
};

const sizes = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-4 w-4",
    thumbTranslate: "translate-x-4",
    label: "text-sm",
    description: "text-xs",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    thumbTranslate: "translate-x-5",
    label: "text-sm",
    description: "text-xs",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-6 w-6",
    thumbTranslate: "translate-x-7",
    label: "text-base",
    description: "text-sm",
  },
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  colorScheme = "sky",
  showLabels = false,
  onLabel = "Yes",
  offLabel = "No",
  className,
}: ToggleSwitchProps) {
  const colors = colorSchemes[colorScheme];
  const sizeClasses = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={clsx("flex items-start gap-3", className)}>
      {/* Toggle Track */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          "relative inline-flex flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
          sizeClasses.track,
          checked ? colors.track : colors.trackOff,
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {/* Thumb */}
        <span
          className={clsx(
            "pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
            sizeClasses.thumb,
            checked ? sizeClasses.thumbTranslate : "translate-x-0.5",
            "mt-0.5 ml-0.5"
          )}
        />
      </button>

      {/* Label and Description */}
      {(label || description || showLabels) && (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {label && (
              <span
                className={clsx(
                  "font-medium text-slate-900",
                  sizeClasses.label,
                  disabled && "text-slate-500"
                )}
              >
                {label}
              </span>
            )}
            {showLabels && (
              <span
                className={clsx(
                  "font-medium",
                  sizeClasses.description,
                  checked ? "text-green-600" : "text-slate-500"
                )}
              >
                {checked ? onLabel : offLabel}
              </span>
            )}
          </div>
          {description && (
            <p
              className={clsx(
                "text-slate-500",
                sizeClasses.description,
                disabled && "text-slate-400"
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
