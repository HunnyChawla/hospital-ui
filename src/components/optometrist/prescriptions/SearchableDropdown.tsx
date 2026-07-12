import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

interface SearchableDropdownProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  inputClassName?: string;
}

export function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "",
  inputClassName,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchQuery(""); // Clear search to show all options initially
    setActiveIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSearchQuery(val);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleOptionSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  // Filter options based on searchQuery
  const filteredOptions = searchQuery
    ? options.filter((opt) =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        handleOptionSelect(filteredOptions[activeIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Scroll active option into view if necessary
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      const container = containerRef.current?.querySelector(".dropdown-list");
      const activeEl = container?.children[activeIndex] as HTMLElement;
      if (container && activeEl) {
        const containerHeight = container.clientHeight;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.clientHeight;

        if (activeTop + activeHeight > container.scrollTop + containerHeight) {
          container.scrollTop = activeTop + activeHeight - containerHeight;
        } else if (activeTop < container.scrollTop) {
          container.scrollTop = activeTop;
        }
      }
    }
  }, [activeIndex, isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value || ""}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={clsx(
            "w-full pr-8 bg-white transition-all shadow-sm focus:outline-none",
            inputClassName
          )}
        />
        <div
          className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
              setSearchQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDown
            className={clsx(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-list absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100 scrollbar-thin">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={opt}
                className={clsx(
                  "px-3 py-2 text-sm cursor-pointer transition-colors font-medium text-left",
                  idx === activeIndex
                    ? "bg-purple-100 text-purple-800"
                    : value === opt
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-700 hover:bg-slate-50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents blur before selecting
                  handleOptionSelect(opt);
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 italic text-left">
              Press Enter or keep typing for custom value...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
