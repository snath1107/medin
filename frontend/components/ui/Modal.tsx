"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import Button from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Buttons at the bottom, right-aligned. Put the main action last. */
  footer?: React.ReactNode;
  /** Text on the left of the footer, e.g. a note. */
  footerNote?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}

/**
 * Built on the browser's own <dialog> element. `showModal()` gives us the dark
 * backdrop, Esc to close, and keeps keyboard focus inside the dialog for free.
 */
export default function Modal({ open, onClose, title, footer, footerNote, width = 520, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] overflow-hidden rounded-md border border-line-200 bg-white p-0 text-ink-900 shadow-modal md:mt-14 md:max-h-[calc(100dvh-88px)]"
      style={{ maxWidth: width }}
      // Esc key
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the <dialog> element itself
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-34px)] flex-col md:max-h-[calc(100dvh-90px)]">
          {title && (
            <div className="flex shrink-0 items-center justify-between border-b border-line-100 py-3.5 pl-6 pr-4">
              <h2 className="font-serif text-xl font-semibold leading-[26px]">{title}</h2>
              <Button icon={X} title="Close" variant="icon" onClick={onClose} />
            </div>
          )}
          <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex shrink-0 items-center gap-2 border-t border-line-100 px-6 py-3.5">
              <span className="flex-1 text-[13.5px] text-ink-500">{footerNote}</span>
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Name the thing and the consequence: "…will be permanently removed." */
  description: React.ReactNode;
  confirmLabel: string;
  /** An icon disc or avatar shown left of the text. */
  visual?: React.ReactNode;
  loading?: boolean;
}

/** "Are you sure?" for destructive actions (delete, unfollow). */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, visual, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} width={420} onClose={onClose}>
      <div className="flex gap-3.5 pt-1">
        {visual}
        <div className={clsx(!visual && "pl-0")}>
          <h2 className="font-serif text-[19px] font-semibold leading-[25px]">{title}</h2>
          <p className="mt-1.5 text-[15px] leading-[22px] text-ink-700">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={loading} variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
