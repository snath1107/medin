"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useCreateInvite, useMyInvites } from "@/hooks/useInvites";
import { errorMessage } from "@/lib/api";
import { formatPostDate } from "@/lib/format";

/** Creates a single-use invite link and lists the ones you've already made. */
export function InviteBody() {
  const toast = useToast();
  const createInvite = useCreateInvite();
  const { data: invites } = useMyInvites();
  const [link, setLink] = useState<string | null>(null);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast({ tone: "success", message: "Invite link copied. Send it to your colleague." });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14.5px] leading-[21px] text-ink-700">
        Medin grows by trust. Each link works once and expires after 14 days.
      </p>

      {link ? (
        <div className="flex items-end gap-2">
          <TextField readOnly label="Invite link" value={link} onFocus={(event) => event.target.select()} />
          <Button icon={Copy} title="Copy link" variant="secondary" onClick={() => copy(link)} />
        </div>
      ) : (
        <Button
          fullWidth
          loading={createInvite.isPending}
          variant="secondary"
          onClick={() =>
            createInvite.mutate(undefined, {
              onSuccess: ({ invite_url }) => {
                setLink(invite_url);
                void copy(invite_url);
              },
              onError: (error) => toast({ tone: "error", message: errorMessage(error) }),
            })
          }
        >
          Create invite link
        </Button>
      )}

      {invites && invites.length > 0 && (
        <ul className="mt-1 border-t border-line-100 pt-3 text-[13.5px] leading-5 text-ink-500">
          {invites.slice(0, 3).map((invite) => (
            <li key={invite.id}>
              {invite.used_by
                ? `Joined: ${invite.used_by.name}`
                : new Date(invite.expires_at) < new Date()
                  ? `Expired · created ${formatPostDate(invite.created_at)}`
                  : `Pending · created ${formatPostDate(invite.created_at)}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Invite a colleague" width={440} onClose={onClose}>
      <InviteBody />
    </Modal>
  );
}
