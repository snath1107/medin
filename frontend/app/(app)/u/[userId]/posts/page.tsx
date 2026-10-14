"use client";

import { ArrowLeft, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { useComposer } from "@/components/posts/ComposerContext";
import PostList from "@/components/posts/PostList";
import Button from "@/components/ui/Button";
import StateMessage from "@/components/ui/StateMessage";
import Tabs from "@/components/ui/Tabs";
import { useUserPosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useUsers";

export default function UserPostsPage() {
  const { userId } = useParams<{ userId: string }>();
  const id = Number(userId);
  const showDrafts = useSearchParams().get("tab") === "drafts";
  const { data: profile } = useProfile(id);
  const posts = useUserPosts(id, showDrafts ? "private" : undefined);
  const openComposer = useComposer();

  return (
    <div className="mx-auto max-w-[744px]">
      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <Link className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-teal-600 hover:underline" href={`/u/${id}`}>
          <ArrowLeft size={16} />
          {profile?.name ?? "Profile"}
        </Link>
        <h1 className="mt-3 font-serif text-[26px] font-semibold leading-[34px]">
          {profile?.is_me ? "Your posts" : `Posts by ${profile?.name ?? "…"}`}
        </h1>
      </div>

      {profile?.is_me ? (
        <div className="mb-4 mt-2 px-4 md:px-0">
          <Tabs
            active={showDrafts ? "drafts" : "all"}
            items={[
              { key: "all", label: "Published", href: `/u/${id}/posts`, count: profile.stats.posts },
              { key: "drafts", label: "Drafts", href: `/u/${id}/posts?tab=drafts`, count: profile.stats.drafts ?? 0 },
            ]}
          />
        </div>
      ) : (
        <div className="h-4" />
      )}

      <PostList
        empty={
          showDrafts ? (
            <StateMessage
              description="Posts you save as “Private draft” stay here until you publish them."
              icon={Lock}
              title="No drafts"
            />
          ) : (
            <StateMessage
              actions={profile?.is_me && <Button onClick={() => openComposer()}>Write a post</Button>}
              description={profile?.is_me ? "Cases you share will appear here. Start with one you learned something from." : undefined}
              icon={FileText}
              title="No posts yet"
            />
          )
        }
        infiniteScroll={false}
        query={posts}
      />
    </div>
  );
}
