"use client";

import { ArrowLeft, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import PostCard from "@/components/posts/PostCard";
import { controlBoxClass } from "@/components/ui/Field";
import { Overline, Panel } from "@/components/ui/Misc";
import { PersonRowSkeleton, PostCardSkeleton } from "@/components/ui/Skeleton";
import StateMessage from "@/components/ui/StateMessage";
import { Tag } from "@/components/ui/Tag";
import Tabs from "@/components/ui/Tabs";
import DoctorCard from "@/components/users/DoctorCard";
import { useMe } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useUsers";

type Tab = "all" | "people" | "posts";

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "";
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "people" || tabParam === "posts" ? tabParam : "all";
  const [text, setText] = useState(query);
  useEffect(() => setText(query), [query]); // a new search from the top nav
  const { data: me } = useMe();

  // "All" previews a few of each; the other tabs show more.
  const { data, isPending, isError } = useSearch(query, tab === "all" ? 5 : 20);
  const hasQuery = query.trim().length >= 2;

  const link = (nextTab: Tab) => `/search?q=${encodeURIComponent(query)}${nextTab === "all" ? "" : `&tab=${nextTab}`}`;
  const users = data?.users ?? [];
  const posts = data?.posts ?? [];

  return (
    <div className="mx-auto max-w-[744px]">
      {/* Search box (the desktop top nav has one too) */}
      <form
        className="flex items-center gap-1 bg-white px-1.5 py-2 md:hidden"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(text.trim())}`);
        }}
      >
        <button aria-label="Back" className="flex h-9 w-9 items-center justify-center text-ink-700" type="button" onClick={() => router.back()}>
          <ArrowLeft size={17} />
        </button>
        <div className={`${controlBoxClass({})} h-9 min-h-0 flex-1`}>
          <Search className="text-ink-500" size={16} />
          <input
            autoFocus={!query}
            aria-label="Search Medin"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
            enterKeyHint="search"
            placeholder="Search Medin"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      </form>

      {!hasQuery ? (
        <StateMessage
          card={false}
          description="Search by a doctor’s name, hospital or specialty, or by a topic in a post."
          icon={Search}
          title="Search Medin"
        />
      ) : (
        <>
          <h1 className="hidden font-serif text-[26px] font-semibold leading-[34px] md:block">Results for “{query}”</h1>
          <div className="md:mb-5 md:mt-3.5">
            <Tabs
              active={tab}
              items={[
                { key: "all", label: "All", href: link("all") },
                { key: "people", label: "People", href: link("people") },
                { key: "posts", label: "Posts", href: link("posts") },
              ]}
              stretch
            />
          </div>

          {isPending ? (
            <div className="flex flex-col gap-3 pt-3 md:pt-0">
              <PersonRowSkeleton />
              <PostCardSkeleton />
            </div>
          ) : isError ? (
            <StateMessage icon={SearchX} title="Search isn’t working right now" description="Please try again in a moment." tone="danger" />
          ) : users.length === 0 && posts.length === 0 ? (
            <StateMessage
              actions={
                me && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <Tag href={`/search?q=${encodeURIComponent(me.specialization)}`}>{me.specialization}</Tag>
                    {me.hospital && <Tag href={`/search?q=${encodeURIComponent(me.hospital)}`}>{me.hospital}</Tag>}
                  </div>
                )
              }
              description="Check the spelling, or search by a doctor’s name, hospital or specialty."
              icon={SearchX}
              title={`No results for “${query}”`}
            />
          ) : (
            <div className="flex flex-col gap-5 pt-2 md:pt-0">
              {tab !== "posts" && users.length > 0 && (
                <Panel
                  action={tab === "all" && <Link className="text-[14.5px] font-semibold text-teal-600 hover:underline" href={link("people")}>See all people</Link>}
                  title="People"
                >
                  <div className="overflow-hidden md:rounded-b-md">
                    {(tab === "all" ? users.slice(0, 3) : users).map((user) => (
                      <DoctorCard key={user.id} doctor={user} isMe={user.id === me?.id} layout="row" />
                    ))}
                  </div>
                </Panel>
              )}

              {tab !== "people" && posts.length > 0 && (
                <section className="flex flex-col gap-2 md:gap-3">
                  {tab === "all" && (
                    <div className="flex items-baseline justify-between px-4 md:px-0">
                      <span className="hidden font-serif text-[17px] font-semibold md:block">Posts</span>
                      <span className="md:hidden">
                        <Overline>Posts</Overline>
                      </span>
                      <Link className="text-[14.5px] font-semibold text-teal-600 hover:underline" href={link("posts")}>
                        See all posts
                      </Link>
                    </div>
                  )}
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </section>
              )}

              {tab === "people" && users.length === 0 && <StateMessage icon={SearchX} title="No people match" />}
              {tab === "posts" && posts.length === 0 && <StateMessage icon={SearchX} title="No posts match" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
