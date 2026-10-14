"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useState } from "react";

import type { Post } from "@/lib/types";

import type { ComposerDraft } from "./PostComposer";

// The composer includes the rich-text editor, which is large. Loading it only when
// someone opens the composer keeps every page's first load smaller.
const PostComposer = dynamic(() => import("./PostComposer"));

interface OpenOptions {
  /** Edit this post instead of writing a new one. */
  post?: Post;
  /** Pre-filled values for a new post (e.g. from the engagement prompt). */
  draft?: ComposerDraft;
  /** Called after a new post is published. */
  onPublished?: (post: Post) => void;
}

const ComposerContext = createContext<(options?: OpenOptions) => void>(() => {});

/**
 * The create/edit post window is rendered once, here, and any component can open it:
 *   const openComposer = useComposer();
 *   openComposer();                 // new post
 *   openComposer({ post });         // edit a post
 */
export const useComposer = () => useContext(ComposerContext);

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<OpenOptions | null>(null);

  return (
    <ComposerContext.Provider value={(next = {}) => setOptions(next)}>
      {children}
      {options && <PostComposer {...options} onClose={() => setOptions(null)} />}
    </ComposerContext.Provider>
  );
}
