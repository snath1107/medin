"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders its children only in the browser, never on the server.
 *
 * Logged-in pages load all their data in the browser (with React Query). If the
 * server pre-rendered them, the HTML could disagree with the first browser render
 * as soon as cached data arrives, which React reports as a "hydration mismatch".
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true, // in the browser
    () => false, // on the server
  );
  return isClient ? children : null;
}
