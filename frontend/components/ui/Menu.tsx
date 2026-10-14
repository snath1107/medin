"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MenuItem =
  | { label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean }
  | "divider";

interface MenuProps {
  /** Renders the button that opens the menu. */
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: MenuItem[];
  /** Optional block at the top, e.g. "signed in as". */
  header?: React.ReactNode;
  width?: number;
}

/** A dropdown menu that closes on outside click, Esc, or picking an item. */
export default function Menu({ trigger, items, header, width = 200 }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen(!open) })}

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 rounded-md border border-line-200 bg-white py-1.5 shadow-float"
          role="menu"
          style={{ width }}
        >
          {header && <div className="mb-1.5 border-b border-line-100 px-3.5 pb-2.5 pt-2">{header}</div>}
          {items.map((item, index) =>
            item === "divider" ? (
              <div key={index} className="my-1.5 h-px bg-line-100" />
            ) : (
              <button
                key={item.label}
                className={clsx(
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14.5px] leading-5 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600/35",
                  item.danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-900 hover:bg-paper-100",
                )}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon && <item.icon className={item.danger ? "" : "text-ink-500"} size={16} />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
