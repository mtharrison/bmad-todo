import { createSignal } from "solid-js";
import type { SyncState } from "@bmad-todo/shared";

const [syncStateSignal, setSyncStateInternal] =
  createSignal<SyncState>("online");
let offlineTimer: ReturnType<typeof setTimeout> | null = null;

export const syncState = syncStateSignal;

export function setSyncState(next: SyncState): void {
  if (next === "offline") {
    if (offlineTimer === null) {
      offlineTimer = setTimeout(() => {
        setSyncStateInternal("offline");
        offlineTimer = null;
      }, 2000);
    }
    return;
  }
  if (offlineTimer !== null) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }
  setSyncStateInternal(next);
}

export function _resetForTesting(): void {
  if (offlineTimer !== null) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }
  setSyncStateInternal("online");
}
