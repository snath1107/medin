import clsx from "clsx";
import { Check, Lock, Plus, Users, X } from "lucide-react";
import Link from "next/link";

const TAG_BASE =
  "inline-flex h-6 items-center gap-1 rounded border px-2 text-[12.5px] font-semibold leading-none";

/** A topic. Clickable tags search for posts with that topic. */
export function Tag({ children, href }: { children: React.ReactNode; href?: string }) {
  const className = clsx(
    TAG_BASE,
    "border-line-200 bg-paper-100 text-ink-700",
    href && "hover:border-teal-200 hover:bg-teal-50 hover:text-teal-text",
  );
  return href ? (
    <Link className={className} href={href}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** A tag with an × button, used in tag inputs. */
export function RemovableTag({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className={clsx(TAG_BASE, "border-line-200 bg-paper-100 pr-1 text-ink-700")}>
      {children}
      <button
        aria-label={`Remove ${children}`}
        className="rounded text-ink-500 hover:text-ink-900"
        type="button"
        onClick={onRemove}
      >
        <X size={13} />
      </button>
    </span>
  );
}

/** A selectable topic chip (engagement prompt, suggested tags). */
export function ToggleTag({
  children,
  selected,
  dashed,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  /** A suggestion you can add ("+ MRI"). */
  dashed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={clsx(
        TAG_BASE,
        "cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-teal-600/30",
        selected && "border-teal-600 bg-teal-600 text-white",
        !selected && dashed && "border-dashed border-line-400 bg-white text-ink-500 hover:text-ink-900",
        !selected && !dashed && "border-line-200 bg-paper-100 text-ink-700 hover:border-teal-200 hover:bg-teal-50",
      )}
      type="button"
      onClick={onClick}
    >
      {selected && <Check size={12} />}
      {dashed && !selected && <Plus size={12} />}
      {children}
    </button>
  );
}

/** Status labels like "Connections only". Not clickable. */
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "teal" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] items-center gap-1.5 rounded px-2 text-[12.5px] font-semibold leading-none",
        tone === "neutral" && "bg-paper-100 text-ink-700",
        tone === "teal" && "bg-teal-50 text-teal-text",
        tone === "warning" && "bg-warning-50 text-warning-700",
      )}
    >
      {children}
    </span>
  );
}

export function VisibilityBadge({ visibility }: { visibility: "public" | "connections" | "private" }) {
  if (visibility === "connections") {
    return (
      <Badge tone="teal">
        <Users size={13} /> Connections only
      </Badge>
    );
  }
  if (visibility === "private") {
    return (
      <Badge tone="warning">
        <Lock size={13} /> Private draft
      </Badge>
    );
  }
  return null;
}
