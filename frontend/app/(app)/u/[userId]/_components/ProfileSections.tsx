"use client";

import { Building2, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import Button from "@/components/ui/Button";
import { TextField, TextareaField } from "@/components/ui/Field";
import { Alert, Panel } from "@/components/ui/Misc";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useDeleteProfileItem, useSaveProfileItem, useUpdateProfile, type ProfileSection } from "@/hooks/useUsers";
import { errorMessage } from "@/lib/api";
import type { Education, Experience, Profile, Publication } from "@/lib/types";

/** About, Experience, Education and Publications. Owners can add, edit and delete entries in place. */
export default function ProfileSections({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState<{ section: ProfileSection | "about"; item?: Record<string, unknown> } | null>(null);
  const own = profile.is_me;

  const addButton = (section: ProfileSection) =>
    own && (
      <Button icon={Plus} size="sm" variant="ghost" onClick={() => setEditing({ section })}>
        Add
      </Button>
    );

  const editButton = (section: ProfileSection, item: Record<string, unknown>) =>
    own && <Button icon={Pencil} size="sm" title="Edit" variant="icon" onClick={() => setEditing({ section, item })} />;

  const year = (date: string | null) => (date ? new Date(date).getFullYear() : null);

  return (
    <>
      {(profile.about || own) && (
        <Panel
          action={own && <Button icon={Pencil} size="sm" title="Edit about" variant="icon" onClick={() => setEditing({ section: "about" })} />}
          title="About"
        >
          <p className="max-w-[70ch] whitespace-pre-line px-6 pb-[22px] pt-[18px] text-base leading-[26px] text-ink-700 text-pretty">
            {profile.about || <span className="text-ink-500">Tell colleagues about your practice and interests.</span>}
          </p>
        </Panel>
      )}

      {(profile.experiences.length > 0 || own) && (
        <Panel action={addButton("experiences")} title="Experience">
          <Entries
            empty="Add the roles you’ve held."
            items={profile.experiences.map((item: Experience) => ({
              key: item.id,
              icon: Building2,
              title: item.position,
              subtitle: item.organization,
              meta: `${year(item.start_date)} – ${item.is_current || !item.end_date ? "Present" : year(item.end_date)}`,
              edit: editButton("experiences", { ...item }),
            }))}
          />
        </Panel>
      )}

      {(profile.educations.length > 0 || own) && (
        <Panel action={addButton("educations")} title="Education">
          <Entries
            empty="Add your degrees."
            items={profile.educations.map((item: Education) => ({
              key: item.id,
              icon: GraduationCap,
              title: item.degree,
              subtitle: item.institution,
              meta: `${item.start_year} – ${item.end_year ?? "Present"}`,
              edit: editButton("educations", { ...item }),
            }))}
          />
        </Panel>
      )}

      {(profile.publications.length > 0 || own) && (
        <Panel action={addButton("publications")} title="Publications">
          <div className="px-6 py-1">
            {profile.publications.length === 0 && <p className="py-4 text-[15px] text-ink-500">Add papers you’ve published.</p>}
            {profile.publications.map((item: Publication) => (
              <div key={item.id} className="flex gap-3 border-b border-line-100 py-4 last:border-b-0">
                <div className="min-w-0 flex-1">
                  {item.url ? (
                    <a className="font-serif text-base font-semibold leading-[23px] text-ink-900 hover:text-teal-600 hover:underline" href={item.url} rel="noopener noreferrer" target="_blank">
                      {item.title}
                    </a>
                  ) : (
                    <span className="font-serif text-base font-semibold leading-[23px]">{item.title}</span>
                  )}
                  <div className="text-[13.5px] leading-[19px] text-ink-500">
                    {[item.journal && <em key="journal">{item.journal}</em>, item.year, item.doi && <span key="doi" className="font-mono text-xs">{item.doi}</span>]
                      .filter(Boolean)
                      .map((part, index) => (
                        <span key={index}>
                          {index > 0 && " · "}
                          {part}
                        </span>
                      ))}
                  </div>
                </div>
                {editButton("publications", { ...item })}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {editing?.section === "about" && <AboutModal about={profile.about} onClose={() => setEditing(null)} />}
      {editing && editing.section !== "about" && (
        <ItemModal item={editing.item} section={editing.section} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

interface Entry {
  key: number;
  icon: typeof Building2;
  title: string;
  subtitle: string;
  meta: string;
  edit: React.ReactNode;
}

function Entries({ items, empty }: { items: Entry[]; empty: string }) {
  return (
    <div className="px-6 py-1">
      {items.length === 0 && <p className="py-4 text-[15px] text-ink-500">{empty}</p>}
      {items.map(({ key, icon: Icon, title, subtitle, meta, edit }) => (
        <div key={key} className="flex gap-4 border-b border-line-100 py-4 last:border-b-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line-200 bg-paper-100 text-ink-500">
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-[22px]">{title}</div>
            <div className="text-[15px] leading-[21px] text-ink-700">{subtitle}</div>
            <div className="text-[13.5px] leading-[19px] text-ink-500">{meta}</div>
          </div>
          {edit}
        </div>
      ))}
    </div>
  );
}

function AboutModal({ about, onClose }: { about: string | null; onClose: () => void }) {
  const [text, setText] = useState(about ?? "");
  const update = useUpdateProfile();

  return (
    <Modal
      open
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={() => update.mutate({ about: text }, { onSuccess: onClose })}>
            Save
          </Button>
        </>
      }
      title="About"
      onClose={onClose}
    >
      {update.isError && <Alert>{errorMessage(update.error)}</Alert>}
      <TextareaField
        hint={`${text.length} / 2000 characters`}
        label="About you"
        maxLength={2000}
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </Modal>
  );
}

/** Form fields for each kind of entry. */
const FIELDS: Record<ProfileSection, { name: string; label: string; type?: string; optional?: boolean; full?: boolean }[]> = {
  experiences: [
    { name: "position", label: "Position", full: true },
    { name: "organization", label: "Hospital or organisation", full: true },
    { name: "start_date", label: "Start date", type: "date" },
    { name: "end_date", label: "End date", type: "date", optional: true },
    { name: "description", label: "Description", type: "textarea", optional: true, full: true },
  ],
  educations: [
    { name: "degree", label: "Degree", full: true },
    { name: "institution", label: "Institution", full: true },
    { name: "start_year", label: "Start year", type: "number" },
    { name: "end_year", label: "End year", type: "number", optional: true },
  ],
  publications: [
    { name: "title", label: "Title", full: true },
    { name: "journal", label: "Journal", optional: true },
    { name: "year", label: "Year", type: "number", optional: true },
    { name: "url", label: "Link", type: "url", optional: true, full: true },
    { name: "doi", label: "DOI", optional: true, full: true },
  ],
};

const TITLES: Record<ProfileSection, string> = {
  experiences: "experience",
  educations: "education",
  publications: "publication",
};

function ItemModal({ section, item, onClose }: { section: ProfileSection; item?: Record<string, unknown>; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveProfileItem(section);
  const remove = useDeleteProfileItem(section);
  const fields = FIELDS[section];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(({ name }) => [name, item?.[name] == null ? "" : String(item[name])])),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const data: Record<string, unknown> = { id: item?.id };
    for (const field of fields) {
      const value = values[field.name].trim();
      data[field.name] = value === "" ? null : field.type === "number" ? Number(value) : value;
    }
    if (section === "experiences") data.is_current = !data.end_date;
    save.mutate(data, { onSuccess: onClose });
  }

  return (
    <Modal
      open
      footer={
        <>
          {item && (
            <Button
              icon={Trash2}
              loading={remove.isPending}
              variant="ghost"
              onClick={() =>
                remove.mutate(item.id as number, {
                  onSuccess: onClose,
                  onError: (error) => toast({ tone: "error", message: errorMessage(error) }),
                })
              }
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="profile-item-form" loading={save.isPending} type="submit">
            Save
          </Button>
        </>
      }
      title={`${item ? "Edit" : "Add"} ${TITLES[section]}`}
      width={560}
      onClose={onClose}
    >
      <form className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2" id="profile-item-form" onSubmit={submit}>
        {save.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(save.error)}</Alert>
          </div>
        )}
        {fields.map((field) => {
          const props = {
            label: field.label,
            optional: field.optional,
            required: !field.optional,
            value: values[field.name],
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setValues({ ...values, [field.name]: event.target.value }),
          };
          return (
            <div key={field.name} className={field.full ? "sm:col-span-2" : undefined}>
              {field.type === "textarea" ? <TextareaField rows={3} {...props} /> : <TextField type={field.type ?? "text"} {...props} />}
            </div>
          );
        })}
      </form>
    </Modal>
  );
}
