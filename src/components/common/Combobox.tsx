import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface ComboboxOption {
  label: string;
  value: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  allowCustomValue?: boolean;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Type or select...",
  className,
  allowCustomValue = true
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync the input value with the selected option label
  useEffect(() => {
    const selectedOption = options.find(o => o.value === value);
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else {
      setInputValue(value || "");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes((inputValue || "").toLowerCase()) ||
    opt.value.toLowerCase().includes((inputValue || "").toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <input 
        type="text" 
        value={inputValue} 
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className={clsx(
          "w-full text-sm rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all pr-10",
          className
        )} 
        placeholder={placeholder}
      />
      <div 
        className="absolute right-3 top-3.5 cursor-pointer text-slate-400 hover:text-slate-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div 
                key={opt.value} 
                className={clsx(
                  "px-4 py-2.5 text-sm cursor-pointer transition-colors font-medium",
                  value === opt.value 
                    ? "bg-sky-50 text-sky-700" 
                    : "text-slate-700 hover:bg-slate-50"
                )}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 italic">
              {allowCustomValue ? "No matches. Type custom value..." : "No matches found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
