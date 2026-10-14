"use client";

import { useState } from "react";

import { controlBoxClass } from "@/components/ui/Field";
import { RemovableTag, ToggleTag } from "@/components/ui/Tag";

const MAX_TAGS = 5;
const MAX_LENGTH = 30;

const normalize = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_LENGTH);

/** Type a tag and press Enter or comma. Backspace in an empty box removes the last one. */
export default function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");

  function add(raw: string) {
    const tag = normalize(raw);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setText("");
  }

  const unused = suggestions.map(normalize).filter((tag) => !value.includes(tag));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <span className="text-sm font-semibold">Tags</span>
        <span className="text-[13px] text-ink-500">
          {value.length} of {MAX_TAGS}
        </span>
      </div>
      <div className={`${controlBoxClass({})} flex-wrap gap-1.5 px-2 py-1.5`}>
        {value.map((tag) => (
          <RemovableTag key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))}>
            {tag}
          </RemovableTag>
        ))}
        {value.length < MAX_TAGS && (
          <input
            aria-label="Add a tag"
            className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5 text-[15px] outline-none placeholder:text-ink-400"
            placeholder="Add a tag…"
            value={text}
            onBlur={() => text && add(text)}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add(text);
              }
              if (event.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
            }}
          />
        )}
      </div>
      {unused.length > 0 && value.length < MAX_TAGS && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-500">
          Suggested:
          {unused.map((tag) => (
            <ToggleTag key={tag} dashed onClick={() => add(tag)}>
              {tag}
            </ToggleTag>
          ))}
        </div>
      )}
    </div>
  );
}
