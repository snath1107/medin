import clsx from "clsx";
import { UserRound } from "lucide-react";

// Background / text pairs for the initials fallback.
const TINTS = [
  ["#D5E8E9", "#0B5560"],
  ["#EFE6D6", "#6E5320"],
  ["#E1E5EA", "#3B4A5A"],
  ["#F1E1DF", "#7A3B33"],
  ["#E4E8D9", "#4B5A2A"],
];

function initialsOf(name: string) {
  const words = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]!.toUpperCase()).join("");
}

interface AvatarProps {
  name?: string;
  src?: string | null;
  /** 24, 32, 40, 56 or 96 in the design system; any number works. */
  size?: number;
  /** Anonymous posts show a neutral icon instead of a person. */
  anonymous?: boolean;
  className?: string;
}

/** A photo, or the person's initials on a tint picked from their name (so it never changes). */
export default function Avatar({ name = "", src, size = 40, anonymous, className }: AvatarProps) {
  const style = { width: size, height: size };

  if (anonymous) {
    return (
      <span
        aria-label="Anonymous doctor"
        className={clsx("flex shrink-0 items-center justify-center rounded-full bg-paper-200 text-ink-500", className)}
        style={style}
      >
        <UserRound size={Math.round(size * 0.52)} />
      </span>
    );
  }

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={name} className={clsx("shrink-0 rounded-full object-cover", className)} src={src} style={style} />;
  }

  const initials = initialsOf(name);
  const [background, color] = TINTS[((initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0)) % TINTS.length];

  return (
    <span
      aria-label={name}
      className={clsx("flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide", className)}
      role="img"
      style={{ ...style, background, color, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </span>
  );
}
