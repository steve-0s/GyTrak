import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import type { Customer } from "../../types";

type Props = {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

type Position = { left: number; top: number; width: number; maxHeight: number; theme?: string; role?: string };
let nextComboboxId = 0;

export default function CustomerCombobox({
  customers,
  value,
  onChange,
  placeholder = "Search customers",
  className = "",
  disabled = false,
  "aria-label": ariaLabel = "Search customers",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const idRef = useRef("");
  if (!idRef.current) idRef.current = `customer-combobox-${++nextComboboxId}`;
  const id = idRef.current;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const selected = customers.find((customer) => customer.id === value);
  const uniqueCustomers = useMemo(
    () => [...new Map(customers.map((customer) => [customer.id, customer])).values()],
    [customers],
  );
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return uniqueCustomers;
    return uniqueCustomers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.id}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, selected, uniqueCustomers]);
  const inputValue = selected ? (query || selected.name) : query;

  const updatePosition = () => {
    const bounds = inputRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const themeRoot = rootRef.current?.closest<HTMLElement>("[data-theme]");
    const gap = 6;
    const maxMenuHeight = Math.min(288, window.innerHeight - 24);
    const below = window.innerHeight - bounds.bottom - gap;
    const above = bounds.top - gap;
    const placeAbove = below < Math.min(220, maxMenuHeight) && above > below;
    const maxHeight = Math.max(120, Math.min(maxMenuHeight, placeAbove ? above : below));
    setPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - bounds.width - 8)),
      top: placeAbove ? Math.max(8, bounds.top - Math.min(maxHeight, 288) - gap) : bounds.bottom + gap,
      width: Math.min(bounds.width, window.innerWidth - 16),
      maxHeight,
      theme: themeRoot?.dataset.theme,
      role: themeRoot?.dataset.role,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const selectOption = (customer: Customer) => {
    onChange(customer.id);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open) setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (options[activeIndex]) selectOption(options[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className={`flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition-colors focus-within:border-[var(--accent)] ${disabled ? "opacity-60" : ""} ${className}`}>
        <Search size={15} aria-hidden="true" className="shrink-0 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={open && options[activeIndex] ? `${id}-option-${options[activeIndex].id}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            if (selected) {
              setQuery("");
              requestAnimationFrame(() => inputRef.current?.select());
            }
          }}
          onClick={() => {
            setOpen(true);
            if (selected && !query) requestAnimationFrame(() => inputRef.current?.select());
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selected) onChange("");
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
        />
        {selected && (
          <button
            type="button"
            aria-label="Clear selected customer"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            ×
          </button>
        )}
        {!selected && <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-[var(--text-muted)]" />}
      </div>
      {open && position && createPortal(
        <div
          ref={menuRef}
          id={`${id}-options`}
          role="listbox"
          aria-label="Customer options"
          data-theme={position.theme}
          data-role={position.role}
          style={{ position: "fixed", left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
          className="z-[70] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
        >
          {options.length ? options.map((customer, index) => (
            <button
              key={customer.id}
              id={`${id}-option-${customer.id}`}
              type="button"
              role="option"
              aria-selected={customer.id === value}
              onMouseEnter={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  inputRef.current?.focus();
                }
              }}
              onClick={() => selectOption(customer)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm ${index === activeIndex ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--bg)]"}`}
            >
              <span className="min-w-0"><span className="block truncate font-medium text-[var(--text)]">{customer.name}</span><span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{customer.phone || "No phone recorded"} · {customer.branch}</span></span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">{customer.id}</span>
            </button>
          )) : <p className="px-3 py-3 text-sm text-[var(--text-muted)]">No customers found</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}
