"use client";

import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import Modal from "@/components/ui/Modal";
import { useChangeAvatar } from "@/hooks/useUsers";
import { errorMessage } from "@/lib/api";
import type { Profile } from "@/lib/types";

/** Upload a new profile photo or remove it (falls back to initials). */
export default function PhotoModal({ open, profile, onClose }: { open: boolean; profile: Profile; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const changeAvatar = useChangeAvatar();

  function upload(file: File | undefined) {
    if (file) changeAvatar.mutate(file, { onSuccess: onClose });
  }

  return (
    <Modal
      open={open}
      footer={
        <>
          {profile.avatar_url && (
            <Button
              icon={Trash2}
              loading={changeAvatar.isPending && changeAvatar.variables === null}
              variant="ghost"
              onClick={() => changeAvatar.mutate(null, { onSuccess: onClose })}
            >
              Remove photo
            </Button>
          )}
          <Button
            icon={Upload}
            loading={changeAvatar.isPending && changeAvatar.variables !== null}
            variant="secondary"
            onClick={() => fileInput.current?.click()}
          >
            Upload new
          </Button>
        </>
      }
      title="Profile photo"
      width={440}
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-4">
        {changeAvatar.isError && <Alert>{errorMessage(changeAvatar.error)}</Alert>}
        <Avatar name={profile.name} size={160} src={profile.avatar_url} />
        <p className="text-center text-sm leading-5 text-ink-600">
          A clear, professional headshot helps colleagues recognise you. Visible to Medin members only.
        </p>
        <label
          className="w-full cursor-pointer rounded border border-dashed border-line-400 p-4 text-center text-sm leading-5 text-ink-600 hover:border-teal-600"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            upload(event.dataTransfer.files[0]);
          }}
        >
          Drag a photo here or <span className="font-semibold text-teal-600">browse</span>
          <span className="block text-[13px] text-ink-500">JPG, PNG or WebP, up to 5 MB</span>
          <input
            ref={fileInput}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            type="file"
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
