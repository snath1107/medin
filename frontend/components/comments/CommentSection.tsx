"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import RichTextEditor from "@/components/editor/RichTextEditor";
import RichTextView from "@/components/editor/RichTextView";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/hooks/useAuth";
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from "@/hooks/useComments";
import { errorMessage } from "@/lib/api";
import { formatPostDate } from "@/lib/format";
import type { Comment, RichText } from "@/lib/types";

/** The comment box plus the list of comments under a post. */
export default function CommentSection({ postId }: { postId: number }) {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useComments(postId, true);
  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="border-t border-line-200 bg-paper-75 px-4 pb-2.5 pt-3.5 md:rounded-b-md md:px-6 md:pb-3 md:pt-4">
      <CommentComposer postId={postId} />

      <div className="mt-1.5">
        {isPending && <p className="py-3.5 text-sm text-ink-500">Loading comments…</p>}
        {isError && <p className="py-3.5 text-sm text-danger-600">Couldn’t load comments.</p>}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {hasNextPage && (
        <div className="pb-0.5 pt-2.5">
          <Button icon={ChevronDown} loading={isFetchingNextPage} size="sm" variant="ghost" onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? "Loading comments…" : "Load more comments"}
          </Button>
        </div>
      )}
    </section>
  );
}

function CommentComposer({ postId }: { postId: number }) {
  const { data: me } = useMe();
  const toast = useToast();
  const create = useCreateComment(postId);
  const [content, setContent] = useState<RichText | null>(null);
  const [empty, setEmpty] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Changing the key gives a fresh, empty editor after posting.
  const [editorKey, setEditorKey] = useState(0);

  function submit() {
    if (!content) return;
    create.mutate(content, {
      onSuccess: () => {
        setContent(null);
        setEmpty(true);
        setEditorKey((key) => key + 1);
      },
      onError: (error) => toast({ tone: "error", message: errorMessage(error) }),
    });
  }

  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={me?.name} size={32} src={me?.avatar_url} />
      <div className="min-w-0 flex-1">
        <RichTextEditor
          key={editorKey}
          compact
          placeholder="Add a comment…"
          toolbarEnd={
            <Button disabled={empty || uploading} loading={create.isPending} size="sm" onClick={submit}>
              Comment
            </Button>
          }
          onChange={(next, isEmpty) => {
            setContent(next);
            setEmpty(isEmpty);
          }}
          onUploadingChange={setUploading}
        />
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RichText>(comment.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateComment(comment.post_id, comment.id);
  const remove = useDeleteComment(comment.post_id, comment.id);
  const showError = (error: unknown) => toast({ tone: "error", message: errorMessage(error) });

  return (
    <div className="flex gap-2.5 border-b border-line-100 py-3.5 last:border-b-0">
      <Link href={`/u/${comment.author.id}`}>
        <Avatar name={comment.author.name} size={32} src={comment.author.avatar_url} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] leading-[19px] text-ink-500">
          <Link className="text-[14.5px] font-semibold text-ink-900 hover:underline" href={`/u/${comment.author.id}`}>
            {comment.author.name}
          </Link>
          {" · "}
          {comment.author.specialization} · {formatPostDate(comment.created_at)}
        </div>

        {editing ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <RichTextEditor autoFocus compact initialContent={comment.content} onChange={setDraft} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                loading={update.isPending}
                size="sm"
                onClick={() => update.mutate(draft, { onSuccess: () => setEditing(false), onError: showError })}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <RichTextView compact content={comment.content} />
          </div>
        )}

        {comment.is_mine && !editing && (
          <div className="mt-1.5 flex gap-4 text-[13px] font-semibold text-ink-500">
            <button className="hover:text-teal-600" type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="hover:text-danger-600" type="button" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Delete comment"
        description="Your comment will be permanently removed. This can’t be undone."
        loading={remove.isPending}
        open={confirmDelete}
        title="Delete this comment?"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(undefined, { onError: showError })}
      />
    </div>
  );
}
