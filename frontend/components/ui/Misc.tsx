import clsx from "clsx";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

/** On/off switch. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={clsx(
        "relative mt-px h-5 w-9 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-teal-600/25",
        checked ? "bg-teal-600" : "bg-line-400",
      )}
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-[left] duration-150",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}

const ALERT_TONES = {
  danger: { box: "border-danger-200 bg-danger-50 text-danger-800", icon: CircleAlert },
  warning: { box: "border-[#EBD3A6] bg-warning-50 text-[#6B460A]", icon: TriangleAlert },
  success: { box: "border-[#BFDCC9] bg-success-50 text-[#1F5536]", icon: CircleCheck },
};

/** A message for a whole form, shown above its fields. */
export function Alert({ tone = "danger", children }: { tone?: keyof typeof ALERT_TONES; children: React.ReactNode }) {
  const { box, icon: Icon } = ALERT_TONES[tone];
  return (
    <div className={clsx("flex items-start gap-2.5 rounded border px-3.5 py-3 text-[14.5px] leading-[21px]", box)} role="alert">
      <Icon className="mt-0.5 shrink-0" size={17} />
      <span>{children}</span>
    </div>
  );
}

/**
 * A white card with a serif heading row, used for side panels and profile sections.
 * On phones it runs edge to edge (top and bottom borders only), like post cards.
 */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("border-y border-line-200 bg-white md:rounded-md md:border", className)}>
      {title && (
        <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-line-100 py-3 pl-[18px] pr-4">
          <h2 className="font-serif text-[17px] font-semibold leading-6">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small uppercase heading, e.g. "PEOPLE" in search. */
export function Overline({ children }: { children: React.ReactNode }) {
  return <div className="text-[11.5px] font-semibold uppercase leading-4 tracking-[0.06em] text-ink-500">{children}</div>;
}

/** The "Medin" wordmark, linking home. Used in the top nav and on sign in / sign up. */
export function Logo() {
  return (
    <Link
      className="shrink-0 font-serif text-[21px] font-bold leading-none tracking-[-0.01em] text-ink-900 hover:no-underline"
      href="/feed"
    >
      Medin
    </Link>
  );
}

/** The small grey link row at the bottom of side columns. */
export function FooterLinks({ className }: { className?: string }) {
  return (
    <footer className={clsx("flex flex-wrap gap-x-3 gap-y-1 px-1 text-[13px] leading-5 text-ink-500", className)}>
      <span>© 2026 Medin</span>
      <span>Built for doctors, by doctors</span>
    </footer>
  );
}
