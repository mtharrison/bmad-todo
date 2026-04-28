import type { Selectable } from "kysely";
import type { Task } from "@bmad-todo/shared";
import type { TasksTable } from "./kysely.js";

export function rowToTask(row: Selectable<TasksTable>): Task {
  return {
    id: row.id,
    userNamespace: row.user_namespace,
    text: row.text,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
