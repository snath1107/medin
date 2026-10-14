"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, jsonBody } from "@/lib/api";
import type { Me, Profile, SearchResults, Suggestions, UserCard } from "@/lib/types";

import { meKey } from "./useAuth";
import { postKeys, updateCachedPosts } from "./usePosts";

export const profileKey = (userId: number) => ["profile", userId];

export function useProfile(userId: number | undefined) {
  return useQuery({
    queryKey: profileKey(userId ?? 0),
    queryFn: () => api<Profile>(`/users/${userId}`),
    enabled: !!userId, // wait until we know whose profile to load
  });
}

export function useConnections(kind: "followers" | "following") {
  return useQuery({
    queryKey: ["connections", kind],
    queryFn: () => api<UserCard[]>(`/connections/${kind}`),
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: ["connections", "suggestions"],
    queryFn: () => api<Suggestions>("/connections/suggestions"),
  });
}

export function useSearch(query: string, limit: number) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed, limit],
    queryFn: () =>
      api<SearchResults>(`/search?${new URLSearchParams({ q: trimmed, limit: String(limit) })}`),
    enabled: trimmed.length >= 2,
    placeholderData: (previous) => previous, // keep old results visible while typing
  });
}

/** Follow or unfollow, then update every place on screen that shows that doctor. */
export function useToggleFollow(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isFollowing: boolean) =>
      api<{ following: boolean }>(`/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      }),
    onSuccess: ({ following }) => {
      const updateCard = (user: UserCard) =>
        user.id === userId ? { ...user, is_following: following } : user;

      updateCachedPosts(
        queryClient,
        (post) => post.author?.id === userId,
        (post) => ({ ...post, is_following_author: following }),
      );
      queryClient.setQueriesData<UserCard[] | Suggestions>({ queryKey: ["connections"] }, (data) => {
        if (!data) return data;
        if (Array.isArray(data)) return data.map(updateCard);
        return {
          same_hospital: data.same_hospital.map(updateCard),
          same_specialization: data.same_specialization.map(updateCard),
        };
      });
      queryClient.setQueriesData<SearchResults>({ queryKey: ["search"] }, (data) =>
        data ? { ...data, users: data.users.map(updateCard) } : data,
      );

      // Follower counts and "connections only" posts change, so refetch those.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: postKeys.feed });
    },
  });
}

/** After editing your own profile, refresh everything that shows your name or photo. */
function useMyProfileUpdated() {
  const queryClient = useQueryClient();

  return (me: Me) => {
    queryClient.setQueryData(meKey, me);
    queryClient.invalidateQueries({ queryKey: profileKey(me.id) });
    queryClient.invalidateQueries({ queryKey: postKeys.all });
  };
}

export type ProfileInput = Partial<
  Pick<
    Me,
    | "first_name"
    | "last_name"
    | "headline"
    | "specialization"
    | "experience_years"
    | "hospital"
    | "city"
    | "state"
    | "about"
  >
>;

export function useUpdateProfile() {
  const onUpdated = useMyProfileUpdated();

  return useMutation({
    mutationFn: (input: ProfileInput) => api<Me>("/profile", jsonBody("PATCH", input)),
    onSuccess: onUpdated,
  });
}

export function useChangeAvatar() {
  const queryClient = useQueryClient();
  const onUpdated = useMyProfileUpdated();

  return useMutation({
    /** Pass a file to upload a new photo, or null to remove the current one. */
    mutationFn: (file: File | null) => {
      if (!file) return api<{ avatar_url: string | null }>("/profile/avatar", { method: "DELETE" });

      const form = new FormData();
      form.append("file", file);
      return api<{ avatar_url: string | null }>("/profile/avatar", { method: "PUT", body: form });
    },
    onSuccess: ({ avatar_url }) => {
      const me = queryClient.getQueryData<Me>(meKey);
      if (me) onUpdated({ ...me, avatar_url });
    },
  });
}

// ---------- Experience, education and publications on your own profile ----------

export type ProfileSection = "experiences" | "educations" | "publications";

/** Add (no id) or update (with id) one entry in a profile section. */
export function useSaveProfileItem(section: ProfileSection) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id?: number } & Record<string, unknown>) =>
      id
        ? api(`/profile/${section}/${id}`, jsonBody("PUT", data))
        : api(`/profile/${section}`, jsonBody("POST", data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useDeleteProfileItem(section: ProfileSection) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api(`/profile/${section}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
