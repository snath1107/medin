import clsx from "clsx";

/** A grey placeholder bar. Skeletons mirror the real layout while data loads. */
export function Bar({ className }: { className: string }) {
  return <div className={clsx("rounded-[3px] bg-paper-200", className)} />;
}

export function PostCardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse-soft border-y border-line-200 bg-white md:rounded-md md:border">
      <div className="px-4 pb-3 pt-3.5 md:px-6 md:pb-4 md:pt-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-paper-200" />
          <div className="flex flex-1 flex-col gap-2">
            <Bar className="h-3 w-[34%]" />
            <Bar className="h-2.5 w-[52%]" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          <Bar className="h-4 w-[86%]" />
          <Bar className="mb-1.5 h-4 w-[58%]" />
          <Bar className="h-[11px] w-full bg-paper-100" />
          <Bar className="h-[11px] w-full bg-paper-100" />
          <Bar className="h-[11px] w-[68%] bg-paper-100" />
        </div>
      </div>
      <div className="flex gap-7 border-t border-line-100 px-6 py-3.5">
        <Bar className="h-[11px] w-[52px] bg-paper-100" />
        <Bar className="h-[11px] w-[72px] bg-paper-100" />
        <Bar className="h-[11px] w-14 bg-paper-100" />
      </div>
    </div>
  );
}

export function PersonRowSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex animate-pulse-soft flex-col gap-3.5 rounded-md border border-line-200 bg-white p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-paper-200" />
          <div className="flex flex-1 flex-col gap-[7px]">
            <Bar className="h-3 w-[45%]" />
            <Bar className="h-2.5 w-[65%] bg-paper-100" />
          </div>
          <Bar className="h-[30px] w-[76px] rounded bg-paper-100" />
        </div>
      ))}
    </div>
  );
}
