import {
  PageToSwMessage,
  SwToPageMessage,
  type PageToSwMessage as PageToSwMessageT,
  type SwToPageMessage as SwToPageMessageT,
} from "@bmad-todo/shared";

export async function registerSw(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  if (!(import.meta as { env?: { PROD?: boolean } }).env?.PROD) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { type: "module" });
  } catch {
    // Registration failures are non-fatal; offline path still works via
    // the outbox + direct fetch.
  }
}

export async function postToSw(msg: PageToSwMessageT): Promise<void> {
  const parsed = PageToSwMessage.safeParse(msg);
  if (!parsed.success) return;
  const ctrl = navigator.serviceWorker?.controller;
  ctrl?.postMessage(parsed.data);
}

export function subscribeToSwMessages(handler: (msg: SwToPageMessageT) => void): () => void {
  const listener = (event: MessageEvent) => {
    const parsed = SwToPageMessage.safeParse(event.data);
    if (parsed.success) handler(parsed.data);
  };
  navigator.serviceWorker?.addEventListener("message", listener);
  return () => {
    navigator.serviceWorker?.removeEventListener("message", listener);
  };
}
