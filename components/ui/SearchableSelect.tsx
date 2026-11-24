"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  searchTerms?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar por nombre, código o RIF...",
  emptyMessage = "Sin resultados",
  disabled = false,
  icon,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 150);
    return options
      .filter((opt) => {
        const l = opt.label.toLowerCase();
        const s = (opt.sublabel || "").toLowerCase();
        const t = (opt.searchTerms || "").toLowerCase();
        return l.includes(q) || s.includes(q) || t.includes(q);
      })
      .slice(0, 150);
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    } else {
      setQuery("");
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          buttonClassName ||
          "px-2.5 h-9 bg-white dark:bg-neutral-950 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs"
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate font-semibold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-full min-w-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 bg-neutral-50/60 dark:bg-neutral-900/50">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                } else if (e.key === "Enter" && filteredOptions.length > 0) {
                  e.preventDefault();
                  onChange(filteredOptions[0].value);
                  setIsOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none py-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-neutral-50 dark:divide-neutral-900/60">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-neutral-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro font-semibold"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] font-mono text-neutral-400 truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-locatel-medio shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

