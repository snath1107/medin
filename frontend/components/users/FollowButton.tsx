"use client";

import { Check, UserPlus } from "lucide-react";
import { useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useToggleFollow } from "@/hooks/useUsers";
import { errorMessage } from "@/lib/api";

interface FollowButtonProps {
  user: { id: number; name: string; avatar_url?: string | null };
  isFollowing: boolean;
  /** "button" for cards and profiles, "link" for the small text link on post cards. */
  appearance?: "button" | "link";
  size?: "sm" | "md";
  fullWidth?: boolean;
}

/** Following is instant; unfollowing asks first. The same button is used everywhere. */
export default function FollowButton({ user, isFollowing, appearance = "button", size = "sm", fullWidth }: FollowButtonProps) {
  const toggle = useToggleFollow(user.id);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  function follow() {
    toggle.mutate(false, { onError: (error) => toast({ tone: "error", message: errorMessage(error) }) });
  }

  function unfollow() {
    toggle.mutate(true, {
      onSuccess: () => {
        setConfirming(false);
        toast({ message: `Unfollowed ${user.name}.`, action: { label: "Undo", onClick: follow } });
      },
      onError: (error) => toast({ tone: "error", message: errorMessage(error) }),
    });
  }

  const onClick = () => (isFollowing ? setConfirming(true) : follow());

  return (
    <>
      {appearance === "link" ? (
        <button
          className={isFollowing ? "text-sm font-semibold text-ink-500" : "text-sm font-semibold text-teal-600 hover:underline"}
          disabled={toggle.isPending}
          type="button"
          onClick={onClick}
        >
          {isFollowing ? "✓ Following" : "Follow"}
        </button>
      ) : (
        <Button
          fullWidth={fullWidth}
          icon={isFollowing ? Check : UserPlus}
          loading={toggle.isPending && !confirming}
          size={size}
          variant={isFollowing ? "secondary" : "outline"}
          onClick={onClick}
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      )}

      <ConfirmDialog
        confirmLabel="Unfollow"
        description="Their posts will stop appearing in your feed. They won’t be notified, and you can follow again any time."
        loading={toggle.isPending}
        open={confirming}
        title={`Unfollow ${user.name}?`}
        visual={<Avatar name={user.name} size={40} src={user.avatar_url} />}
        onClose={() => setConfirming(false)}
        onConfirm={unfollow}
      />
    </>
  );
}
