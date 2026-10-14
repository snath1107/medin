"use client";

import { ArrowRight, CircleHelp, ExternalLink, FileText, ImagePlus, Lock, Pencil, Users, VenetianMask } from "lucide-react";
import Link from "next/link";

import { useComposer } from "@/components/posts/ComposerContext";
import PostList from "@/components/posts/PostList";
import Avatar from "@/components/ui/Avatar";
import Button, { ButtonLink } from "@/components/ui/Button";
import { FooterLinks, Panel } from "@/components/ui/Misc";
import StateMessage from "@/components/ui/StateMessage";
import { useMe } from "@/hooks/useAuth";
import { useFeed, useTopPosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useUsers";

import EngagementPrompt from "./_components/EngagementPrompt";

// Real journal home pages, for the reading list in the side column.
const JOURNALS = [
  { name: "The New England Journal of Medicine", href: "https://www.nejm.org" },
  { name: "The Lancet", href: "https://www.thelancet.com" },
  { name: "The BMJ", href: "https://www.bmj.com" },
  { name: "JAMA Network", href: "https://jamanetwork.com" },
  { name: "Indian Journal of Medical Research", href: "https://journals.lww.com/ijmr" },
];

export default function FeedPage() {
  const feed = useFeed();
  const openComposer = useComposer();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)_304px]">
      <aside className="sticky top-20 hidden flex-col gap-4 lg:flex">
        <IdentityCard />
      </aside>

      <div className="flex min-w-0 flex-col gap-2 md:gap-3">
        <ComposerPrompt />
        <PostList
          empty={
            <StateMessage
              actions={
                <>
                  <ButtonLink href="/connections">Find colleagues</ButtonLink>
                  <Button icon={Pencil} variant="secondary" onClick={() => openComposer()}>
                    Write your first post
                  </Button>
                </>
              }
              description="Follow colleagues to see their cases here, or start the conversation yourself."
              icon={Users}
              title="Your feed is quiet for now"
              tone="teal"
            />
          }
          query={feed}
        />
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        <TopPosts />
        <Panel title="Read the latest research">
          <ul className="py-1.5">
            {JOURNALS.map((journal) => (
              <li key={journal.href}>
                <a
                  className="flex items-center justify-between gap-2 px-[18px] py-2 text-[14.5px] font-semibold leading-5 text-ink-900 hover:text-teal-600 hover:underline"
                  href={journal.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {journal.name}
                  <ExternalLink className="shrink-0 text-ink-500" size={13} />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
        <FooterLinks />
      </aside>

      <EngagementPrompt />
    </div>
  );
}

/** Left column: who you are, your numbers, and a link to your drafts. */
function IdentityCard() {
  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.id);
  if (!me) return <div className="h-64 animate-pulse-soft rounded-md border border-line-200 bg-white" />;

  const stats = profile?.stats;

  return (
    <>
      <div className="rounded-md border border-line-200 bg-white p-5">
        <Avatar name={me.name} size={56} src={me.avatar_url} />
        <Link className="mt-3 block font-serif text-lg font-semibold leading-6 text-ink-900 hover:underline" href={`/u/${me.id}`}>
          {me.name}
        </Link>
        <div className="mt-0.5 text-[14.5px] font-semibold leading-5 text-ink-700">{me.specialization}</div>
        <div className="text-sm leading-5 text-ink-500">{[me.hospital, me.city].filter(Boolean).join(", ")}</div>
        <div className="my-4 grid grid-cols-3 border-y border-line-100 py-3">
          {[
            ["Cases", stats?.posts],
            ["Followers", stats?.followers],
            ["Following", stats?.following],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-base font-semibold leading-5">{value ?? "–"}</div>
              <div className="text-[12.5px] leading-4 text-ink-500">{label}</div>
            </div>
          ))}
        </div>
        <Link className="flex items-center gap-1.5 text-[14.5px] font-semibold text-teal-600 hover:underline" href={`/u/${me.id}`}>
          View profile <ArrowRight size={15} />
        </Link>
      </div>
      <Link
        className="flex items-center justify-between px-1 text-[14.5px] text-ink-700 hover:text-teal-600"
        href={`/u/${me.id}/posts?tab=drafts`}
      >
        <span className="flex items-center gap-2">
          <Lock className="text-ink-500" size={15} />
          Your drafts
        </span>
        <span className="text-ink-500">{stats?.drafts ?? 0}</span>
      </Link>
    </>
  );
}

/** "Share a case…" box at the top of the feed. */
function ComposerPrompt() {
  const { data: me } = useMe();
  const openComposer = useComposer();

  return (
    <div className="border-b border-line-200 bg-white md:rounded-md md:border">
      <div className="flex items-center gap-2.5 px-4 py-3 md:gap-3 md:px-5 md:py-4">
        <Avatar className="hidden md:flex" name={me?.name} size={40} src={me?.avatar_url} />
        <button
          className="h-10 flex-1 rounded border border-line-300 bg-paper-50 px-3.5 text-left text-[15px] text-ink-500 hover:border-line-500 hover:bg-white"
          type="button"
          onClick={() => openComposer()}
        >
          <span className="hidden md:inline">Share a case, question or clinical insight…</span>
          <span className="md:hidden">Share a case or question…</span>
        </button>
        <Button className="md:hidden" icon={ImagePlus} title="Add image" variant="icon" onClick={() => openComposer()} />
      </div>
      <div className="hidden gap-1 border-t border-line-100 px-3.5 pb-2 pt-1 md:flex">
        <Button icon={FileText} size="sm" variant="quiet" onClick={() => openComposer({ draft: { tags: ["case report"] } })}>
          Case
        </Button>
        <Button icon={CircleHelp} size="sm" variant="quiet" onClick={() => openComposer({ draft: { tags: ["question"] } })}>
          Question
        </Button>
        <Button icon={ImagePlus} size="sm" variant="quiet" onClick={() => openComposer()}>
          Image
        </Button>
        <div className="flex-1" />
        <Button icon={VenetianMask} size="sm" variant="quiet" onClick={() => openComposer({ draft: { isAnonymous: true } })}>
          Post anonymously
        </Button>
      </div>
    </div>
  );
}

function TopPosts() {
  const { data: posts, isPending } = useTopPosts();

  return (
    <Panel title="Top posts this week">
      {isPending ? (
        <p className="px-[18px] py-4 text-sm text-ink-500">Loading…</p>
      ) : !posts?.length ? (
        <p className="px-[18px] py-4 text-sm text-ink-500">No popular posts yet this week.</p>
      ) : (
        <ol className="py-1.5">
          {posts.map((post, index) => (
            <li key={post.id} className="flex gap-3 px-[18px] py-2.5">
              <span className="w-3.5 shrink-0 font-serif text-[15px] font-semibold leading-[21px] text-ink-400">{index + 1}</span>
              <div className="min-w-0">
                <Link
                  className="font-serif text-[15px] font-semibold leading-[21px] text-ink-900 text-pretty hover:text-teal-600 hover:underline"
                  href={`/posts/${post.id}`}
                >
                  {post.title || post.preview_text?.slice(0, 80) || "Untitled post"}
                </Link>
                <div className="mt-0.5 text-[13px] leading-[18px] text-ink-500">
                  {post.author?.specialization ?? "Anonymous"} · {post.like_count} likes
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
