import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

import Spinner from "./Spinner";

/**
 * The only button in the app.
 *  primary   – the main action, once per view (Publish, Save)
 *  secondary – everything else (Cancel, Load more)
 *  outline   – Follow
 *  ghost     – low-emphasis teal text (Maybe later, View all)
 *  danger    – destructive confirmations
 *  quiet     – post actions (Like, Comment)
 *  icon      – icon only; always pass a `title`
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "quiet" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-teal-600 bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800",
  secondary: "border-line-300 bg-white text-ink-900 hover:bg-paper-100 active:bg-paper-200",
  outline: "border-teal-600 bg-white text-teal-600 hover:bg-teal-50 active:bg-teal-100",
  ghost: "border-transparent bg-transparent text-teal-600 hover:bg-teal-50 active:bg-teal-100",
  danger:
    "border-danger-600 bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800",
  // Text colour for these two depends on `pressed`, see below.
  quiet: "border-transparent bg-transparent hover:bg-paper-100 active:bg-paper-200",
  icon: "border-transparent bg-transparent hover:bg-paper-100 active:bg-paper-200",
};

const DISABLED: Record<ButtonVariant, string> = {
  primary: "disabled:border-line-200 disabled:bg-line-200 disabled:text-ink-400",
  danger: "disabled:border-line-200 disabled:bg-line-200 disabled:text-ink-400",
  secondary: "disabled:border-line-200 disabled:bg-white disabled:text-ink-300",
  outline: "disabled:border-line-200 disabled:bg-white disabled:text-ink-300",
  ghost: "disabled:bg-transparent disabled:text-ink-300",
  quiet: "disabled:bg-transparent disabled:text-ink-300",
  icon: "disabled:bg-transparent disabled:text-ink-300",
};

const SIZES = {
  sm: { box: "h-[30px] text-[13.5px]", padding: "px-2.5", square: "w-[30px]", icon: 15 },
  md: { box: "h-9 text-[14.5px]", padding: "px-3.5", square: "w-9", icon: 17 },
  lg: { box: "h-[42px] text-[15.5px]", padding: "px-[18px]", square: "w-[42px]", icon: 17 },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  /** A number shown after the label, e.g. a like count. */
  count?: number;
  /** For toggle buttons like Like: shows the "on" state in teal. */
  pressed?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

interface StyleOptions {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  iconOnly?: boolean;
  pressed?: boolean;
  fullWidth?: boolean;
}

/** The classes for a button, shared by <Button> and <ButtonLink>. */
function buttonClassName({ variant = "primary", size = "md", iconOnly, pressed, fullWidth }: StyleOptions) {
  const sizing = SIZES[size];
  return clsx(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border font-semibold leading-none",
    "outline-none transition-[background-color,box-shadow] duration-100 hover:no-underline",
    "focus-visible:ring-3 focus-visible:ring-teal-600/30",
    "disabled:cursor-not-allowed",
    VARIANTS[variant],
    DISABLED[variant],
    sizing.box,
    iconOnly ? sizing.square : sizing.padding,
    fullWidth && "w-full",
    variant === "quiet" && (pressed ? "text-teal-600" : "text-ink-600"),
    variant === "icon" && (pressed ? "text-teal-600" : "text-ink-700"),
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon: Icon,
    count,
    pressed,
    loading,
    fullWidth,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const iconOnly = !children && count === undefined;

  return (
    <button
      ref={ref}
      aria-pressed={pressed}
      className={clsx(buttonClassName({ variant, size, iconOnly, pressed, fullWidth }), loading && "cursor-progress", className)}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <Spinner size={14} /> : Icon && <Icon aria-hidden size={SIZES[size].icon} />}
      {children && <span>{children}</span>}
      {count !== undefined && <span className="font-normal">{count}</span>}
    </button>
  );
});

export default Button;

/** A link that looks like a button (for navigation, e.g. "Find colleagues"). */
export function ButtonLink({
  href,
  variant,
  size = "md",
  icon: Icon,
  fullWidth,
  children,
}: Pick<ButtonProps, "variant" | "size" | "icon" | "fullWidth"> & { href: string; children: React.ReactNode }) {
  return (
    <Link className={buttonClassName({ variant, size, fullWidth })} href={href}>
      {Icon && <Icon aria-hidden size={SIZES[size].icon} />}
      {children}
    </Link>
  );
}
