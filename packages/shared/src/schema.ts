import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;
