"use client";

import { useQuery } from "@tanstack/react-query";

import { api, jsonBody } from "@/lib/api";
import type { EngagementPrompt } from "@/lib/types";

export type PromptEvent = "shown" | "dismissed" | "clicked_post" | "posted";

/** The backend decides whether to show a prompt today (it returns null if not). */
export function useEngagementPrompt() {
  return useQuery({
    queryKey: ["engagement-prompt"],
    queryFn: () => api<EngagementPrompt | null>("/engagement/prompts/next"),
    staleTime: Infinity, // ask once per visit
    retry: false,
  });
}

export function trackPromptEvent(promptId: number, eventType: PromptEvent) {
  // Analytics only: if it fails, the user shouldn't notice.
  api(`/engagement/prompts/${promptId}/events`, jsonBody("POST", { event_type: eventType })).catch(
    () => {},
  );
}
