"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { ChevronDown, FileText, Check, Sparkles } from "lucide-react";
import type { RefractionTemplate, ComplaintTemplate, DiagnosisTemplate } from "../mock/mockTemplates";

type TemplateType = "refraction" | "complaints" | "diagnosis";

interface TemplateSelectorProps<T> {
  templateType: TemplateType;
  templates: T[];
  onApply: (template: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  buttonLabel?: string;
  className?: string;
}

const sizes = {
  sm: {
    button: "px-2 py-1 text-xs gap-1",
    icon: "h-3 w-3",
    dropdown: "min-w-[240px]",
  },
  md: {
    button: "px-3 py-1.5 text-sm gap-1.5",
    icon: "h-4 w-4",
    dropdown: "min-w-[280px]",
  },
};

export function TemplateSelector<
  T extends RefractionTemplate | ComplaintTemplate | DiagnosisTemplate
>({
  templateType,
  templates,
  onApply,
  disabled = false,
  size = "md",
  buttonLabel,
  className,
}: TemplateSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeClasses = sizes[size];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (template: T) => {
    setSelectedId(template.id);
    onApply(template);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (buttonLabel) return buttonLabel;
    switch (templateType) {
      case "refraction":
        return "Templates";
      case "complaints":
        return "Quick Add";
      case "diagnosis":
        return "Templates";
      default:
        return "Templates";
    }
  };

  const getCategoryLabel = (template: T): string | null => {
    if ("category" in template) {
      const categoryMap: Record<string, string> = {
        myopia: "Myopia",
        hyperopia: "Hyperopia",
        presbyopia: "Presbyopia",
        astigmatism: "Astigmatism",
        other: "Other",
      };
      return categoryMap[template.category] || template.category;
    }
    return null;
  };

  // Group templates by category if they have one
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = getCategoryLabel(template) || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, T[]>);

  const hasCategories = Object.keys(groupedTemplates).length > 1;

  return (
    <div className={clsx("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center rounded-lg border font-medium transition",
          sizeClasses.button,
          "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200",
          "hover:from-purple-100 hover:to-indigo-100",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "ring-2 ring-purple-300"
        )}
      >
        <Sparkles className={sizeClasses.icon} />
        <span>{getLabel()}</span>
        <ChevronDown
          className={clsx(
            sizeClasses.icon,
            "ml-0.5 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={clsx(
            "absolute right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg",
            sizeClasses.dropdown
          )}
        >
          <div className="p-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Select a template to apply
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {hasCategories ? (
              // Grouped view
              Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {category}
                    </span>
                  </div>
                  {categoryTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isSelected={selectedId === template.id}
                      onSelect={() => handleSelect(template)}
                    />
                  ))}
                </div>
              ))
            ) : (
              // Flat view
              templates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isSelected={selectedId === template.id}
                  onSelect={() => handleSelect(template)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Template item component
function TemplateItem<T extends { id: string; name: string; description: string }>({
  template,
  isSelected,
  onSelect,
}: {
  template: T;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex w-full items-start gap-2 px-3 py-2 text-left transition",
        isSelected ? "bg-purple-50" : "hover:bg-slate-50"
      )}
    >
      <FileText
        className={clsx(
          "h-4 w-4 mt-0.5 flex-shrink-0",
          isSelected ? "text-purple-600" : "text-slate-400"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            "text-sm font-medium truncate",
            isSelected ? "text-purple-700" : "text-slate-900"
          )}
        >
          {template.name}
        </p>
        <p className="text-xs text-slate-500 truncate">{template.description}</p>
      </div>
      {isSelected && <Check className="h-4 w-4 text-purple-600 flex-shrink-0" />}
    </button>
  );
}
