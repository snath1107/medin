export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}

/** "Loading more posts" line under an infinite list. */
export function LoadingLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-2 text-sm text-ink-500" role="status">
      <span className="text-teal-600">
        <Spinner />
      </span>
      {children}
    </div>
  );
}
