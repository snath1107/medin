"use client";

import clsx from "clsx";
import { Bold, ImagePlus, Italic, List, ListOrdered, X } from "lucide-react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";

import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, uploadImage } from "@/lib/api";
import type { RichText } from "@/lib/types";

/** An image inside the editor, with a remove button and an "uploading" state. */
function ImageNodeView({ node, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="relative my-2 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className={clsx("max-h-64 rounded border border-line-200", node.attrs.uploading && "opacity-50")}
        src={node.attrs.src}
      />
      {node.attrs.uploading ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-ink-700">
          <Spinner size={14} /> Uploading…
        </span>
      ) : (
        <button
          aria-label="Remove image"
          className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink-900 text-white"
          type="button"
          onClick={deleteNode}
        >
          <X size={12} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Only used while editing; never shown to readers.
      uploading: { default: false, rendered: false },
      uploadId: { default: null, rendered: false },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

function findImage(editor: Editor, uploadId: string) {
  let found: { pos: number; size: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.uploadId === uploadId) found = { pos, size: node.nodeSize };
  });
  return found as { pos: number; size: number } | null;
}

interface RichTextEditorProps {
  initialContent?: RichText | null;
  onChange: (content: RichText, isEmpty: boolean) => void;
  /** Tells the parent to block saving while an image is still uploading. */
  onUploadingChange?: (uploading: boolean) => void;
  placeholder?: string;
  /** Comments: smaller, toolbar below the text, submit button slot on the right. */
  compact?: boolean;
  toolbarEnd?: React.ReactNode;
  autoFocus?: boolean;
}

export default function RichTextEditor({
  initialContent,
  onChange,
  onUploadingChange,
  placeholder = "Write something…",
  compact,
  toolbarEnd,
  autoFocus,
}: RichTextEditorProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const uploads = useRef(0);

  const editor = useEditor({
    extensions: [
      // Only the formatting the toolbar offers.
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
      EditorImage,
      Placeholder.configure({ placeholder }),
    ],
    content: (initialContent as JSONContent | null) ?? "",
    autofocus: autoFocus ? "end" : false,
    immediatelyRender: false, // avoids a mismatch with server rendering
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichText, editor.isEmpty),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  // Re-render the toolbar only when these values change.
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
    }),
  });

  function setUploads(change: number) {
    uploads.current += change;
    onUploadingChange?.(uploads.current > 0);
  }

  /** Shows the picked image straight away (from a local preview URL), then swaps in the uploaded URL. */
  async function handleFile(file: File) {
    if (!editor) return;
    const uploadId = crypto.randomUUID();
    const preview = URL.createObjectURL(file);

    editor
      .chain()
      .focus()
      .insertContent({ type: "image", attrs: { src: preview, uploading: true, uploadId } })
      .run();
    setUploads(1);

    try {
      const url = await uploadImage(file);
      const image = findImage(editor, uploadId);
      if (image) {
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(image.pos, undefined, { src: url, uploading: false, uploadId: null }),
        );
      }
    } catch (error) {
      const image = findImage(editor, uploadId);
      if (image) editor.chain().deleteRange({ from: image.pos, to: image.pos + image.size }).run();
      toast({ tone: "error", message: errorMessage(error) });
    } finally {
      URL.revokeObjectURL(preview);
      setUploads(-1);
    }
  }

  const toolbar = (
    <div className={clsx("flex items-center gap-0.5", compact ? "px-1.5 pb-1.5 pt-0.5" : "rounded-t border-b border-line-100 bg-paper-75 px-1.5 py-1")}>
      <Button icon={Bold} pressed={active?.bold} size="sm" title="Bold" variant="icon" onClick={() => editor?.chain().focus().toggleBold().run()} />
      <Button icon={Italic} pressed={active?.italic} size="sm" title="Italic" variant="icon" onClick={() => editor?.chain().focus().toggleItalic().run()} />
      {!compact && <span className="mx-1 h-[18px] w-px bg-line-200" />}
      <Button icon={List} pressed={active?.bulletList} size="sm" title="Bulleted list" variant="icon" onClick={() => editor?.chain().focus().toggleBulletList().run()} />
      {!compact && (
        <Button icon={ListOrdered} pressed={active?.orderedList} size="sm" title="Numbered list" variant="icon" onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
      )}
      {!compact && <span className="mx-1 h-[18px] w-px bg-line-200" />}
      <Button icon={ImagePlus} size="sm" title="Add image" variant="icon" onClick={() => fileInput.current?.click()} />
      <input
        ref={fileInput}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
      <div className="flex-1" />
      {toolbarEnd}
    </div>
  );

  return (
    <div
      className={clsx(
        "rounded border bg-white transition-[border-color,box-shadow] duration-100",
        focused ? "border-teal-600 ring-3 ring-teal-600/20" : "border-line-300",
      )}
    >
      {!compact && toolbar}
      <EditorContent
        className={clsx(
          "rich-text cursor-text",
          compact ? "rich-text-compact px-3 pb-1 pt-2.5 [&_.ProseMirror]:min-h-11" : "px-3.5 py-3 text-[15.5px] [&_.ProseMirror]:min-h-[190px]",
        )}
        editor={editor}
      />
      {compact && toolbar}
    </div>
  );
}
