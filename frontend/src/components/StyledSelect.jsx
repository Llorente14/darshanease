import { useEffect, useRef, useState } from "react";

// Custom dropdown. The native <option> list cannot be styled, so this renders its own list.
// The list is position:fixed so it is not clipped by scrollable tables.
// Styles are inline and use the existing theme variables (no new CSS).

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none", transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function StyledSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  minWidth = 150,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  const openList = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, minWidth) });
    setHighlight(selectedIndex);
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (option) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (option.value !== value) onChange(option.value);
  };

  // Outside click and scroll close the list. Scrolling would leave it floating in the wrong place.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const onTriggerKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) => Math.min(options.length - 1, Math.max(0, current + step)));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openList();
      else choose(options[highlight]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeList();
    } else if (event.key === "Tab" && open) {
      setOpen(false);
    }
  };

  return (
    <span id={id} style={{ position: "relative", display: "inline-block", minWidth }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onTriggerKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          height: 40,
          padding: "0 12px",
          border: `1px solid ${open ? "var(--primary-hover)" : "var(--line)"}`,
          boxShadow: open ? "0 0 0 3px var(--primary-soft)" : "none",
          borderRadius: 8,
          background: "white",
          color: "var(--navy)",
          fontSize: 12,
          fontWeight: 600,
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          transition: "border-color .15s, box-shadow .15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && position && (
        <span
          ref={listRef}
          role="listbox"
          aria-label={label}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            minWidth: position.width,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 6,
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 14px 34px rgba(9,17,35,.14)",
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlight;
            return (
              <span
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "var(--primary-dark)" : "var(--navy)",
                  background: isHighlighted ? "var(--primary-soft)" : "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {option.label}
                {isSelected && <CheckIcon />}
              </span>
            );
          })}
        </span>
      )}
    </span>
  );
}
