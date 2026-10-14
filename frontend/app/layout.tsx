import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import clsx from "clsx";

import { fontMono, fontSans, fontSerif } from "@/config/fonts";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Medin", template: "%s | Medin" },
  description: "An invite-only network where doctors share cases and learn from each other.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={clsx(fontSans.variable, fontSerif.variable, fontMono.variable)} lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
