import { z } from "zod";

export const SyncState = z.enum(["online", "offline", "conflict", "error"]);
export type SyncState = z.infer<typeof SyncState>;

export const SwToPageMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sync-state"), state: SyncState }),
  z.object({ type: z.literal("mutation-applied"), id: z.string() }),
  z.object({
    type: z.literal("mutation-rejected"),
    id: z.string(),
    reason: z.string(),
  }),
]);
export type SwToPageMessage = z.infer<typeof SwToPageMessage>;

export const PageToSwMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("flush-outbox") }),
  z.object({ type: z.literal("reconcile") }),
]);
export type PageToSwMessage = z.infer<typeof PageToSwMessage>;
