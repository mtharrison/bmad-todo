import Database from "better-sqlite3";
import type { Database as DatabaseT } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Kysely, SqliteDialect } from "kysely";

export interface TasksTable {
  id: string;
  user_namespace: string;
  text: string;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface IdempotencyKeysTable {
  key: string;
  user_namespace: string;
  request_hash: string;
  response_status: number;
  response_body: string;
  created_at: number;
}

export interface MigrationsTable {
  filename: string;
  applied_at: number;
}

export interface DB {
  tasks: TasksTable;
  idempotency_keys: IdempotencyKeysTable;
  migrations: MigrationsTable;
}

export interface DbHandles {
  kysely: Kysely<DB>;
  sqlite: DatabaseT;
}

export function createDb(filePath: string): DbHandles {
  if (filePath !== ":memory:") {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const kysely = new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
  return { kysely, sqlite };
}
