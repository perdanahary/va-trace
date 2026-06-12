import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
}

interface SearchableComboboxProps {
  value: string;
  options: ComboboxOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCreate?: boolean;
  createLabel?: string;
  onCreate?: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableCombobox({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  allowCreate = false,
  createLabel,
  onCreate,
  ariaLabel,
  className,
  disabled = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const exactMatch = useMemo(() => {
    if (!normalizedQuery) {
      return null;
    }

    return options.find((option) => {
      return option.value.toLowerCase() === normalizedQuery || option.label.trim().toLowerCase() === normalizedQuery;
    }) ?? null;
  }, [normalizedQuery, options]);

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.label, option.description, ...(option.keywords ?? [])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);
  const canCreate = allowCreate && Boolean(trimmedQuery) && !exactMatch;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open, value]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  const handleCreate = () => {
    if (!canCreate) {
      return;
    }

    onCreate?.(trimmedQuery);
    onValueChange(trimmedQuery);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs ring-offset-background transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          open && "ring-2 ring-ring ring-offset-2",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear selection"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onValueChange("");
              setOpen(true);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              aria-label={searchPlaceholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();

                  if (canCreate) {
                    handleCreate();
                    return;
                  }

                  if (exactMatch) {
                    handleSelect(exactMatch.value);
                  }
                }
              }}
            />
            <button
              type="button"
              aria-label="Close combobox"
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div id={listboxId} role="listbox" className="max-h-72 overflow-auto p-1">
            {canCreate ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCreate}
                className="mb-1 flex w-full items-start gap-2 rounded-sm border border-dashed border-primary/30 bg-primary/5 px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {createLabel ? `${createLabel} "${trimmedQuery}"` : `Create "${trimmedQuery}"`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">Add and select this new value</span>
                </span>
              </button>
            ) : null}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (option.disabled) return;
                      handleSelect(option.value);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors",
                      option.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? <span className="block truncate text-xs text-muted-foreground">{option.description}</span> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
