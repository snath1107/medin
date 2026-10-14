import { Suspense } from "react";

import ClientOnly from "@/components/layout/ClientOnly";
import TabBar from "@/components/layout/TabBar";
import TopNav from "@/components/layout/TopNav";
import { ComposerProvider } from "@/components/posts/ComposerContext";

/** Shell for every logged-in page: top nav, page content, and the tab bar on phones. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <ComposerProvider>
        <TopNav />
        <main className="mx-auto max-w-[1280px] pb-24 md:px-10 md:pb-12 md:pt-6">
          {/* Pages that read the URL's ?query need a Suspense boundary above them. */}
          <Suspense>{children}</Suspense>
        </main>
        <TabBar />
      </ComposerProvider>
    </ClientOnly>
  );
}
