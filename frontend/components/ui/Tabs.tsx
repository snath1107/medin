import clsx from "clsx";
import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/**
 * Underline tabs. Each tab is a link, so the selected tab lives in the URL.
 * `stretch`: on phones the tabs share the full width; from tablet up they sit side by side.
 */
export default function Tabs({ items, active, stretch }: { items: TabItem[]; active: string; stretch?: boolean }) {
  return (
    <nav
      className={clsx(
        "border-b border-line-200",
        stretch ? "grid auto-cols-fr grid-flow-col bg-white md:flex md:gap-6 md:bg-transparent" : "flex gap-6",
      )}
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            aria-current={selected ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 py-2.5 text-[15px] font-semibold leading-5",
              stretch && "text-center",
              selected ? "border-teal-600 text-ink-900" : "border-transparent text-ink-600 hover:border-line-400 hover:text-ink-900",
            )}
            href={item.href}
            replace
            scroll={false}
          >
            {item.label}
            {item.count !== undefined && <span className="ml-1 font-normal text-ink-500">{item.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
