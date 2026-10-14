"use client";

import clsx from "clsx";
import { House, Search, SquarePlus, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useComposer } from "@/components/posts/ComposerContext";
import { useMe } from "@/hooks/useAuth";

const ITEM = "flex flex-col items-center gap-[5px] py-1.5 text-[11px] font-semibold leading-none";

/** Bottom navigation on phones. On wider screens the top nav takes over. */
export default function TabBar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const openComposer = useComposer();

  const tabs = [
    { href: "/feed", label: "Home", icon: House },
    { href: "/search", label: "Search", icon: Search },
    { href: "/connections", label: "Connections", icon: Users },
    { href: me ? `/u/${me.id}` : "/feed", label: "Profile", icon: UserRound },
  ];

  const tab = ({ href, label, icon: Icon }: (typeof tabs)[number]) => (
    <Link
      key={label}
      className={clsx(ITEM, pathname.startsWith(href) ? "text-teal-600" : "text-ink-500")}
      href={href}
    >
      <Icon size={22} />
      {label}
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line-200 bg-white px-1 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5 md:hidden">
      {tab(tabs[0])}
      {tab(tabs[1])}
      <button className={clsx(ITEM, "text-ink-500")} type="button" onClick={() => openComposer()}>
        <SquarePlus size={22} />
        Post
      </button>
      {tab(tabs[2])}
      {tab(tabs[3])}
    </nav>
  );
}
