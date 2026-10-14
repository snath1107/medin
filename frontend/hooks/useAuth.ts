"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api, jsonBody } from "@/lib/api";
import type { Me } from "@/lib/types";

export const meKey = ["me"];

/** The logged-in user. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api<Me>("/auth/me"),
    staleTime: Infinity, // only changes when we change it ourselves
  });
}

export interface SignupInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  specialization: string;
  experience_years: number;
  hospital?: string;
  city?: string;
  state?: string;
  doctor_id?: string;
  invite_token: string;
}

function useAuthMutation<TInput>(path: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: TInput) => api<Me>(path, jsonBody("POST", input)),
    onSuccess: (me) => {
      // Start from a clean cache so nothing from a previous account is shown.
      queryClient.clear();
      queryClient.setQueryData(meKey, me);
      router.replace("/feed");
    },
  });
}

export const useLogin = () => useAuthMutation<{ email: string; password: string }>("/auth/login");
export const useSignup = () => useAuthMutation<SignupInput>("/auth/signup");

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/signin");
    },
  });
}
