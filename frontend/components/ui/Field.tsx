"use client";

import clsx from "clsx";
import { ChevronDown, CircleAlert, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";

/**
 * Form fields. Every field has the same parts:
 *   label (+ "Optional")  →  control  →  error OR hint
 * The label sits above, errors replace the hint and say how to fix the problem.
 */

interface ShellProps {
  label?: string;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  /** Red border without a message (e.g. a wrong password, explained elsewhere). */
  invalid?: boolean;
  size?: "md" | "lg";
  disabled?: boolean;
  /** Text right of the label, e.g. "3 of 5" */
  aside?: React.ReactNode;
}

function FieldShell({
  id,
  label,
  optional,
  hint,
  error,
  aside,
  children,
}: ShellProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-sm font-semibold text-ink-900" htmlFor={id}>
            {label}
          </label>
          {optional && <span className="text-[13px] text-ink-500">Optional</span>}
          {aside && <span className="text-[13px] text-ink-500">{aside}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-[13.5px] leading-[19px] text-danger-600" id={`${id}-error`}>
          <CircleAlert className="mt-0.5 shrink-0" size={15} />
          {error}
        </p>
      ) : (
        hint && (
          <p className="text-[13.5px] leading-[19px] text-ink-500" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** The bordered box around an input. Uses :focus-within so the whole box shows focus. */
export function controlBoxClass({ error, invalid, disabled, size = "md" }: ShellProps) {
  return clsx(
    "relative flex items-center gap-2 rounded border px-3 transition-[border-color,box-shadow] duration-100",
    size === "lg" ? "min-h-[42px]" : "min-h-[38px]",
    disabled
      ? "border-line-200 bg-paper-100"
      : error || invalid
        ? "border-danger-600 bg-white focus-within:ring-3 focus-within:ring-danger-600/15"
        : "border-line-300 bg-white hover:border-line-500 focus-within:border-teal-600 focus-within:ring-3 focus-within:ring-teal-600/20",
  );
}

const CONTROL =
  "w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] leading-[22px] text-ink-900 outline-none placeholder:text-ink-400 disabled:text-ink-400";

function describedBy(id: string, { error, hint }: ShellProps) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type InputProps = ShellProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & { icon?: LucideIcon };

export function TextField({ label, optional, hint, error, invalid, size, aside, icon: Icon, disabled, ...props }: InputProps) {
  const id = useId();
  const shell = { label, optional, hint, error, invalid, size, aside, disabled };

  return (
    <FieldShell id={id} {...shell}>
      <div className={controlBoxClass(shell)}>
        {Icon && <Icon className="shrink-0 text-ink-500" size={16} />}
        <input
          aria-describedby={describedBy(id, shell)}
          aria-invalid={!!error || invalid}
          className={clsx(CONTROL, size === "lg" ? "h-10" : "h-9")}
          disabled={disabled}
          id={id}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["#B42318", "#B42318", "#9A6410", "#0F6A73", "#2F7A4C"];

/** 0–4, based on length and the mix of character types. */
function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return value.length < 8 ? Math.min(score, 1) : score;
}

export function PasswordField({ showStrength, ...props }: InputProps & { showStrength?: boolean }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const { label, optional, hint, error, invalid, size, aside, disabled, value, ...inputProps } = props;
  const shell = { label, optional, hint, error, invalid, size, aside, disabled };
  const text = String(value ?? "");
  const score = passwordStrength(text);

  return (
    <FieldShell id={id} {...shell}>
      <div className={controlBoxClass(shell)}>
        <input
          aria-describedby={describedBy(id, shell)}
          aria-invalid={!!error || invalid}
          className={clsx(CONTROL, size === "lg" ? "h-10" : "h-9")}
          disabled={disabled}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          {...inputProps}
        />
        <button
          className="flex shrink-0 items-center gap-1 px-0.5 py-1 text-[13px] font-semibold text-teal-600"
          type="button"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showStrength && text.length > 0 && (
        <div className="flex items-center gap-2.5" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((bar) => (
              <div
                key={bar}
                className="h-1 rounded-sm"
                style={{ background: bar < Math.max(score, 1) ? STRENGTH_COLORS[score] : "#E4E1DB" }}
              />
            ))}
          </div>
          <span className="min-w-[58px] text-right text-[12.5px] font-semibold" style={{ color: STRENGTH_COLORS[score] }}>
            {STRENGTH_LABELS[score]}
          </span>
        </div>
      )}
    </FieldShell>
  );
}

type SelectProps = ShellProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { options: string[]; placeholder?: string };

export function SelectField({ label, optional, hint, error, invalid, size, aside, options, placeholder, disabled, value, ...props }: SelectProps) {
  const id = useId();
  const shell = { label, optional, hint, error, invalid, size, aside, disabled };

  return (
    <FieldShell id={id} {...shell}>
      <div className={controlBoxClass(shell)}>
        <select
          aria-describedby={describedBy(id, shell)}
          aria-invalid={!!error || invalid}
          className={clsx(CONTROL, "h-9 cursor-pointer appearance-none pr-6", !value && "text-ink-400")}
          disabled={disabled}
          id={id}
          value={value}
          {...props}
        >
          <option disabled value="">
            {placeholder ?? "Select…"}
          </option>
          {options.map((option) => (
            <option key={option} className="text-ink-900" value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 text-ink-500" size={16} />
      </div>
    </FieldShell>
  );
}

type TextareaProps = ShellProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, optional, hint, error, invalid, aside, disabled, rows = 4, ...props }: TextareaProps) {
  const id = useId();
  const shell = { label, optional, hint, error, invalid, aside, disabled };

  return (
    <FieldShell id={id} {...shell}>
      <div className={clsx(controlBoxClass(shell), "items-stretch")}>
        <textarea
          aria-describedby={describedBy(id, shell)}
          aria-invalid={!!error || invalid}
          className={clsx(CONTROL, "resize-y py-[9px]")}
          disabled={disabled}
          id={id}
          rows={rows}
          {...props}
        />
      </div>
    </FieldShell>
  );
}
