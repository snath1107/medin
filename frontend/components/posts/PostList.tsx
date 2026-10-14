"use client";

import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";

import Button from "@/components/ui/Button";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { LoadingLine } from "@/components/ui/Spinner";
import StateMessage from "@/components/ui/StateMessage";
import type { Page, Post } from "@/lib/types";

import PostCard from "./PostCard";

interface PostListProps {
  query: UseInfiniteQueryResult<InfiniteData<Page<Post>>>;
  /** Shown when there are no posts at all. */
  empty: React.ReactNode;
  /** Load the next page when the user scrolls near the end (feed), or with a button (profiles). */
  infiniteScroll?: boolean;
}

/** A list of posts that loads more pages as you go. */
export default function PostList({ query, empty, infiniteScroll = true }: PostListProps) {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  const sentinel = useRef<HTMLDivElement>(null);

  // When the invisible marker at the bottom scrolls into view, fetch the next page.
  useEffect(() => {
    if (!infiniteScroll || !sentinel.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }, // start loading a bit before the end
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [infiniteScroll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 md:gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <StateMessage
        actions={
          <Button icon={RefreshCw} variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        }
        description="Check your connection and try again."
        icon={WifiOff}
        title="Couldn’t load posts"
        tone="danger"
      />
    );
  }

  const posts = data.pages.flatMap((page) => page.items);
  if (posts.length === 0) return <>{empty}</>;

  return (
    <div className="flex flex-col gap-2 md:gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {isFetchingNextPage && infiniteScroll && (
        <>
          <PostCardSkeleton />
          <LoadingLine>Loading more posts</LoadingLine>
        </>
      )}

      {hasNextPage && !infiniteScroll && (
        <div className="px-4 md:px-0">
          <Button fullWidth loading={isFetchingNextPage} variant="secondary" onClick={() => fetchNextPage()}>
            Load more posts
          </Button>
        </div>
      )}

      {!hasNextPage && (
        <div className="flex items-center gap-3 px-4 py-2 text-[13.5px] text-ink-500 md:px-0">
          <span className="h-px flex-1 bg-line-200" />
          You’re all caught up
          <span className="h-px flex-1 bg-line-200" />
        </div>
      )}

      <div ref={sentinel} />
    </div>
  );
}
