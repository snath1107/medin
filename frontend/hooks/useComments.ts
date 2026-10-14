"use client";

import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api, jsonBody } from "@/lib/api";
import type { Comment, Page, RichText } from "@/lib/types";

import { updateCachedPosts } from "./usePosts";

const PAGE_SIZE = 5;

const commentsKey = (postId: number) => ["comments", postId];

/** Comments are only fetched once `enabled` is true (when the user opens them). */
export function useComments(postId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentsKey(postId),
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&before_id=${pageParam}` : "";
      return api<Page<Comment>>(`/posts/${postId}/comments?limit=${PAGE_SIZE}${cursor}`);
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled,
  });
}

/** Helpers for changing the cached comment pages of one post. */
function useCommentCache(postId: number) {
  const queryClient = useQueryClient();

  const editPages = (change: (pages: Page<Comment>[]) => Page<Comment>[]) =>
    queryClient.setQueryData<InfiniteData<Page<Comment>>>(commentsKey(postId), (data) =>
      data ? { ...data, pages: change(data.pages) } : data,
    );

  const changeCount = (delta: number) =>
    updateCachedPosts(
      queryClient,
      (post) => post.id === postId,
      (post) => ({ ...post, comment_count: post.comment_count + delta }),
    );

  return { editPages, changeCount };
}

export function useCreateComment(postId: number) {
  const { editPages, changeCount } = useCommentCache(postId);

  return useMutation({
    mutationFn: (content: RichText) =>
      api<Comment>(`/posts/${postId}/comments`, jsonBody("POST", { content })),
    onSuccess: (comment) => {
      // Newest first, so it goes at the top of the first page.
      editPages(([first, ...rest]) => [{ ...first, items: [comment, ...first.items] }, ...rest]);
      changeCount(1);
    },
  });
}

export function useUpdateComment(postId: number, commentId: number) {
  const { editPages } = useCommentCache(postId);

  return useMutation({
    mutationFn: (content: RichText) =>
      api<Comment>(`/comments/${commentId}`, jsonBody("PATCH", { content })),
    onSuccess: (saved) =>
      editPages((pages) =>
        pages.map((page) => ({
          ...page,
          items: page.items.map((c) => (c.id === commentId ? saved : c)),
        })),
      ),
  });
}

export function useDeleteComment(postId: number, commentId: number) {
  const { editPages, changeCount } = useCommentCache(postId);

  return useMutation({
    mutationFn: () => api(`/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => {
      editPages((pages) =>
        pages.map((page) => ({ ...page, items: page.items.filter((c) => c.id !== commentId) })),
      );
      changeCount(-1);
    },
  });
}
