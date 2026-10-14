import { Suspense } from "react";

import { Logo } from "@/components/ui/Misc";

/** Shell for sign in and sign up: a slim header, the form, and a footer line. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[52px] items-center justify-between border-b border-line-200 bg-white px-4 md:h-14 md:px-10">
        <Logo />
        <span className="hidden text-sm text-ink-500 sm:block">An invite-only network for doctors</span>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-10 pt-8 md:pt-16">
        <Suspense>{children}</Suspense>
      </main>
      <footer className="py-5 text-center text-[13px] text-ink-500">© 2026 Medin</footer>
    </div>
  );
}
