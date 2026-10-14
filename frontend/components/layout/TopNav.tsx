"use client";

import clsx from "clsx";
import { ChevronDown, FileText, House, LogOut, Search, UserPlus, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Menu from "@/components/ui/Menu";
import { Logo, Overline } from "@/components/ui/Misc";
import InviteModal from "@/components/users/InviteModal";
import { useLogout, useMe } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useUsers";
import { doctorLine } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/feed", label: "Home", icon: House },
  { href: "/connections", label: "Connections", icon: Users },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line-200 bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1280px] items-center gap-7 px-4 md:h-14 md:px-10">
        <Logo />
        <div className="hidden md:block">
          <SearchBox />
        </div>
        <div className="flex-1" />

        <nav className="hidden h-14 items-stretch gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-[7px] border-y-2 border-t-transparent px-3 text-[14.5px] font-semibold",
                  active ? "border-b-teal-600 text-teal-600" : "border-b-transparent text-ink-700 hover:text-ink-900",
                )}
                href={href}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded text-ink-700 hover:bg-paper-100 md:hidden"
            href="/search"
          >
            <Search size={17} />
          </Link>
          <Menu
            header={
              me && (
                <>
                  <div className="text-[14.5px] font-semibold leading-[19px]">{me.name}</div>
                  <div className="truncate text-[13px] text-ink-500">{me.email}</div>
                </>
              )
            }
            items={[
              { label: "Profile", icon: UserRound, onSelect: () => me && router.push(`/u/${me.id}`) },
              { label: "Invite a colleague", icon: UserPlus, onSelect: () => setInviteOpen(true) },
              { label: "Sign out", icon: LogOut, onSelect: () => logout.mutate() },
            ]}
            trigger={({ toggle }) => (
              <button
                aria-label="Account menu"
                className="flex items-center gap-1.5 rounded p-1 text-ink-700 hover:bg-paper-100"
                type="button"
                onClick={toggle}
              >
                <Avatar name={me?.name} size={32} src={me?.avatar_url} />
                <ChevronDown className="hidden md:block" size={15} />
              </button>
            )}
            width={240}
          />
        </div>
      </div>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}

/** Desktop search with a live dropdown: people first, then posts, then "See all results". */
function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Wait until typing pauses for 250ms before searching, instead of on every key press.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown when the page changes or when clicking elsewhere.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const { data } = useSearch(debounced, 3);
  const showDropdown = open && query.trim().length >= 2;

  function seeAll() {
    if (query.trim().length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-[400px]">
      <div
        className={clsx(
          "flex h-9 items-center gap-2 rounded border px-2.5",
          open ? "border-teal-600 bg-white ring-3 ring-teal-600/20" : "border-line-200 bg-paper-100",
        )}
      >
        <Search className="shrink-0 text-ink-500" size={16} />
        <input
          aria-label="Search Medin"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14.5px] text-ink-900 outline-none placeholder:text-ink-500"
          placeholder="Search doctors, cases, topics"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") seeAll();
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {query && (
          <button aria-label="Clear search" className="flex p-0.5 text-ink-500" type="button" onClick={() => setQuery("")}>
            <X size={15} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-11 z-30 w-[480px] rounded-md border border-line-200 bg-white pt-1.5 shadow-float">
          {data && data.users.length > 0 && (
            <>
              <div className="px-4 pb-1 pt-2">
                <Overline>People</Overline>
              </div>
              {data.users.map((user) => (
                <Link
                  key={user.id}
                  className="flex items-center gap-2.5 px-4 py-2 text-ink-900 hover:bg-paper-100"
                  href={`/u/${user.id}`}
                >
                  <Avatar name={user.name} size={32} src={user.avatar_url} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14.5px] font-semibold leading-[19px]">{user.name}</span>
                    <span className="truncate text-[13px] leading-[18px] text-ink-500">{doctorLine(user)}</span>
                  </span>
                </Link>
              ))}
            </>
          )}
          {data && data.posts.length > 0 && (
            <>
              {data.users.length > 0 && <div className="my-1.5 h-px bg-line-100" />}
              <div className="px-4 pb-1 pt-1.5">
                <Overline>Posts</Overline>
              </div>
              {data.posts.map((post) => (
                <Link key={post.id} className="flex gap-2.5 px-4 py-2 text-ink-900 hover:bg-paper-100" href={`/posts/${post.id}`}>
                  <FileText className="mt-0.5 w-8 shrink-0 text-ink-500" size={16} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-serif text-[15px] font-semibold leading-5">{post.title || "Untitled post"}</span>
                    <span className="text-[13px] leading-[18px] text-ink-500">
                      {post.author?.name ?? "Anonymous Doctor"} · {post.comment_count} comments
                    </span>
                  </span>
                </Link>
              ))}
            </>
          )}
          {data && data.users.length === 0 && data.posts.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-500">No matches yet. Press Enter to search everything.</p>
          )}
          <button
            className="mt-1.5 flex w-full items-center gap-2 border-t border-line-200 px-4 py-3 text-left text-sm font-semibold text-teal-600 hover:bg-teal-50"
            type="button"
            onClick={seeAll}
          >
            <Search size={15} />
            See all results for “{query.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
