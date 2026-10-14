"use client";

import clsx from "clsx";
import { Ellipsis, Link2, MessageSquare, Pencil, Repeat2, Share2, ThumbsUp, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import RichTextView from "@/components/editor/RichTextView";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Menu, { type MenuItem } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Tag, VisibilityBadge } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import FollowButton from "@/components/users/FollowButton";
import { useDeletePost, useToggleLike, useToggleRepost, useUpdatePost } from "@/hooks/usePosts";
import { errorMessage } from "@/lib/api";
import { formatPostDate } from "@/lib/format";
import type { Post } from "@/lib/types";

import { useComposer } from "./ComposerContext";

// Comments include the editor, so their code loads only when someone opens them.
const CommentSection = dynamic(() => import("@/components/comments/CommentSection"));

interface PostCardProps {
  post: Post;
  /** Start expanded with comments open (the single post page). */
  detailed?: boolean;
}

/** Text that hides on phones, where post actions show icons and counts only. */
const Label = ({ children }: { children: string }) => <span className="hidden md:inline">{children}</span>;

export default function PostCard({ post, detailed = false }: PostCardProps) {
  const [expanded, setExpanded] = useState(detailed);
  const [commentsOpen, setCommentsOpen] = useState(detailed);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toast = useToast();
  const openComposer = useComposer();
  const like = useToggleLike(post);
  const repost = useToggleRepost(post);
  const remove = useDeletePost(post.id);
  const publish = useUpdatePost(post.id);

  const isDraft = post.visibility === "private";
  const postUrl = `/posts/${post.id}`;
  const author = post.author;
  // The backend cuts previews at 180 characters; longer or multi-paragraph posts can expand.
  const canExpand = (post.preview_text?.length ?? 0) >= 175 || (post.content.content?.length ?? 0) > 1;
  const canRepost = !post.is_mine && !post.is_anonymous && post.visibility === "public";

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${postUrl}`);
    toast({ message: "Link copied to clipboard." });
  }

  const menuItems: MenuItem[] = [{ label: "Copy link", icon: Link2, onSelect: copyLink }];
  if (post.is_mine) {
    menuItems.push(
      { label: "Edit post", icon: Pencil, onSelect: () => openComposer({ post }) },
      "divider",
      { label: "Delete post", icon: Trash2, danger: true, onSelect: () => setConfirmDelete(true) },
    );
  }

  const showError = (error: unknown) => toast({ tone: "error", message: errorMessage(error) });

  return (
    <article
      className={clsx(
        "relative border-y bg-white md:rounded-md md:border",
        isDraft ? "border-dashed border-line-400" : "border-line-200",
      )}
    >
      <div className="px-4 pb-3 pt-3.5 md:px-6 md:pb-4 md:pt-5">
        {/* Author */}
        <header className="flex items-start gap-3">
          {author ? (
            <Link href={`/u/${author.id}`}>
              <Avatar name={author.name} size={40} src={author.avatar_url} />
            </Link>
          ) : (
            <Avatar anonymous size={40} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              {author ? (
                <Link className="text-[15px] font-semibold leading-5 text-ink-900 hover:underline" href={`/u/${author.id}`}>
                  {author.name}
                </Link>
              ) : (
                <span className="text-[15px] font-semibold leading-5">Anonymous Doctor</span>
              )}
              {post.is_mine && <span className="text-[13.5px] text-ink-500">(you)</span>}
              {author && !post.is_mine && (
                <>
                  <span className="text-sm text-line-500">·</span>
                  <FollowButton appearance="link" isFollowing={post.is_following_author} user={author} />
                </>
              )}
            </div>
            <div className="mt-px truncate text-[13.5px] leading-[19px] text-ink-500">
              {[
                author ? author.specialization : "Identity hidden",
                author?.hospital,
                formatPostDate(post.created_at),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div className="-mr-2 -mt-1">
            <Menu
              items={menuItems}
              trigger={({ toggle }) => <Button icon={Ellipsis} size="sm" title="More options" variant="icon" onClick={toggle} />}
            />
          </div>
        </header>

        {post.visibility !== "public" && (
          <div className="mt-3 flex">
            <VisibilityBadge visibility={post.visibility} />
          </div>
        )}

        {/* Content */}
        {post.title && (
          <h2 className="mt-3 font-serif text-[19px] font-semibold leading-[26px] tracking-[-0.005em] text-pretty md:text-[21px] md:leading-7">
            <Link className="text-ink-900 hover:underline" href={postUrl}>
              {post.title}
            </Link>
          </h2>
        )}

        {expanded ? (
          <div className="mt-2">
            <RichTextView content={post.content} />
            {!detailed && (
              <button className="mt-3.5 text-[15px] font-semibold text-teal-600" type="button" onClick={() => setExpanded(false)}>
                Show less
              </button>
            )}
          </div>
        ) : (
          <>
            {post.preview_text && (
              <p className="mt-2 text-base leading-[26px] text-ink-700 text-pretty">
                {post.preview_text}
                {canExpand && (
                  <>
                    …{" "}
                    <button className="font-semibold text-teal-600" type="button" onClick={() => setExpanded(true)}>
                      more
                    </button>
                  </>
                )}
              </p>
            )}
            {post.first_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="mt-4 max-h-[420px] w-full rounded border border-line-200 object-cover"
                loading="lazy"
                src={post.first_image}
              />
            )}
          </>
        )}

        {post.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Tag key={tag} href={`/search?q=${encodeURIComponent(tag)}&tab=posts`}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {isDraft ? (
        <div className="flex items-center gap-2 border-t border-dashed border-line-300 px-4 py-2.5 md:px-6">
          <span className="flex-1 text-[13.5px] text-ink-500">Only you can see this draft.</span>
          <Button size="sm" variant="secondary" onClick={() => openComposer({ post })}>
            Edit draft
          </Button>
          <Button
            loading={publish.isPending}
            size="sm"
            onClick={() =>
              publish.mutate(
                { visibility: "public" },
                { onSuccess: () => toast({ tone: "success", message: "Post published." }), onError: showError },
              )
            }
          >
            Publish
          </Button>
        </div>
      ) : (
        <div className="flex items-center border-t border-line-100 px-2 py-1 md:gap-1 md:px-4 md:py-1.5">
          <Button
            count={post.like_count}
            disabled={like.isPending}
            icon={ThumbsUp}
            pressed={post.is_liked}
            size="sm"
            variant="quiet"
            onClick={() => like.mutate(post.is_liked, { onError: showError })}
          >
            <Label>{post.is_liked ? "Liked" : "Like"}</Label>
          </Button>
          <Button
            count={post.comment_count}
            icon={MessageSquare}
            pressed={commentsOpen}
            size="sm"
            variant="quiet"
            onClick={() => setCommentsOpen(!commentsOpen)}
          >
            <Label>Comment</Label>
          </Button>
          <Button
            count={post.repost_count}
            disabled={!canRepost || repost.isPending}
            icon={Repeat2}
            pressed={post.is_reposted}
            size="sm"
            title={canRepost ? undefined : "Only other doctors’ public, named posts can be reposted"}
            variant="quiet"
            onClick={() => repost.mutate(post.is_reposted, { onError: showError })}
          >
            <Label>{post.is_reposted ? "Reposted" : "Repost"}</Label>
          </Button>
          <div className="flex-1" />
          <Button icon={Share2} size="sm" variant="quiet" onClick={copyLink}>
            <Label>Share</Label>
          </Button>
        </div>
      )}

      {commentsOpen && !isDraft && <CommentSection postId={post.id} />}

      <ConfirmDialog
        confirmLabel="Delete post"
        description={
          <>
            {post.title ? <>“{post.title}”</> : "This post"}
            {post.comment_count > 0 && ` and its ${post.comment_count} comments`} will be permanently removed. This can’t be undone.
          </>
        }
        loading={remove.isPending}
        open={confirmDelete}
        title="Delete this post?"
        visual={
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <Trash2 size={17} />
          </span>
        }
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast({ message: "Post deleted." });
            },
            onError: showError,
          })
        }
      />
    </article>
  );
}
