import type { Task } from "@bmad-todo/shared";

let counter = 0;

export function makeTestTask(partial: Partial<Task> = {}): Task {
  const now = Date.now();
  counter += 1;
  return {
    id: partial.id ?? `test-${counter}`,
    userNamespace: partial.userNamespace ?? "default",
    text: partial.text ?? "test task",
    completedAt: partial.completedAt ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}
