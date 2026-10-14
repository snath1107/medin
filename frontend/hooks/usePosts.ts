"use client";

import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, jsonBody } from "@/lib/api";
import type { Page, Post, PostInput, SearchResults, Visibility } from "@/lib/types";

const PAGE_SIZE = 10;

// Every post query key starts with "posts", so all of them can be updated together.
export const postKeys = {
  all: ["posts"] as const,
  feed: ["posts", "feed"] as const,
  top: ["posts", "top"] as const,
  byUser: (userId: number, visibility?: Visibility) => ["posts", "user", userId, visibility ?? "all"] as const,
  detail: (postId: number) => ["posts", "detail", postId] as const,
};

function useInfinitePosts(queryKey: readonly unknown[], path: string, filters = "") {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&before_id=${pageParam}` : "";
      return api<Page<Post>>(`${path}?limit=${PAGE_SIZE}${filters}${cursor}`);
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}

export const useFeed = () => useInfinitePosts(postKeys.feed, "/posts");

/** A doctor's posts. Pass `visibility` to filter, e.g. "private" for your drafts. */
export const useUserPosts = (userId: number, visibility?: Visibility) =>
  useInfinitePosts(
    postKeys.byUser(userId, visibility),
    `/users/${userId}/posts`,
    visibility ? `&visibility=${visibility}` : "",
  );

/** Most-liked public posts of the week, for the feed's side column. */
export function useTopPosts() {
  return useQuery({
    queryKey: postKeys.top,
    queryFn: () => api<Post[]>("/posts/top?limit=5"),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePost(postId: number) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: () => api<Post>(`/posts/${postId}`),
  });
}

/**
 * The same post can be on screen in several places at once: the feed, a profile,
 * its own page, search results. This applies one change to every cached copy,
 * so a like on one screen shows up everywhere.
 *
 * `update` returns the new post, or null to remove it from lists.
 */
export function updateCachedPosts(
  queryClient: QueryClient,
  matches: (post: Post) => boolean,
  update: (post: Post) => Post | null,
) {
  const apply = (posts: Post[]) =>
    posts.flatMap((post) => (matches(post) ? (update(post) ?? []) : [post]));

  queryClient.setQueriesData<InfiniteData<Page<Post>> | Post | Post[]>({ queryKey: postKeys.all }, (data) => {
    if (!data) return data;
    if (Array.isArray(data)) return apply(data);
    if ("pages" in data) {
      return { ...data, pages: data.pages.map((page) => ({ ...page, items: apply(page.items) })) };
    }
    return matches(data) ? (update(data) ?? data) : data;
  });

  queryClient.setQueriesData<SearchResults>({ queryKey: ["search"] }, (data) =>
    data ? { ...data, posts: apply(data.posts) } : data,
  );
}

const byId = (postId: number) => (post: Post) => post.id === postId;

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PostInput) => api<Post>("/posts", jsonBody("POST", input)),
    // Refetch the lists so the new post appears at the top, and the profile counts.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdatePost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    // PATCH: only the fields you send are changed.
    mutationFn: (input: Partial<PostInput>) => api<Post>(`/posts/${postId}`, jsonBody("PATCH", input)),
    onSuccess: (saved) => {
      updateCachedPosts(queryClient, byId(postId), () => saved);
      // Publishing a draft moves it between lists and changes the counts.
      queryClient.invalidateQueries({ queryKey: postKeys.all });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeletePost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api(`/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      updateCachedPosts(queryClient, byId(postId), () => null);
      queryClient.removeQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Like/unlike with an "optimistic update": the button changes instantly, and if
 * the request fails we put it back.
 */
export function useToggleLike(post: Post) {
  const queryClient = useQueryClient();
  const setLiked = (liked: boolean, count: number) =>
    updateCachedPosts(queryClient, byId(post.id), (p) => ({ ...p, is_liked: liked, like_count: count }));

  return useMutation({
    mutationFn: (liked: boolean) =>
      api<{ liked: boolean; like_count: number }>(`/posts/${post.id}/like`, {
        method: liked ? "DELETE" : "POST",
      }),
    onMutate: (liked) => setLiked(!liked, post.like_count + (liked ? -1 : 1)),
    onSuccess: (result) => setLiked(result.liked, result.like_count),
    onError: (_error, liked) => setLiked(liked, post.like_count),
  });
}

export function useToggleRepost(post: Post) {
  const queryClient = useQueryClient();
  const setReposted = (reposted: boolean, count: number) =>
    updateCachedPosts(queryClient, byId(post.id), (p) => ({
      ...p,
      is_reposted: reposted,
      repost_count: count,
    }));

  return useMutation({
    mutationFn: (reposted: boolean) =>
      api<{ reposted: boolean; repost_count: number }>(`/posts/${post.id}/repost`, {
        method: reposted ? "DELETE" : "POST",
      }),
    onMutate: (reposted) => setReposted(!reposted, post.repost_count + (reposted ? -1 : 1)),
    onSuccess: (result) => setReposted(result.reposted, result.repost_count),
    onError: (_error, reposted) => setReposted(reposted, post.repost_count),
  });
}
