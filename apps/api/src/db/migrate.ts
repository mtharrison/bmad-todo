import type DatabaseT from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "..", "..", "migrations");

export function runMigrations(
  sqlite: DatabaseT.Database,
  migrationsDir: string = MIGRATIONS_DIR,
): void {
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS migrations (
       filename TEXT PRIMARY KEY,
       applied_at INTEGER NOT NULL
     )`,
  );

  const applied = new Set(
    sqlite
      .prepare("SELECT filename FROM migrations")
      .all()
      .map((r) => (r as { filename: string }).filename),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const insert = sqlite.prepare(
    "INSERT INTO migrations (filename, applied_at) VALUES (?, ?)",
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const tx = sqlite.transaction(() => {
      sqlite.exec(sql);
      insert.run(file, Date.now());
    });
    tx();
  }
}
