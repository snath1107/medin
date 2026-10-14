"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Invite } from "@/lib/types";

const invitesKey = ["invites"];

export function useMyInvites() {
  return useQuery({ queryKey: invitesKey, queryFn: () => api<Invite[]>("/invites") });
}

/** Creates a single-use invite link to share with a colleague. */
export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api<{ invite_url: string; expires_at: string }>("/invites", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey }),
  });
}
