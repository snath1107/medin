"use client";

import { NotebookPen, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { useComposer } from "@/components/posts/ComposerContext";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ToggleTag } from "@/components/ui/Tag";
import { trackPromptEvent, useEngagementPrompt } from "@/hooks/useEngagementPrompt";

/**
 * An occasional nudge to share something. The backend decides when (at most twice a
 * day, with a 12-hour pause after you dismiss one). We record what the user does with it.
 */
export default function EngagementPrompt() {
  const { data: prompt } = useEngagementPrompt();
  const openComposer = useComposer();
  const [open, setOpen] = useState(false);
  const [handled, setHandled] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Never on first paint: wait a moment so the feed loads first.
  useEffect(() => {
    if (!prompt || handled) return;
    const timer = setTimeout(() => {
      setOpen(true);
      setTags(prompt.suggested_tags.slice(0, 2));
      trackPromptEvent(prompt.id, "shown");
    }, 2500);
    return () => clearTimeout(timer);
  }, [prompt, handled]);

  if (!prompt) return null;

  function dismiss() {
    setOpen(false);
    setHandled(true);
    trackPromptEvent(prompt!.id, "dismissed");
  }

  function writePost() {
    setOpen(false);
    setHandled(true);
    trackPromptEvent(prompt!.id, "clicked_post");
    openComposer({
      draft: { tags },
      onPublished: () => trackPromptEvent(prompt!.id, "posted"),
    });
  }

  return (
    <Modal open={open} width={480} onClose={dismiss}>
      <div className="pt-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <NotebookPen size={20} />
        </span>
        <h2 className="mt-4 font-serif text-[22px] font-semibold leading-[29px] text-pretty">{prompt.body}</h2>
        <p className="mt-2 text-[15.5px] leading-6 text-ink-700">
          A presentation that surprised you, a near-miss, or a guideline that changed how you practise. A few lines is enough.
        </p>

        {prompt.suggested_tags.length > 0 && (
          <>
            <div className="mt-[18px] text-[13px] font-semibold text-ink-500">Start with a topic</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prompt.suggested_tags.map((tag) => (
                <ToggleTag
                  key={tag}
                  selected={tags.includes(tag)}
                  onClick={() => setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])}
                >
                  {tag}
                </ToggleTag>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Maybe later
          </Button>
          <Button icon={Pencil} onClick={writePost}>
            Write a post
          </Button>
        </div>
      </div>
    </Modal>
  );
}
