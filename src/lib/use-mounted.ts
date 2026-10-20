"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during server rendering and the first hydration render, then
 * true once the client is live. Use this instead of a mount effect so
 * persisted client state (cart, theme) can be read without hydration
 * mismatches.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
