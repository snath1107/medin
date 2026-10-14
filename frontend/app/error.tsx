"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

import Button from "@/components/ui/Button";
import StateMessage from "@/components/ui/StateMessage";

/** Shown when a page crashes. Next.js passes `reset` to try rendering it again. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16">
      <StateMessage
        actions={
          <Button icon={RefreshCw} variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
        card={false}
        description="Something went wrong on our side. Try again in a moment."
        icon={CircleAlert}
        title="Something went wrong"
        tone="danger"
      />
    </div>
  );
}
