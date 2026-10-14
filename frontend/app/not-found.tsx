import { FileX } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import StateMessage from "@/components/ui/StateMessage";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16">
      <StateMessage
        actions={<ButtonLink href="/feed">Back to feed</ButtonLink>}
        card={false}
        description="The page you were looking for doesn’t exist."
        icon={FileX}
        title="Page not found"
      />
    </div>
  );
}
