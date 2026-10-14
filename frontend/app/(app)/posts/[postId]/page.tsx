"use client";

import { ArrowLeft, FileX, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import PostCard from "@/components/posts/PostCard";
import Avatar from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Overline, Panel } from "@/components/ui/Misc";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import StateMessage from "@/components/ui/StateMessage";
import FollowButton from "@/components/users/FollowButton";
import { usePost, useUserPosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useUsers";
import { doctorLine } from "@/lib/format";
import type { UserBrief } from "@/lib/types";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { data: post, isPending, isError } = usePost(Number(postId));

  if (isError) {
    return (
      <div className="mx-auto max-w-[480px] px-4">
        <StateMessage
          actions={
            <>
              <ButtonLink href="/feed">Back to feed</ButtonLink>
              <ButtonLink href="/search" icon={Search} variant="ghost">
                Search Medin
              </ButtonLink>
            </>
          }
          card={false}
          description="It may have been deleted by its author, or it’s shared only with their connections."
          icon={FileX}
          title="This post isn’t available"
        />
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)_304px]">
      <div className="hidden lg:block">
        <Link className="inline-flex items-center gap-1.5 py-1.5 text-[14.5px] font-semibold text-teal-600 hover:underline" href="/feed">
          <ArrowLeft size={16} />
          Back to feed
        </Link>
      </div>

      {isPending ? <PostCardSkeleton /> : <PostCard key={post.id} detailed post={post} />}

      <aside className="hidden flex-col gap-4 lg:flex">
        {post?.author && !post.is_mine && <AboutAuthor author={post.author} currentPostId={post.id} />}
      </aside>
    </div>
  );
}

/** Side column on a post: who wrote it and a few more of their posts. */
function AboutAuthor({ author, currentPostId }: { author: UserBrief; currentPostId: number }) {
  const { data: profile } = useProfile(author.id);
  const { data: posts } = useUserPosts(author.id);
  const more = (posts?.pages[0]?.items ?? []).filter((post) => post.id !== currentPostId).slice(0, 3);

  return (
    <>
      <section className="rounded-md border border-line-200 bg-white p-[18px]">
        <div className="mb-3">
          <Overline>About the author</Overline>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={author.name} size={48} src={author.avatar_url} />
          <div className="min-w-0">
            <Link className="font-serif text-[16.5px] font-semibold leading-[22px] text-ink-900 hover:underline" href={`/u/${author.id}`}>
              {author.name}
            </Link>
            <div className="text-sm leading-5 text-ink-500">{doctorLine(author)}</div>
          </div>
        </div>
        {profile?.about && <p className="mt-3 line-clamp-3 text-[14.5px] leading-[21px] text-ink-700">{profile.about}</p>}
        {profile && (
          <>
            <div className="mb-3.5 mt-3 flex gap-4 text-[13.5px] text-ink-500">
              <span>
                <strong className="text-ink-900">{profile.stats.posts}</strong> cases
              </span>
              <span>
                <strong className="text-ink-900">{profile.stats.followers}</strong> followers
              </span>
            </div>
            <FollowButton fullWidth isFollowing={profile.is_following} user={author} />
          </>
        )}
      </section>

      {more.length > 0 && (
        <Panel title={`More from ${author.name}`}>
          <ul className="py-1.5">
            {more.map((post) => (
              <li key={post.id} className="px-[18px] py-2.5">
                <Link className="font-serif text-[15px] font-semibold leading-[21px] text-ink-900 hover:text-teal-600 hover:underline" href={`/posts/${post.id}`}>
                  {post.title || "Untitled post"}
                </Link>
                <div className="mt-0.5 text-[13px] leading-[18px] text-ink-500">
                  {post.like_count} likes · {post.comment_count} comments
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
