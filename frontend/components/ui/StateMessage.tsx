import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

const TONES = {
  neutral: "bg-paper-100 text-ink-500",
  teal: "bg-teal-50 text-teal-600",
  danger: "bg-danger-50 text-danger-600",
  warning: "bg-warning-50 text-warning-600",
};

interface StateMessageProps {
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  title: string;
  description?: React.ReactNode;
  /** At most one or two buttons. */
  actions?: React.ReactNode;
  /** Wrap in a white card (default) or sit directly on the page. */
  card?: boolean;
}

/**
 * The single pattern for empty, error and "not found" states:
 * an icon disc, one serif line, one sentence, at most one action.
 */
export default function StateMessage({ icon: Icon, tone = "neutral", title, description, actions, card = true }: StateMessageProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-2.5 px-6 text-center",
        card ? "rounded-md border border-line-200 bg-white py-10" : "py-16",
      )}
    >
      <span className={clsx("flex h-12 w-12 items-center justify-center rounded-full", TONES[tone])}>
        <Icon size={22} />
      </span>
      <h2 className="mt-1 font-serif text-lg font-semibold leading-6">{title}</h2>
      {description && <p className="max-w-[420px] text-[15px] leading-[22px] text-ink-600 text-pretty">{description}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
