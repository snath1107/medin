"use client";

import clsx from "clsx";
import { Globe, Lock, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import RichTextEditor from "@/components/editor/RichTextEditor";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Toggle } from "@/components/ui/Misc";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/hooks/useAuth";
import { useCreatePost, useUpdatePost } from "@/hooks/usePosts";
import { errorMessage } from "@/lib/api";
import { formatPostDate } from "@/lib/format";
import type { Post, PostInput, RichText, Visibility } from "@/lib/types";

import TagInput from "./TagInput";

export interface ComposerDraft {
  title?: string;
  tags?: string[];
  isAnonymous?: boolean;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string; icon: typeof Globe }[] = [
  { value: "public", label: "Public", description: "All Medin doctors", icon: Globe },
  { value: "connections", label: "Connections", description: "Only doctors who follow you", icon: Users },
  { value: "private", label: "Private draft", description: "Only you · publish later", icon: Lock },
];

interface PostComposerProps {
  post?: Post;
  draft?: ComposerDraft;
  onPublished?: (post: Post) => void;
  onClose: () => void;
}

/** One window for writing a new post and for editing an existing one. */
export default function PostComposer({ post, draft, onPublished, onClose }: PostComposerProps) {
  const { data: me } = useMe();
  const toast = useToast();
  const isEditing = !!post;
  const create = useCreatePost();
  const update = useUpdatePost(post?.id ?? 0);
  const saving = create.isPending || update.isPending;

  const [title, setTitle] = useState(post?.title ?? draft?.title ?? "");
  const [content, setContent] = useState<RichText | null>(post?.content ?? null);
  const [contentEmpty, setContentEmpty] = useState(!post);
  const [tags, setTags] = useState<string[]>(post?.tags ?? draft?.tags ?? []);
  const [visibility, setVisibility] = useState<Visibility>(post?.visibility ?? "public");
  const [anonymous, setAnonymous] = useState(post?.is_anonymous ?? draft?.isAnonymous ?? false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!title.trim() && contentEmpty) {
      setError("Add a title or write something before publishing.");
      return;
    }

    const input: PostInput = {
      title: title.trim(),
      content: content ?? { type: "doc", content: [] },
      tags,
      visibility,
      is_anonymous: anonymous,
    };

    const onSuccess = (saved: Post) => {
      onClose();
      onPublished?.(saved);
      toast({
        tone: "success",
        message: isEditing
          ? "Changes saved."
          : visibility === "private"
            ? "Draft saved. Only you can see it."
            : `Post published${visibility === "connections" ? " to your connections" : ""}.`,
        action: { label: "View", href: `/posts/${saved.id}` },
      });
    };
    const onError = (err: unknown) => setError(errorMessage(err));

    if (isEditing) update.mutate(input, { onSuccess, onError });
    else create.mutate(input, { onSuccess, onError });
  }

  const submitLabel = isEditing ? "Save changes" : visibility === "private" ? "Save draft" : "Publish";
  const footerNote = isEditing ? `Published ${formatPostDate(post.created_at)}` : null;

  return (
    <Modal
      open
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={uploading} loading={saving} onClick={submit}>
            {uploading ? "Uploading image…" : submitLabel}
          </Button>
        </>
      }
      footerNote={footerNote}
      title={isEditing ? "Edit post" : "Create post"}
      width={680}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}

        <TextField
          // The dialog focuses this first, instead of the close button.
          autoFocus={!draft?.title}
          label="Title"
          maxLength={200}
          placeholder="A specific, searchable title, e.g. “Exertional syncope in a 19-year-old”"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Details</span>
          <RichTextEditor
            autoFocus={!!draft?.title}
            initialContent={post?.content}
            placeholder="Describe the case, question or insight…"
            onChange={(next, isEmpty) => {
              setContent(next);
              setContentEmpty(isEmpty);
            }}
            onUploadingChange={setUploading}
          />
          <p className="flex items-start gap-2 text-[13.5px] leading-[19px] text-ink-500">
            <ShieldCheck className="mt-0.5 shrink-0 text-success-600" size={15} />
            Remove names, faces, record numbers and dates of birth. Only share images with patient consent.
          </p>
        </div>

        <TagInput suggestions={me ? [me.specialization, "case report"] : []} value={tags} onChange={setTags} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Visibility</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = visibility === option.value;
              return (
                <label
                  key={option.value}
                  className={clsx(
                    "flex cursor-pointer items-start gap-2.5 rounded border p-3 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-teal-600/25",
                    selected ? "border-teal-600 bg-teal-50" : "border-line-300 bg-white hover:border-line-500",
                  )}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    name="visibility"
                    type="radio"
                    value={option.value}
                    onChange={() => setVisibility(option.value)}
                  />
                  <span
                    className={clsx(
                      "mt-px h-[18px] w-[18px] shrink-0 rounded-full bg-white",
                      selected ? "border-[5px] border-teal-600" : "border border-line-500",
                    )}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-[14.5px] font-semibold leading-5">
                      <option.icon className="text-ink-500" size={15} />
                      {option.label}
                    </span>
                    <span className="text-[13px] leading-[18px] text-ink-500">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-start gap-3.5 rounded border border-line-100 bg-paper-75 px-4 py-3.5">
          <Toggle checked={anonymous} label="Post anonymously" onChange={setAnonymous} />
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold leading-5">Post anonymously</div>
            <p className="mt-0.5 text-[13.5px] leading-[19px] text-ink-600 text-pretty">
              Your name, photo and hospital are hidden from everyone, and the post won’t appear on your profile.
            </p>
            {anonymous && me && (
              <div className="mt-2.5 flex items-center gap-2.5 rounded border border-line-200 bg-white px-2.5 py-2 text-[13.5px] text-ink-700">
                <Avatar anonymous size={28} />
                <span>
                  Shown as <strong>Anonymous Doctor</strong> · Identity hidden
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
