"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Misc";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/hooks/useAuth";
import { useUpdateProfile } from "@/hooks/useUsers";
import { errorMessage } from "@/lib/api";
import { INDIAN_STATES, SPECIALIZATIONS } from "@/lib/constants";

export default function EditProfileModal({ onClose, onChangePhoto }: { onClose: () => void; onChangePhoto: () => void }) {
  const { data: me } = useMe();
  const toast = useToast();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    first_name: me?.first_name ?? "",
    last_name: me?.last_name ?? "",
    headline: me?.headline ?? "",
    specialization: me?.specialization ?? "",
    experience_years: String(me?.experience_years ?? ""),
    hospital: me?.hospital ?? "",
    city: me?.city ?? "",
    state: me?.state ?? "",
    about: me?.about ?? "",
  });

  const bind = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [name]: event.target.value }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    update.mutate(
      { ...form, experience_years: Number(form.experience_years) },
      {
        onSuccess: () => {
          onClose();
          toast({ tone: "success", message: "Profile updated." });
        },
      },
    );
  }

  return (
    <Modal
      open
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="edit-profile-form" loading={update.isPending} type="submit">
            Save changes
          </Button>
        </>
      }
      title="Edit profile"
      width={640}
      onClose={onClose}
    >
      <form className="flex flex-col gap-[18px]" id="edit-profile-form" onSubmit={submit}>
        {update.isError && <Alert>{errorMessage(update.error)}</Alert>}

        <div className="flex items-center gap-4">
          <Avatar name={me?.name} size={64} src={me?.avatar_url} />
          <Button icon={Camera} size="sm" variant="secondary" onClick={onChangePhoto}>
            Change photo
          </Button>
        </div>

        <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
          <TextField required label="First name" {...bind("first_name")} />
          <TextField required label="Last name" {...bind("last_name")} />
          <div className="sm:col-span-2">
            <TextField
              hint="Your role, as colleagues would introduce you."
              label="Headline"
              maxLength={120}
              optional
              placeholder="e.g. Consultant Neurologist"
              {...bind("headline")}
            />
          </div>
          <SelectField required label="Specialization" options={SPECIALIZATIONS} {...bind("specialization")} />
          <TextField required label="Years of experience" max={70} min={0} type="number" {...bind("experience_years")} />
          <div className="sm:col-span-2">
            <TextField label="Hospital or clinic" optional {...bind("hospital")} />
          </div>
          <TextField label="City" optional {...bind("city")} />
          <SelectField label="State" optional options={INDIAN_STATES} placeholder="Select state" {...bind("state")} />
          <div className="sm:col-span-2">
            <TextareaField
              hint={`${form.about.length} / 2000 characters`}
              label="About"
              maxLength={2000}
              optional
              rows={4}
              {...bind("about")}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
