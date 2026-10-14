import clsx from "clsx";

import type { RichText } from "@/lib/types";

interface Node {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
  content?: Node[];
}

/** Only real web addresses become images (no `javascript:` or `data:` tricks). */
function safeImageUrl(src: unknown) {
  return typeof src === "string" && /^https?:\/\//.test(src) ? src : null;
}

function renderText(node: Node, key: number) {
  let element: React.ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") element = <strong>{element}</strong>;
    if (mark.type === "italic") element = <em>{element}</em>;
  }
  return <span key={key}>{element}</span>;
}

function renderNode(node: Node, key: number): React.ReactNode {
  const children = node.content?.map(renderNode);

  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = safeImageUrl(node.attrs?.src);
      // eslint-disable-next-line @next/next/no-img-element
      return src ? <img key={key} alt="" loading="lazy" src={src} /> : null;
    }
    default:
      return <span key={key}>{children}</span>;
  }
}

/**
 * Shows a saved post or comment. The editor stores documents as JSON; this walks
 * that JSON and turns each node into a normal React element. No HTML strings are
 * injected, so there's no way for a post to run scripts in someone else's browser.
 */
export default function RichTextView({ content, compact }: { content: RichText; compact?: boolean }) {
  return (
    <div className={clsx("rich-text", compact && "rich-text-compact")}>
      {(content.content as Node[] | undefined)?.map(renderNode)}
    </div>
  );
}
