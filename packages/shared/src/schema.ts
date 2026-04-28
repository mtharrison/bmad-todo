import { z } from "zod";

export const MAX_TASK_TEXT_LENGTH = 10_000;

export const Task = z.object({
  id: z.string().min(1),
  userNamespace: z.string().min(1),
  text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH),
  completedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Task = z.infer<typeof Task>;

export const CreateTaskInput = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH),
  createdAt: z.number().int(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = z
  .object({
    text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH).optional(),
    completedAt: z.number().int().nullable().optional(),
  })
  .refine((o) => o.text !== undefined || o.completedAt !== undefined, {
    message: "at least one field must be provided",
  });
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const Mutation = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    id: z.string(),
    text: z.string(),
    createdAt: z.number().int(),
    idempotencyKey: z.string(),
  }),
  z.object({
    type: z.literal("update"),
    id: z.string(),
    text: z.string().optional(),
    completedAt: z.number().int().nullable().optional(),
    idempotencyKey: z.string(),
  }),
  z.object({
    type: z.literal("delete"),
    id: z.string(),
    idempotencyKey: z.string(),
  }),
]);
export type Mutation = z.infer<typeof Mutation>;

export const ErrorCode = z.enum([
  "ValidationError",
  "NotFound",
  "Conflict",
  "RateLimited",
  "ServerError",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorEnvelope = z.object({
  error: z.object({ code: ErrorCode, message: z.string() }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
