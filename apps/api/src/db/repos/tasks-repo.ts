import type { Kysely } from "kysely";
import type { Task } from "@bmad-todo/shared";
import type { DB } from "../kysely.js";
import { rowToTask } from "../mappers.js";

export class TasksRepo {
  constructor(private readonly db: Kysely<DB>) {}

  async listActive(userNamespace: string): Promise<Task[]> {
    const rows = await this.db
      .selectFrom("tasks")
      .selectAll()
      .where("user_namespace", "=", userNamespace)
      .where("deleted_at", "is", null)
      .orderBy("id", "desc")
      .execute();
    return rows.map(rowToTask);
  }

  async create(input: {
    id: string;
    userNamespace: string;
    text: string;
    createdAt: number;
  }): Promise<Task> {
    const now = Date.now();
    const row = await this.db
      .insertInto("tasks")
      .values({
        id: input.id,
        user_namespace: input.userNamespace,
        text: input.text,
        completed_at: null,
        created_at: input.createdAt,
        updated_at: now,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToTask(row);
  }

  async update(
    id: string,
    userNamespace: string,
    patch: { text?: string; completedAt?: number | null },
  ): Promise<Task | null> {
    const updates: {
      text?: string;
      completed_at?: number | null;
      updated_at: number;
    } = { updated_at: Date.now() };
    if (patch.text !== undefined) updates.text = patch.text;
    if (patch.completedAt !== undefined) updates.completed_at = patch.completedAt;
    const row = await this.db
      .updateTable("tasks")
      .set(updates)
      .where("id", "=", id)
      .where("user_namespace", "=", userNamespace)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();
    return row ? rowToTask(row) : null;
  }

  async softDelete(id: string, userNamespace: string): Promise<boolean> {
    const now = Date.now();
    const result = await this.db
      .updateTable("tasks")
      .set({ deleted_at: now, updated_at: now })
      .where("id", "=", id)
      .where("user_namespace", "=", userNamespace)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  }
}
