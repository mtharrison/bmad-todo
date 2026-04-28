# Story 1.9: Cross-Session Persistence and Offline-First Sync

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sam,
I want my tasks to be available every time I open the app — even offline — and to never see a loading spinner for any action I take,
so that the app feels instant and trustworthy regardless of my network state.

## Acceptance Criteria

1. **Given** Sam has tasks from a previous session (cached in IndexedDB), **When** the app opens, **Then** tasks render from the local cache **before any network response arrives**; no skeleton, spinner, or placeholder is rendered at any point. The first paint of `<TaskList>` reads `sync/idb.tasks` synchronously-on-mount and Solid's reactive store is hydrated from that cached snapshot. (The `tasks` signal does NOT default to `[]` after Story 1.9 — it defaults to the cached snapshot loaded eagerly during `main.tsx` bootstrap.)

2. **Given** Sam is online and adds, completes, edits, or deletes a task, **When** the action is committed, **Then** (a) the UI updates synchronously (optimistic mutation; same code path as Stories 1.3–1.6); (b) a mutation is enqueued in the IndexedDB `outbox` store with `{ id: uuidv7, type, payload, idempotencyKey, queuedAt, attempts: 0 }`; (c) the api-client posts the mutation to the Fastify backend with `Idempotency-Key: <uuidv7>` header; (d) on 2xx, the outbox entry is removed and the cached `tasks` row is replaced with the server response; (e) **no spinner, no toast, no "saving…" indicator, no success modal** appears at any point.

3. **Given** Sam performs actions while offline (`navigator.onLine === false` OR fetch fails / times out), **When** each action is taken, **Then** (a) the optimistic mutation applies to local state immediately and is visible in the UI; (b) the outbox entry stays queued in IndexedDB; (c) cross-session reload preserves both the cached task state AND the queued outbox entries (verified by reload-while-offline E2E test); (d) the annunciator-store's `syncState` signal transitions to `'offline'` after a 2-second transient threshold (full Annunciator UI lands in Story 1.10; this story stops at the store-layer signal and a console-free internal check).

4. **Given** connectivity is restored after an offline period (`online` event OR a successful background-sync event OR a successful next-mutation), **When** outbox replay begins, **Then** queued mutations replay against the server **in FIFO order** preserving their original `Idempotency-Key`s; on completion, the cached `tasks` reflects the authoritative server state (server is the merge winner). Replay survives partial failures: if entry N fails transiently (5xx / network), backoff applies (1s, 2s, 4s, 8s, 16s, capped 60s) and entries N+1, N+2 wait until N drains. A 4xx ValidationError on an entry drops that entry only; the queue continues with N+1.

5. **Given** a mutation is retried due to transient failure, **When** the SAME `Idempotency-Key` is sent ≥10 times, **Then** the server produces no duplicate state — the second-and-later requests return the stored response from the `idempotency_keys` table; the `tasks` row count and content are identical to a single-request outcome. **Idempotency-key TTL is 14 days** (architecture amendment from default 24h, see architecture.md line 1030). Replay with the same key but a different request body returns 409 `Conflict`; the outbox treats 409 as a programming error and drops the entry (logs once, posts `syncState: 'error'`).

6. **Given** the server-authoritative `GET /tasks` response and the client's local cache diverge on reconciliation (e.g., a task was edited on another session that still exists in soft-delete retention), **When** reconciliation runs after initial paint, **Then** server state wins for fields the client has not pending-mutated; pending outbox mutations layer on top of the merged state; the annunciator-store's `syncState` signal goes to `'conflict'` only when the server returns a row whose `updatedAt` exceeds the client's locally-cached `updatedAt` AND the client has a pending `update`/`delete` mutation for that same row in the outbox. (Sam's single-device v1 reality means this is rare; the contract still must hold for the property-test stress workload — Task 14.)

7. **Given** the v1 Fastify backend is implemented per architecture.md sections "Data Architecture" / "Authentication & Security" / "API & Communication Patterns", **Then** the API surface is exactly: `GET /tasks` (returns non-deleted tasks for the user_namespace, newest-first), `POST /tasks` (idempotent create), `PATCH /tasks/:id` (idempotent update of `text` and/or `completedAt`), `DELETE /tasks/:id` (idempotent soft-delete; sets `deleted_at`), `GET /health`. **All non-health routes** require an `Idempotency-Key` header on mutations; **all routes** are partitioned by `user_namespace` (defaults to `"default"` in v1 — Cloudflare Access JWT wiring is Story 1.13 territory). **Server retains soft-deleted tasks for ≥30 days** (no purge logic in v1; the `deleted_at` filter on `GET /tasks` is the soft-delete boundary).

8. **Given** the data layer is implemented per architecture.md "Data Architecture", **Then** SQLite (via `better-sqlite3`, WAL mode enabled at boot) is the production database with the schema specified in architecture.md (lines 200-222): `tasks (id TEXT PK, user_namespace TEXT NOT NULL, text TEXT NOT NULL CHECK length≤10000, completed_at INTEGER NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER NULL)` with index `idx_tasks_namespace_created ON (user_namespace, created_at DESC) WHERE deleted_at IS NULL`; `idempotency_keys (key TEXT PK, user_namespace TEXT NOT NULL, request_hash TEXT NOT NULL, response_status INTEGER NOT NULL, response_body TEXT NOT NULL, created_at INTEGER NOT NULL)` with index `idx_idem_created ON (created_at)`; `migrations (filename TEXT PK, applied_at INTEGER NOT NULL)`. Schema is created by plain `.sql` migrations in `apps/api/migrations/NNNN_*.sql` applied in lexicographic order at server boot **before `app.listen`**. NB: the epic body mentions PostgreSQL — the architecture says SQLite, and **architecture wins** (see architecture.md line 197 + canonical "ARCHITECTURE vs EPICS" note in Story 1.8 Dev Notes).

9. **Given** the property-based sync invariant test runs in CI, **When** a 1000-operation randomized workload (`fast-check` generators producing arbitrary sequences of `create | update-text | toggle-completed | delete | undo` interleaved with simulated `goOffline | goOnline | duplicate-replay | drop-response` transitions) executes against the `task-store + outbox + api-client + tasks-repo + idempotency-repo` layered system, **Then** for every reachable state the **never-duplicate** invariant holds (cardinality of `GET /tasks` ≤ cardinality of distinct creates not yet hard-deleted) AND the **never-lose** invariant holds (every successful create whose response was observed by the client is present on the server until an explicit delete is acknowledged). Test lives at `tests/property/sync-invariants.test.ts`; failures print the minimal counterexample sequence; CI job `unit-and-property` fails the build on any counterexample.

10. **And** the integration tests in `apps/api/src/routes/tasks.integration.test.ts` cover (using an in-memory SQLite DB per test): `POST /tasks` creates a row and returns it; `POST /tasks` with the same `Idempotency-Key` and same body returns the cached response and does NOT create a second row; `POST /tasks` with the same key and different body returns 409; `PATCH /tasks/:id` updates text; `PATCH /tasks/:id` is idempotent under same-key replay; `DELETE /tasks/:id` soft-deletes (`deleted_at` set; subsequent `GET /tasks` does not return it); `DELETE` is idempotent; `GET /tasks` returns rows newest-first (by `id DESC` per UUIDv7 ordering); `GET /tasks` filters on `user_namespace`; rate-limit returns 429 after 100 req/min/namespace; oversized text (>10000 chars) returns 400 ValidationError; absent `Idempotency-Key` header on a mutation returns 400.

11. **And** anti-feature contract is preserved: `bash scripts/check-anti-features.sh` continues to pass with no new violations introduced by the persistence/sync layer; specifically there is **no skeleton, no spinner, no "saving…" text, no toast on success, no `<ErrorBoundary>` around the network code**; failure feedback for this story routes only into the `annunciator-store.syncState` signal (the user-visible Annunciator UI lands in Story 1.10).

12. **And** existing keyboard, undo, completion, edit, and capture flows from Stories 1.3–1.8 continue to pass unchanged — the persistence layer is **additive**: optimistic UI from earlier stories already updates the in-memory `tasks` store synchronously; this story extends each mutation with an outbox enqueue + reconciliation, but does not change the user-visible response time. Latency budgets (NFR-Perf-1: <16ms keystroke→render; NFR-Perf-2: <50ms completion→strikethrough; NFR-Perf-3: <100ms enter→task-appears) are preserved because all sync work happens **after** the optimistic local update commits — verified by re-running the existing keyboard-only and completion-toggle E2E tests; no regression.

## Tasks / Subtasks

- [ ] **Task 1: Replace placeholder shared schemas with the real domain contract** (AC: #2, #4, #5, #6, #7, #8, #10)
  - [ ] 1.1 Edit `packages/shared/src/schema.ts` to **replace** the existing placeholder `TaskSchema` (which uses `title`, `completed: boolean`, `createdAt: string.datetime()` — wrong per architecture.md line 545) with the architecture-canonical shape:
    ```ts
    import { z } from "zod";

    export const MAX_TASK_TEXT_LENGTH = 10_000;

    export const Task = z.object({
      id: z.string().min(1),                       // UUIDv7
      userNamespace: z.string().min(1),
      text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH),
      completedAt: z.number().int().nullable(),    // epoch ms or null
      createdAt: z.number().int(),                 // epoch ms
      updatedAt: z.number().int(),                 // epoch ms
    });
    export type Task = z.infer<typeof Task>;

    export const CreateTaskInput = z.object({
      id: z.string().min(1),
      text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH),
      createdAt: z.number().int(),
    });
    export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

    export const UpdateTaskInput = z.object({
      text: z.string().min(1).max(MAX_TASK_TEXT_LENGTH).optional(),
      completedAt: z.number().int().nullable().optional(),
    }).refine(o => o.text !== undefined || o.completedAt !== undefined,
      { message: "at least one field must be provided" });
    export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

    export const Mutation = z.discriminatedUnion("type", [
      z.object({ type: z.literal("create"), id: z.string(), text: z.string(),
                 createdAt: z.number().int(), idempotencyKey: z.string() }),
      z.object({ type: z.literal("update"), id: z.string(),
                 text: z.string().optional(), completedAt: z.number().int().nullable().optional(),
                 idempotencyKey: z.string() }),
      z.object({ type: z.literal("delete"), id: z.string(), idempotencyKey: z.string() }),
    ]);
    export type Mutation = z.infer<typeof Mutation>;

    export const ErrorCode = z.enum([
      "ValidationError", "NotFound", "Conflict", "RateLimited", "ServerError",
    ]);
    export type ErrorCode = z.infer<typeof ErrorCode>;

    export const ErrorEnvelope = z.object({
      error: z.object({ code: ErrorCode, message: z.string() }),
    });
    export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
    ```
  - [ ] 1.2 Add `packages/shared/src/sw-messages.ts` with the discriminated union per architecture.md line 466-469:
    ```ts
    import { z } from "zod";

    export const SyncState = z.enum(["online", "offline", "conflict", "error"]);
    export type SyncState = z.infer<typeof SyncState>;

    export const SwToPageMessage = z.discriminatedUnion("type", [
      z.object({ type: z.literal("sync-state"), state: SyncState }),
      z.object({ type: z.literal("mutation-applied"), id: z.string() }),
      z.object({ type: z.literal("mutation-rejected"), id: z.string(), reason: z.string() }),
    ]);
    export type SwToPageMessage = z.infer<typeof SwToPageMessage>;

    export const PageToSwMessage = z.discriminatedUnion("type", [
      z.object({ type: z.literal("flush-outbox") }),
      z.object({ type: z.literal("reconcile") }),
    ]);
    export type PageToSwMessage = z.infer<typeof PageToSwMessage>;
    ```
  - [ ] 1.3 Update `packages/shared/src/index.ts` to re-export everything: `export * from "./schema.js"; export * from "./sw-messages.js";`. Remove the old `TaskSchema`/`Task` exports (they are replaced by the new `Task`).
  - [ ] 1.4 Update `packages/shared/src/schema.test.ts` to assert the new shapes parse / reject as expected (oversized text rejected; missing required fields rejected; UpdateTaskInput requires at least one field; ErrorCode is a strict enum).
  - [ ] 1.5 Add `zod` to `packages/shared/package.json` dependencies. Run `pnpm install` from the root to refresh `pnpm-lock.yaml`.
  - [ ] 1.6 Run `pnpm typecheck` — expect failures in `apps/web/src/store/task-store.ts` (existing `ActiveTask` type only has `id`/`text`/`createdAt`/`completedAt`, no `userNamespace`/`updatedAt`). Migration in Task 11.

- [ ] **Task 2: Bootstrap the API package's runtime dependencies and env config** (AC: #7, #8)
  - [ ] 2.1 Add to `apps/api/package.json` dependencies: `better-sqlite3@^11.5.0`, `kysely@^0.27.4`, `kysely-better-sqlite3@^1.0.0` (or use Kysely's built-in `SqliteDialect` with `better-sqlite3` instance — both are documented; prefer the built-in dialect to minimize transitive deps), `zod@^3.23.8`, `fastify-type-provider-zod@^4.0.0`, `@fastify/rate-limit@^10.2.1`, `pino@^9.5.0`. Add to devDependencies: `@types/better-sqlite3@^7.6.11`. Run `pnpm install`. Verify the lockfile commits include these; ensure no version drift across the workspace.
  - [ ] 2.2 Create `apps/api/src/env.ts` — Zod-validated process.env reader. Variables: `NODE_ENV` ("development"/"production"/"test"), `PORT` (1-65535, default 3000), `DATABASE_URL` (file path; default `./data/dev.db`; in test, `:memory:`). The `env.parse()` call happens once at module load; export `env: Env` for use in `server.ts`, `db/kysely.ts`, etc. Throws on invalid input — server never starts with bad config.
  - [ ] 2.3 Create `apps/api/src/lib/log.ts` exporting a configured `pino` instance:
    ```ts
    import pino from "pino";
    export const log = pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: {
        paths: ["*.text", "*.body.text", "req.body.text"],
        censor: "[REDACTED]",
      },
    });
    ```
    The redaction rule enforces NFR-Priv-1 (no task text in logs). Architecture.md lines 504-514 show the canonical event-shape log calls.
  - [ ] 2.4 Create `apps/api/src/lib/hash.ts` — SHA-256 over JSON-serialized request body, used for idempotency request_hash:
    ```ts
    import { createHash } from "node:crypto";
    export function hashRequestBody(body: unknown): string {
      return createHash("sha256").update(JSON.stringify(body)).digest("hex");
    }
    ```

- [ ] **Task 3: SQLite schema, migrations, and Kysely instance** (AC: #7, #8)
  - [ ] 3.1 Create `apps/api/migrations/0001_init.sql` with the exact DDL from architecture.md lines 200-222 (note: `id TEXT PRIMARY KEY`, `length(text) <= 10000` CHECK, `INTEGER` columns for all timestamps, soft-delete column `deleted_at INTEGER NULL`, no `NOT NULL` on completed_at / deleted_at). Append `CREATE TABLE migrations (filename TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`. End of file: no trailing semicolon issues; SQLite will execute `.exec()` on the full content.
  - [ ] 3.2 Create `apps/api/src/db/migrate.ts` — boot-time migration runner. Reads `apps/api/migrations/*.sql` lexicographically, checks the `migrations` table for already-applied filenames, runs unapplied ones inside a transaction, records each in `migrations`. Special case: if `migrations` table does not exist yet, create it first. Idempotent — running twice is a no-op. Uses `better-sqlite3` directly (not Kysely) because Kysely's migration system is overkill for this 1-table project; per architecture.md line 224.
  - [ ] 3.3 Create `apps/api/src/db/kysely.ts`:
    ```ts
    import Database from "better-sqlite3";
    import { Kysely, SqliteDialect } from "kysely";
    import { env } from "../env.js";

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
    export interface Database {
      tasks: TasksTable;
      idempotency_keys: IdempotencyKeysTable;
      migrations: MigrationsTable;
    }

    export function createDb(filePath: string): { kysely: Kysely<Database>; sqlite: Database.Database } {
      const sqlite = new Database(filePath);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
      return {
        kysely: new Kysely<Database>({ dialect: new SqliteDialect({ database: sqlite }) }),
        sqlite,
      };
    }
    ```
    The synchronous `better-sqlite3` driver is a non-negotiable choice per architecture.md line 197 (~10× faster than async wrappers for this workload).
  - [ ] 3.4 Create `apps/api/src/db/mappers.ts`:
    ```ts
    import type { Selectable } from "kysely";
    import type { TasksTable } from "./kysely.js";
    import type { Task } from "@bmad-todo/shared";

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
    ```
    Architecture.md lines 386-387, 395: the `mappers.ts` file is the **only** boundary that converts snake_case rows to camelCase domain shapes. Never inline this conversion in route handlers.

- [ ] **Task 4: Repository layer — `tasks-repo.ts` and `idempotency-repo.ts`** (AC: #7, #8, #10)
  - [ ] 4.1 Create `apps/api/src/db/repos/tasks-repo.ts`:
    ```ts
    import type { Kysely } from "kysely";
    import type { Database } from "../kysely.js";
    import { rowToTask } from "../mappers.js";
    import type { Task } from "@bmad-todo/shared";

    export class TasksRepo {
      constructor(private readonly db: Kysely<Database>) {}

      async listActive(userNamespace: string): Promise<Task[]> {
        const rows = await this.db.selectFrom("tasks")
          .selectAll()
          .where("user_namespace", "=", userNamespace)
          .where("deleted_at", "is", null)
          .orderBy("id", "desc")  // UUIDv7 lexicographic == created_at desc
          .execute();
        return rows.map(rowToTask);
      }

      async create(input: { id: string; userNamespace: string; text: string; createdAt: number }): Promise<Task> {
        const now = Date.now();
        const row = await this.db.insertInto("tasks")
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

      async update(id: string, userNamespace: string, patch: { text?: string; completedAt?: number | null }): Promise<Task | null> {
        const now = Date.now();
        const updates: Partial<{ text: string; completed_at: number | null; updated_at: number }> = { updated_at: now };
        if (patch.text !== undefined) updates.text = patch.text;
        if (patch.completedAt !== undefined) updates.completed_at = patch.completedAt;
        const row = await this.db.updateTable("tasks")
          .set(updates)
          .where("id", "=", id)
          .where("user_namespace", "=", userNamespace)
          .where("deleted_at", "is", null)
          .returningAll()
          .executeTakeFirst();
        return row ? rowToTask(row) : null;
      }

      async softDelete(id: string, userNamespace: string): Promise<boolean> {
        const result = await this.db.updateTable("tasks")
          .set({ deleted_at: Date.now(), updated_at: Date.now() })
          .where("id", "=", id)
          .where("user_namespace", "=", userNamespace)
          .where("deleted_at", "is", null)
          .executeTakeFirst();
        return Number(result.numUpdatedRows) > 0;
      }
    }
    ```
    All queries are scoped by `user_namespace` (NFR-Priv-4: cross-user data leakage prevented at query level). Soft-delete is the only delete path — no hard `DELETE FROM tasks` anywhere in v1.
  - [ ] 4.2 Create `apps/api/src/db/repos/idempotency-repo.ts`:
    ```ts
    import type { Kysely } from "kysely";
    import type { Database } from "../kysely.js";

    export interface CachedResponse {
      requestHash: string;
      responseStatus: number;
      responseBody: string;  // already JSON-serialized
    }

    export class IdempotencyRepo {
      constructor(private readonly db: Kysely<Database>) {}

      async find(key: string, userNamespace: string): Promise<CachedResponse | null> {
        const row = await this.db.selectFrom("idempotency_keys")
          .select(["request_hash", "response_status", "response_body"])
          .where("key", "=", key)
          .where("user_namespace", "=", userNamespace)
          .executeTakeFirst();
        return row ? {
          requestHash: row.request_hash,
          responseStatus: row.response_status,
          responseBody: row.response_body,
        } : null;
      }

      async store(key: string, userNamespace: string, requestHash: string, responseStatus: number, responseBody: string): Promise<void> {
        await this.db.insertInto("idempotency_keys")
          .values({
            key, user_namespace: userNamespace, request_hash: requestHash,
            response_status: responseStatus, response_body: responseBody,
            created_at: Date.now(),
          })
          .execute();
      }
    }
    ```
    No purge logic in v1 — single-user volume is bounded; architecture.md amendment (line 1030) extends TTL from 24h to 14 days, but the actual purge is a Growth-scope cron task. For v1, rows accumulate harmlessly.
  - [ ] 4.3 Create `apps/api/src/db/repos/tasks-repo.test.ts` and `apps/api/src/db/repos/idempotency-repo.test.ts`. Each test uses `createDb(":memory:")` and runs migrations before each `describe`. Test the happy paths plus: list excludes deleted; namespace isolation (rows in namespace A invisible from namespace B); update returns null for non-existent id; soft-delete is idempotent (calling twice returns false the second time but does not throw).

- [ ] **Task 5: Middleware — idempotency, error envelope, dev-mode auth bypass** (AC: #5, #7, #11)
  - [ ] 5.1 Create `apps/api/src/middleware/idempotency.ts` — Fastify `preHandler` hook for mutation routes:
    - Read `req.headers["idempotency-key"]`. If absent → respond 400 ValidationError with envelope.
    - Validate UUID format (Zod parse `z.string().uuid()` is fine; UUIDv7 is a valid UUID).
    - Compute `requestHash = hashRequestBody(req.body)`.
    - Lookup `idempotencyRepo.find(key, userNamespace)`:
      - If hit AND `requestHash === stored.requestHash` → reply with stored status + body, end the handler chain (`reply.send(...)` returns the cached response without invoking the route handler). Log `idempotency.replayed`.
      - If hit AND hashes differ → 409 Conflict envelope.
      - If miss → attach `req.idempotencyKey = key` and `req.idempotencyRequestHash = requestHash` to the Fastify request via `decorateRequest`; the route handler will call `idempotencyRepo.store(...)` after computing its real response.
    - Use Fastify's `addHook("preHandler", ...)` registered only on the mutation routes (POST/PATCH/DELETE), not on GET.
  - [ ] 5.2 Create `apps/api/src/middleware/error-envelope.ts` — Fastify `setErrorHandler` and `setNotFoundHandler` returning the uniform `{ error: { code, message } }` shape per architecture.md lines 439-444. Map exception classes:
    - `ZodError` → 400 ValidationError (message = first issue's message).
    - Custom `NotFoundError` → 404 NotFound.
    - Custom `ConflictError` → 409 Conflict.
    - Anything else → 500 ServerError; log the error with `serializeError`.
  - [ ] 5.3 Create `apps/api/src/middleware/auth-jwt.ts` — Fastify `preHandler`. In v1: in `production` mode, verify the `Cf-Access-Jwt-Assertion` header against Cloudflare's team JWKS endpoint (cached at boot). In `development` and `test` modes, **skip verification** and set `req.userNamespace = "default"`. **Story 1.9 ships only the `development`/`test` skip path**; the production JWKS verification is implementable later (Story 1.13 territory) — leave a clearly-commented `TODO(Story-1.13)` in the production branch with a `throw new Error("auth-jwt: production mode not yet implemented")` so production deploys fail loudly until Story 1.13 lands. v1 architecture.md line 234-238 explicitly accepts this: v1 access is restricted at the network layer (Cloudflare Access), not at the application layer.
  - [ ] 5.4 Create `apps/api/src/middleware/rate-limit.ts` — small wrapper that registers `@fastify/rate-limit` with `max: 100, timeWindow: "1 minute", keyGenerator: req => req.userNamespace ?? "default"`. The 429 response uses the standard error envelope.

- [ ] **Task 6: Routes — wire `/tasks` CRUD using Fastify + fastify-type-provider-zod** (AC: #7, #10)
  - [ ] 6.1 Create `apps/api/src/routes/tasks.ts` registering:
    - `GET /tasks` → `tasksRepo.listActive(req.userNamespace)`. Returns 200 + JSON array of `Task[]`. Naked-resource response (no envelope).
    - `POST /tasks` (preHandler: idempotency) → validate body via `CreateTaskInput.parse`, call `tasksRepo.create({ ...body, userNamespace })`, store idempotency record with status 201 and response body, return 201 + Task.
    - `PATCH /tasks/:id` (preHandler: idempotency) → validate body via `UpdateTaskInput.parse`, call `tasksRepo.update(id, userNamespace, body)`. If null → 404 NotFound. Else 200 + Task; idempotency stored.
    - `DELETE /tasks/:id` (preHandler: idempotency) → `tasksRepo.softDelete(id, userNamespace)`. If false → 404. Else 204 No Content (empty body); idempotency stored with status 204 and empty body.
  - [ ] 6.2 All routes use the `fastify-type-provider-zod` ZodTypeProvider — the schema is declared on the route, types flow through to handlers, validation is automatic. Per architecture.md line 226.
  - [ ] 6.3 Use the `pino` logger for one log per request: `log.info({ event: 'task.created' | 'task.updated' | 'task.deleted', taskId, userNamespace, idempotencyKey, status: 'new' | 'replayed' })`. Never include `text` in the log payload (NFR-Priv-1; redacted by `lib/log.ts` if it slips through, but don't rely on the redactor — write the call right).
  - [ ] 6.4 Update `apps/api/src/server.ts` to wire it all up:
    ```ts
    import Fastify from "fastify";
    import { ZodTypeProvider, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
    import { healthRoutes } from "./routes/health.js";
    import { taskRoutes } from "./routes/tasks.js";
    import { runMigrations } from "./db/migrate.js";
    import { createDb } from "./db/kysely.js";
    import { authJwt } from "./middleware/auth-jwt.js";
    import { errorEnvelope, notFoundHandler } from "./middleware/error-envelope.js";
    import { rateLimit } from "./middleware/rate-limit.js";
    import { env } from "./env.js";
    import { log } from "./lib/log.js";

    const { kysely, sqlite } = createDb(env.DATABASE_URL);
    runMigrations(sqlite);  // sync, before app.listen

    const app = Fastify({ logger: log }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await rateLimit(app);
    app.addHook("preHandler", authJwt);
    app.setErrorHandler(errorEnvelope);
    app.setNotFoundHandler(notFoundHandler);

    await app.register(healthRoutes);
    await app.register((scope) => taskRoutes(scope, kysely), { prefix: "" });

    // ... existing port-validation + listen logic preserved; remove the `console.log` at the
    // bottom and replace with log.info({ event: 'server.listening', port }).
    ```
    The existing `console.log` at the end of `server.ts` is fine for now (it's whitelisted by ESLint per the rule comment); replace with a `pino` log call for consistency.
  - [ ] 6.5 Create `apps/api/src/routes/tasks.integration.test.ts` covering AC#10's full list. Each test:
    1. Calls `createDb(":memory:")` + `runMigrations`.
    2. Builds a Fastify instance with the routes registered against the in-memory kysely.
    3. Uses `app.inject({ method, url, headers, payload })` (Fastify's built-in test utility — no separate HTTP server needed).
    4. Asserts response status, headers, and body.
    5. For idempotency: same key + same body → 201 (or 200) on first call AND on second call; assert `tasksRepo.listActive("default")` has cardinality 1.
    6. For namespace isolation: insert a task with explicit `userNamespace: "alice"` directly via the repo, call `GET /tasks` with default namespace, assert empty.

- [ ] **Task 7: Web — `sync/idb.ts` IndexedDB wrapper** (AC: #1, #2, #3, #4)
  - [ ] 7.1 Add to `apps/web/package.json` dependencies: `idb@^8.0.0`. Run `pnpm install`.
  - [ ] 7.2 Create `apps/web/src/sync/idb.ts`:
    ```ts
    import { openDB, type IDBPDatabase, type DBSchema } from "idb";
    import type { Task, Mutation } from "@bmad-todo/shared";

    export interface OutboxEntry {
      id: string;                  // UUIDv7
      mutation: Mutation;
      idempotencyKey: string;
      queuedAt: number;
      attempts: number;
    }

    interface TodoDb extends DBSchema {
      tasks: { key: string; value: Task };
      outbox: { key: string; value: OutboxEntry };
    }

    let dbPromise: Promise<IDBPDatabase<TodoDb>> | null = null;

    function db(): Promise<IDBPDatabase<TodoDb>> {
      if (!dbPromise) {
        dbPromise = openDB<TodoDb>("bmad-todo", 1, {
          upgrade(db) {
            db.createObjectStore("tasks", { keyPath: "id" });
            db.createObjectStore("outbox", { keyPath: "id" });
          },
        });
      }
      return dbPromise;
    }

    export async function getAllTasks(): Promise<Task[]> {
      return (await db()).getAll("tasks");
    }
    export async function putTask(task: Task): Promise<void> {
      await (await db()).put("tasks", task);
    }
    export async function deleteCachedTask(id: string): Promise<void> {
      await (await db()).delete("tasks", id);
    }
    export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
      return (await db()).getAll("outbox");
    }
    export async function putOutboxEntry(e: OutboxEntry): Promise<void> {
      await (await db()).put("outbox", e);
    }
    export async function deleteOutboxEntry(id: string): Promise<void> {
      await (await db()).delete("outbox", id);
    }
    export async function clearAll(): Promise<void> {
      const d = await db();
      const tx = d.transaction(["tasks", "outbox"], "readwrite");
      await Promise.all([tx.objectStore("tasks").clear(), tx.objectStore("outbox").clear(), tx.done]);
    }

    // Test-only helper: reset the lazy db handle so per-test fakes can re-open.
    export function _resetForTesting(): void { dbPromise = null; }
    ```
    No reactivity inside `sync/`. All exports are async functions. Module boundary: `store/` may import from here; `components/` may NOT (enforced by `eslint.config.js:30-39`).
  - [ ] 7.3 Create `apps/web/src/sync/idb.test.ts` — covers happy paths under `fake-indexeddb` (jsdom does not ship IDB; install `fake-indexeddb` as devDep and import its auto-setup at the top of the test file: `import "fake-indexeddb/auto";`). Tests: round-trip put/get/delete on `tasks`; round-trip on `outbox`; `clearAll` empties both; `_resetForTesting` lets a follow-up test re-open with a fresh fake DB.

- [ ] **Task 8: Web — `sync/api-client.ts` fetch wrapper** (AC: #2, #4, #5)
  - [ ] 8.1 Create `apps/web/src/sync/api-client.ts`:
    ```ts
    import type { Task, CreateTaskInput, UpdateTaskInput, ErrorEnvelope } from "@bmad-todo/shared";

    export class ApiError extends Error {
      constructor(public status: number, public envelope: ErrorEnvelope) {
        super(envelope.error.message);
      }
    }

    async function parseOrThrow(res: Response): Promise<unknown> {
      if (res.status === 204) return null;
      const json = await res.json();
      if (!res.ok) throw new ApiError(res.status, json as ErrorEnvelope);
      return json;
    }

    export async function fetchTasks(): Promise<Task[]> {
      const res = await fetch("/tasks", { method: "GET" });
      return (await parseOrThrow(res)) as Task[];
    }

    export async function postTask(input: CreateTaskInput, idempotencyKey: string): Promise<Task> {
      const res = await fetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      });
      return (await parseOrThrow(res)) as Task;
    }

    export async function patchTask(id: string, input: UpdateTaskInput, idempotencyKey: string): Promise<Task> {
      const res = await fetch(`/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      });
      return (await parseOrThrow(res)) as Task;
    }

    export async function deleteTaskRequest(id: string, idempotencyKey: string): Promise<void> {
      const res = await fetch(`/tasks/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      await parseOrThrow(res);
    }
    ```
    Same-origin fetch only — no CORS in v1 (architecture.md lines 311-313). The Vite proxy already forwards `/tasks` and `/health` to `:3000` in dev (`vite.config.ts:9-12`).
  - [ ] 8.2 Add tests in `apps/web/src/sync/api-client.test.ts` using `vi.spyOn(globalThis, "fetch")` to assert request shape (URL, method, headers including `Idempotency-Key`) and response handling for 200, 201, 204, 400 (ApiError), 409, 500.

- [ ] **Task 9: Web — `sync/outbox.ts` enqueue + drain + replay** (AC: #2, #3, #4, #5)
  - [ ] 9.1 Create `apps/web/src/sync/outbox.ts`:
    - Exports `enqueue(mutation: Mutation): Promise<void>` — appends a `{ id: uuidv7, mutation, idempotencyKey: <from mutation>, queuedAt: Date.now(), attempts: 0 }` entry to IDB outbox. (The idempotency-key is generated at the call-site in `task-store` before enqueue, NOT inside `enqueue` — so undo-redo and offline-online cycles preserve the original key.)
    - Exports `drain(): Promise<{ applied: number; rejected: number }>` — reads all outbox entries (ordered by queuedAt ASC, equivalently by `id` ASC since UUIDv7), iterates FIFO. For each entry:
      - Dispatch the matching `api-client` call.
      - On 2xx → `deleteOutboxEntry(entry.id)`; if response includes a Task body, `putTask(serverTask)` to update the cache (server values authoritative).
      - On 4xx (`ApiError` with `status >= 400 && status < 500`) → log to dev console (only in dev mode), delete the entry, increment `rejected`. Treat 409 same as other 4xx.
      - On 5xx / network error → bump `attempts`, write back to outbox, halt drain after current entry's backoff window. Backoff schedule: 1, 2, 4, 8, 16, capped at 60 seconds — store the next-attempt timestamp in the entry so a future drain skips entries whose retry time hasn't arrived.
    - Exports `enqueueAndDrain(mutation: Mutation): Promise<void>` — convenience for the optimistic-write hot path: enqueue, then trigger drain (best-effort; failures stay in outbox).
    - Exports `getOutboxSize(): Promise<number>` for the property-test stress harness and the annunciator-store.
  - [ ] 9.2 Create `apps/web/src/sync/outbox.test.ts` with `fake-indexeddb` + `vi.spyOn(globalThis, "fetch")` providing canned responses. Cover:
    - FIFO order preserved across mixed types.
    - 5xx leaves entry in outbox with `attempts++`.
    - 2xx removes entry and updates cache.
    - 409 drops entry, continues.
    - Repeated drain with same idempotency-key produces no duplicate Task in the cache.

- [ ] **Task 10: Web — `sync/sw-bridge.ts` and the service worker** (AC: #3, #4)
  - [ ] 10.1 Add to `apps/web/devDependencies`: `vite-plugin-pwa@^0.21.0`, `workbox-precaching@^7.3.0`, `workbox-routing@^7.3.0`, `workbox-strategies@^7.3.0`, `workbox-background-sync@^7.3.0`. Run `pnpm install`.
  - [ ] 10.2 Update `apps/web/vite.config.ts` to register `vite-plugin-pwa` with `injectManifest` strategy:
    ```ts
    import { VitePWA } from "vite-plugin-pwa";
    // ...
    plugins: [
      solidPlugin(),
      tailwindcss(),
      VitePWA({
        srcDir: "src/sync",
        filename: "sw.ts",
        strategies: "injectManifest",
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,woff2,png,svg}"],
        },
        manifest: {
          name: "bmad-todo",
          short_name: "bmad-todo",
          start_url: "/",
          display: "standalone",
          theme_color: "#F4EFE6",
          icons: [],   // PWA icons are Story 1.13 territory
        },
        devOptions: { enabled: false },  // SW disabled in dev; outbox still works via direct fetch
      }),
    ],
    ```
    `devOptions.enabled: false` is deliberate — registering an SW in dev causes HMR weirdness and isn't needed; the outbox-via-direct-fetch path (Task 9) gives full offline coverage in dev too.
  - [ ] 10.3 Create `apps/web/src/sync/sw.ts`:
    ```ts
    /// <reference lib="webworker" />
    import { precacheAndRoute } from "workbox-precaching";
    import { registerRoute } from "workbox-routing";
    import { NetworkFirst, CacheFirst } from "workbox-strategies";

    declare const self: ServiceWorkerGlobalScope;

    precacheAndRoute(self.__WB_MANIFEST);

    // Network-first for /tasks (so reads always try server when online)
    registerRoute(({ url }) => url.pathname.startsWith("/tasks"), new NetworkFirst({ cacheName: "tasks-api" }));

    // CRITICAL exclusion: Cloudflare Access endpoints must never be cached
    // (architecture.md line 1028 / AR8). Any path under /cdn-cgi/access/* bypasses the SW.
    registerRoute(({ url }) => url.pathname.startsWith("/cdn-cgi/access/"), () => fetch(self === undefined ? "" : ""));
    // Safer formulation: register a route that always passes through to the network.
    // The simplest pattern is to short-circuit in the fetch handler:
    self.addEventListener("fetch", (event) => {
      const url = new URL(event.request.url);
      if (url.pathname.startsWith("/cdn-cgi/access/")) {
        event.respondWith(fetch(event.request));  // pass through; never cache
      }
    });

    // Static assets (woff2, css, js) — cache-first
    registerRoute(({ request }) => ["font", "style", "script", "image"].includes(request.destination),
      new CacheFirst({ cacheName: "static-assets" }));
    ```
    The Cloudflare Access exclusion is **load-bearing** per architecture amendment AR8 / line 1028 — a stale 200 from `/cdn-cgi/access/*` would cause silent auth failures the annunciator can't recover. Add a test (Task 10.6).
  - [ ] 10.4 Create `apps/web/src/sync/sw-bridge.ts` for the page-side glue:
    - Exports `registerSw(): Promise<void>` — registers the SW. Called from `main.tsx` after `<App>` mounts, but **only in production** (`import.meta.env.PROD`); skip in dev to align with `devOptions.enabled: false`.
    - Exports `postToSw(msg: PageToSwMessage): Promise<void>` — best-effort `navigator.serviceWorker.controller?.postMessage(msg)`.
    - Exports `subscribeToSwMessages(handler: (msg: SwToPageMessage) => void): () => void` — wraps `navigator.serviceWorker.addEventListener('message', ...)` with shared-message Zod parsing (drop messages that don't validate).
  - [ ] 10.5 Update `apps/web/src/index.tsx` to call `registerSw()` after the Solid `render(...)` mount.
  - [ ] 10.6 Add a Playwright test in `tests/e2e/sw-cdn-cgi-exclusion.spec.ts` that visits `/`, waits for the SW to activate, then issues a fetch to `/cdn-cgi/access/identity` (mocked via `page.route(...)` to return 401 with a fresh content body each call) and asserts the SW does NOT serve a cached 200 on the second request — i.e., the CFA exclusion holds.

- [ ] **Task 11: Web — extend `task-store.ts` to layer cache + outbox + reconciliation** (AC: #1, #2, #6, #12)
  - [ ] 11.1 **Update the `ActiveTask` type** to align with the shared `Task`:
    ```ts
    import type { Task } from "@bmad-todo/shared";
    export type ActiveTask = Task;  // alias; same shape; preserves existing import sites
    ```
    The new fields are `userNamespace` and `updatedAt`. Migrate every callsite that constructs an `ActiveTask` literal:
    - `task-store.ts:18-23` — add `userNamespace: "default"` and `updatedAt: Date.now()`.
    - `undo-stack.ts` — `insert` inverse mutation already stores a snapshot; the snapshot now includes the new fields automatically. No changes needed beyond the type chase.
    - Test fixtures in `task-store.test.ts`, `undo-stack.test.ts`, `App.test.tsx`, `TaskRow.test.tsx`, `TaskList.test.tsx` — supply the new fields. Use a small helper `makeTestTask(partial: Partial<Task> = {}): Task` to keep test bodies tidy.
  - [ ] 11.2 **Hydrate from cache on bootstrap.** In `apps/web/src/main.tsx` (or `index.tsx`, whichever is the entry — confirm by reading), before calling `render(<App />, ...)`:
    ```ts
    import { hydrateFromCache } from "./store/task-store";
    await hydrateFromCache();
    render(() => <App />, document.getElementById("root")!);
    ```
    Add `hydrateFromCache()` to `task-store.ts`:
    ```ts
    import { getAllTasks } from "../sync/idb";
    export async function hydrateFromCache(): Promise<void> {
      const cached = await getAllTasks();
      if (cached.length === 0) return;
      // Sort newest-first by id (UUIDv7) — same as server contract
      cached.sort((a, b) => a.id < b.id ? 1 : -1);
      setTasks(() => cached);
    }
    ```
  - [ ] 11.3 **Optimistic-write hot path.** Update `createTask` (and `toggleTaskCompleted`, `updateTaskText`, `deleteTask`):
    ```ts
    import { generateId } from "../lib/ids";
    import { putTask, deleteCachedTask } from "../sync/idb";
    import { enqueueAndDrain } from "../sync/outbox";
    import type { Mutation } from "@bmad-todo/shared";

    export function createTask(text: string): void {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      const now = Date.now();
      const task: ActiveTask = {
        id: generateId(),
        userNamespace: "default",
        text: trimmed,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      setTasks((prev) => [task, ...prev]);
      // Cache + outbox happen async-after-paint; do not await — the UI is already updated.
      void putTask(task);
      const idempotencyKey = generateId();
      const mutation: Mutation = {
        type: "create", id: task.id, text: task.text, createdAt: task.createdAt, idempotencyKey,
      };
      void enqueueAndDrain(mutation);
    }
    ```
    The `void` on the IDB writes is **deliberate** — awaiting them would block the render path and breach NFR-Perf-3 (<100ms enter→appears). Errors are routed to the annunciator-store (Task 12), never thrown.
    Apply the same pattern to:
    - `toggleTaskCompleted` → emits `Mutation { type: 'update', completedAt }`.
    - `updateTaskText` → emits `Mutation { type: 'update', text }`.
    - `deleteTask` → emits `Mutation { type: 'delete' }` and calls `deleteCachedTask(id)`.
  - [ ] 11.4 **Reconciliation after first paint.** Add `reconcileWithServer()` to `task-store.ts`:
    ```ts
    import { fetchTasks } from "../sync/api-client";
    import { setSyncState } from "./annunciator-store";

    export async function reconcileWithServer(): Promise<void> {
      try {
        const serverTasks = await fetchTasks();
        // Layer pending outbox entries on top of server state — the outbox is the
        // mutation log, so its entries reflect changes the server has not yet acked.
        // For v1, the simplest safe rule: server wins for tasks NOT in the outbox-pending set;
        // local wins for tasks WITH a pending mutation. Apply server state first, then re-apply
        // pending mutations from the outbox to the cache.
        const pending = await getAllOutboxEntries();
        const pendingIds = new Set(pending.map(e => e.mutation.id));
        const merged = serverTasks.filter(t => !pendingIds.has(t.id))
          .concat(tasks.filter(t => pendingIds.has(t.id)));
        merged.sort((a, b) => a.id < b.id ? 1 : -1);
        setTasks(() => merged);
        // Update IDB cache to match
        for (const t of serverTasks) await putTask(t);
        setSyncState("online");
      } catch (err) {
        // Network failure on reconcile — annunciator handles
        setSyncState("offline");
      }
    }
    ```
    Call `reconcileWithServer()` from `App.tsx` `onMount()` (or from `main.tsx` after the initial render). Conflict detection (AC#6) is a v1.x enhancement — for v1 the rule above is "server wins, local pending overrides"; the property test in Task 14 verifies this is duplicate-free and loss-free.
  - [ ] 11.5 **Reconfirm undo path goes through outbox.** Story 1.6 added `pushUndo`/`applyUndo` against the in-memory store. After Task 11.3, the undo path's inner `applyInverseMutation` now calls `insertTaskAtIndex` / `updateTaskText` / `setTaskCompletedAt` — each of which (post-1.9) ALSO enqueues an outbox mutation. Verify (and add a test) that an undo of a `delete` produces a *new* `create` mutation with a *new* `Idempotency-Key` and a *new* outbox entry (so the server replays it as a re-create with the same task id but a different idempotency key). The original delete's outbox entry is NOT cancelled — if both round-trip, the server sees: create A → delete A → create A (re-create with same id, new key). The server's `tasks-repo.create` will fail with 409 if the row exists; the route handler should treat the 409 as success in this specific case (the task IS where the client wants it). **Add a follow-up note to deferred-work.md if this corner case requires extra handling — it is acceptable for v1 to have eventual-consistency that re-converges within a tick.**

- [ ] **Task 12: Web — `store/annunciator-store.ts` (sync state signal only — no UI)** (AC: #3, #6, #11)
  - [ ] 12.1 Create `apps/web/src/store/annunciator-store.ts`:
    ```ts
    import { createSignal } from "solid-js";
    import type { SyncState } from "@bmad-todo/shared";

    const [syncStateSignal, setSyncStateInternal] = createSignal<SyncState>("online");
    let offlineTimer: ReturnType<typeof setTimeout> | null = null;

    export const syncState = syncStateSignal;

    export function setSyncState(next: SyncState): void {
      // 2-second transient threshold for offline (per UX-DR13). Other states transition immediately.
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
      if (offlineTimer !== null) { clearTimeout(offlineTimer); offlineTimer = null; }
      setSyncStateInternal("online");
    }
    ```
    Architecture.md line 466-469: the `annunciator-store` is the **only** writer for sync state, fed by `sw-bridge` and `task-store`. Story 1.10 adds the `<Annunciator>` component that READS this signal and renders the bottom-right dot. **Story 1.9 stops here** — no `<Annunciator>` UI yet.
  - [ ] 12.2 Wire `setSyncState("offline")` from the `outbox.drain` 5xx/network paths and `setSyncState("online")` from a successful drain. Wire `setSyncState("error")` from IDB write failures (catch in the `void putTask(...)` calls in Task 11 and route to `setSyncState("error")` instead of throwing).
  - [ ] 12.3 Add `apps/web/src/store/annunciator-store.test.ts`:
    - `setSyncState("offline")` does NOT update the signal synchronously; advance fake timers by 2s → signal transitions.
    - `setSyncState("offline")` followed by `setSyncState("online")` within 2s → signal stays `online` (transient absorbed).
    - `setSyncState("error")` transitions immediately (no transient).

- [ ] **Task 13: Web — wire reconciliation into App lifecycle** (AC: #1, #2, #6)
  - [ ] 13.1 Update `apps/web/src/components/App.tsx` `onMount` to also call `void reconcileWithServer()` after the existing keydown-handler registration. Reconcile runs in parallel with the cached paint — no `await`, no blocking.
  - [ ] 13.2 Add a window `online` / `offline` event listener in `App.tsx` `onMount` that calls `setSyncState("online" | "offline")`. Browser events drive the signal alongside outbox-drain outcomes.

- [ ] **Task 14: Property-based sync invariant test (1000-op stress)** (AC: #9)
  - [ ] 14.1 Add to root `devDependencies`: `fast-check@^3.23.0`. Run `pnpm install`.
  - [ ] 14.2 Create `tests/property/sync-invariants.test.ts`:
    - Use `fast-check`'s `fc.commands` API to model a state machine with commands: `Create(text)`, `UpdateText(idx, text)`, `ToggleCompleted(idx)`, `Delete(idx)`, `Undo()`, `GoOffline()`, `GoOnline()`, `DropResponse(opIdx)` (simulates the response loss that motivates the 14d idempotency TTL), `DuplicateReplay(opIdx)` (simulates outbox re-drain).
    - The system-under-test wires: real `task-store` + real `outbox` + a fake `api-client` that talks to an **in-memory** Fastify+kysely+`:memory:` SQLite stack (same `app.inject(...)` as the API integration tests). The fake fetch is wired so `GoOffline()` makes fetches reject; `GoOnline()` re-enables them; `DropResponse` swallows the next response; `DuplicateReplay` re-runs the same idempotency key.
    - For every reachable state, assert:
      - **Never duplicate:** `(await api.inject({ method: 'GET', url: '/tasks' })).json()` has the same length as the model's `Set<id>` of live (not-deleted) tasks.
      - **Never lose:** every `Create` whose response was observed by the model is reachable via `GET /tasks` until a matching `Delete` is observed by the model.
    - `fc.assert` with `numRuns: 100` runs (each producing up to 1000 commands) — well within the <5min CI budget; reduce to `numRuns: 20` if local dev cycle slows.
    - Counterexamples are minimized automatically by fast-check; the failure log includes the minimal sequence.
  - [ ] 14.3 Wire the test into the Vitest run — by default `vitest.config.ts:7` includes `apps/**/*.test.{ts,tsx}` and `packages/**/*.test.ts`. Extend `include` to add `tests/property/**/*.test.ts`.

- [ ] **Task 15: E2E — offline write then reconnect** (AC: #3, #4)
  - [ ] 15.1 Create `tests/e2e/j6-offline-reconcile.spec.ts` (the file is named in architecture.md line 721; use that name):
    - `await page.goto("/")`, wait `networkidle`.
    - Add 1 task; verify it appears.
    - `await context.setOffline(true)`.
    - Add a second task while offline; verify it appears immediately (optimistic).
    - Reload the page (simulating browser restart); verify both tasks render from cache without any network request.
    - `await context.setOffline(false)`.
    - Wait for the outbox to drain (poll `GET /tasks` from the page or assert annunciator-store goes back to `online`); verify the server now has both tasks (`page.evaluate(() => fetch("/tasks").then(r => r.json()))` returns 2 entries).
  - [ ] 15.2 Add `tests/e2e/j3-return-after-absence.spec.ts` (also named in architecture.md line 718) — minimal version: open app, add 3 tasks, close + reopen page, assert all 3 visible from cache before any `/tasks` request lands. Use `page.route("/tasks", route => route.continue({ delay: 5000 }))` to slow the network request and verify the cached paint races ahead of the network.

- [ ] **Task 16: Migrate existing tests to the new Task shape** (AC: #12)
  - [ ] 16.1 Search `apps/web/src/` for `ActiveTask` literal constructions and add `userNamespace: "default"` + `updatedAt` to each. Tests touched (non-exhaustive — verify by running `pnpm test`):
    - `apps/web/src/store/task-store.test.ts`
    - `apps/web/src/store/undo-stack.test.ts`
    - `apps/web/src/components/TaskRow.test.tsx`
    - `apps/web/src/components/TaskList.test.tsx`
    - `apps/web/src/components/App.test.tsx`
  - [ ] 16.2 Add a small test fixture helper at `apps/web/src/lib/test-fixtures.ts`:
    ```ts
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
    ```
    Use this helper across the migrated tests to keep them concise.

- [ ] **Task 17: Anti-feature regression check** (AC: #11)
  - [ ] 17.1 Run `bash scripts/check-anti-features.sh` — must pass. The new code MUST NOT introduce any of: `toast(`, `Snackbar`, `Spinner`, `Skeleton`, `<Modal`, `<Dialog`, `🎉`, `<ErrorBoundary`. The annunciator-store does NOT count as a banned pattern (it's the architecturally-blessed single failure surface).
  - [ ] 17.2 Run the full test suite: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`. Pre-existing failing E2E specs (J1, J4, J6-edit, J5/keyboard-only) listed in `deferred-work.md` are still expected to fail — verify the failure list has not grown.
  - [ ] 17.3 Run `pnpm build` — verify the new dependencies and the SW source compile without errors. **Bundle budget verification is Story 1.12 territory** — do not gate on it here, but eyeball the gzipped output of `apps/web/dist/`: the SW chunk and `idb` (~1KB) should not push the initial bundle over 50KB. If it does, document in deferred-work.md and proceed.
  - [ ] 17.4 Verify `pnpm dev` brings up both the API (port 3000) and web (port 5173) correctly; smoke-test by adding a task in the browser and confirming a `POST /tasks` 201 in the API logs.

## Dev Notes

### CRITICAL: Architecture vs Epics Discrepancies (load-bearing)

**The architecture document is the source of truth.** Persistent corrections that apply to THIS story specifically:

1. **Database is SQLite (`better-sqlite3`), NOT PostgreSQL** — Story 1.9 epic body line 683 says "PostgreSQL schema"; architecture.md line 197 + 200-222 says SQLite. Architecture wins. This story implements SQLite. Postgres migration is a Growth-scope decision (architecture.md line 192) and is unblocked by the Kysely dialect-swap design.
2. **Backend directory is `apps/api`, NOT `apps/server`** — already established in Stories 1.1/1.7/1.8.
3. **Idempotency-key TTL is 14 days, NOT 24 hours** — architecture amendment AR13 / line 1030. Note: the actual purge job is Growth-scope; for v1 this story does NOT implement purging — rows accumulate harmlessly. The 14d TTL is enforced by the *outbox replay window*, not by a server purge.
4. **Service worker MUST exclude `/cdn-cgi/access/*`** — architecture amendment AR8 / line 1028. Load-bearing for Cloudflare Access compatibility (Story 1.13).

### Architecture Compliance

**Module boundaries (architecture.md "Module boundaries (frontend)" / `eslint.config.js:30-39`):**
- `sync/idb.ts`, `sync/outbox.ts`, `sync/api-client.ts`, `sync/sw-bridge.ts`, `sync/sw.ts` — all live in `sync/`. They may import from `@bmad-todo/shared` and from each other. They MUST NOT import from `components/` or `store/` (the eslint zone enforces this). The single exception is the SW source itself (`sw.ts`) which imports nothing from app code other than shared types.
- `task-store.ts` (in `store/`) imports from `sync/idb` and `sync/outbox` — `store → sync` is a permitted direction.
- `annunciator-store.ts` is in `store/` and imports only from `solid-js` and `@bmad-todo/shared`. The `outbox` and `task-store` write to it via `setSyncState(...)`.
- The new module-boundary import chain: `App.tsx (component) → task-store (store) → sync/outbox + sync/idb (sync) → sync/api-client (sync) → fetch (browser)`. One direction. Verify with `pnpm lint`.

**Module boundaries (backend) (architecture.md lines 418-423):**
- `routes/tasks.ts` validates input (Zod via `fastify-type-provider-zod`), calls `tasksRepo.*` and `idempotencyRepo.*`, returns response. NO SQL in routes.
- `db/repos/*.ts` own all SQL. Repos accept the `Kysely<Database>` instance via constructor.
- `middleware/*.ts` decorates the request (`req.userNamespace`, `req.idempotencyKey`) or globally formats errors.
- `db/migrate.ts` is invoked once at boot from `server.ts`; never from a route handler.

**Token discipline / no UI changes:**
- Story 1.9 introduces no new visible UI. The `<Annunciator>` component is Story 1.10. The new `annunciator-store.ts` is a state owner only — its consumers in v1 are limited to the dev-mode latency display (Story 1.11), the Annunciator component (Story 1.10), and `task-store`/`outbox` writes.
- Bundle-size discipline (NFR-Perf-6): `idb` is ~1KB gzipped; `workbox-*` is ~5-8KB gzipped; the SW lives in its own chunk (not the initial bundle). If the bundle-size check (Story 1.12) flags this, the most likely culprit is `vite-plugin-pwa` accidentally inlining workbox into the main bundle — verify with `vite build && du -h apps/web/dist/assets/*.js`.

**Capture-line / undo / focus invariants — preserved:**
- All keystroke handlers from Stories 1.3–1.8 continue to operate against the same in-memory `tasks` store. The `setTasks(...)` call is unchanged at every site; this story adds a sibling `void putTask(...)` and `void enqueueAndDrain(...)` after the optimistic update. The user-visible commit boundary is identical.
- Undo (`u`) still pops from the same `undo-stack` and dispatches the inverse mutation through the same `applyMutation` path (architecture.md line 480: "single entry point, used identically for user actions and undo replays"). Each inverse mutation now ALSO enqueues a fresh outbox entry with a fresh idempotency-key — so the server sees the undo as a normal mutation. AC#5 / Task 11.5 documents the corner case where undo-of-delete produces a re-create with same task id; the server's idempotency store is keyed by `idempotency_key`, NOT by `task.id`, so this works.

**Latency budget compliance:**
- All sync work is `void`-dispatched after the optimistic store update. The render path never awaits IDB or fetch.
- NFR-Perf-1 / NFR-Perf-2 / NFR-Perf-3 are unaffected — they're already verified by Story 1.7's keyboard-only spec and the latency benches (Story 1.12).
- NFR-Perf-7 (memory under 1000 tasks) — IDB and outbox both store per-task entries. 1000 tasks × ~150 bytes/entry ≈ 150KB IDB footprint plus the in-memory store. Comfortable headroom under the 50MB budget.

### Library / Framework Requirements

**Backend (`apps/api`):**
- `fastify@^5.3.3` (already pinned in apps/api/package.json — preserve)
- `better-sqlite3@^11.5.0` — synchronous SQLite driver. Native build; CI must have build-essential available. Verify Node 20 LTS works.
- `kysely@^0.27.4` + Kysely's built-in `SqliteDialect` (no extra package needed)
- `zod@^3.23.8`, `fastify-type-provider-zod@^4.0.0` — ZodTypeProvider plugin
- `@fastify/rate-limit@^10.2.1` — 100 req/min per `user_namespace`
- `pino@^9.5.0` — Fastify default logger (set via `Fastify({ logger: pino(...) })`)

**Frontend (`apps/web`):**
- `idb@^8.0.0` — IDB wrapper
- `vite-plugin-pwa@^0.21.0` — SW orchestrator (`injectManifest` strategy)
- `workbox-precaching@^7.3.0`, `workbox-routing@^7.3.0`, `workbox-strategies@^7.3.0`, `workbox-background-sync@^7.3.0` — selective Workbox modules per architecture.md line 301
- `uuidv7@^1.2.1` — already in apps/web/package.json from Story 1.1; reused for both Task IDs and Idempotency-Keys.

**Test:**
- `fake-indexeddb@^6.0.0` (devDep) — IDB polyfill for jsdom
- `fast-check@^3.23.0` (devDep) — property-based test framework

**No new global runtime dependencies.** Verify `pnpm-lock.yaml` is sane after install.

### File Structure Requirements

**New files:**
- `packages/shared/src/sw-messages.ts`
- `apps/api/src/env.ts`
- `apps/api/src/lib/log.ts`
- `apps/api/src/lib/hash.ts`
- `apps/api/migrations/0001_init.sql`
- `apps/api/src/db/migrate.ts`
- `apps/api/src/db/kysely.ts`
- `apps/api/src/db/mappers.ts`
- `apps/api/src/db/repos/tasks-repo.ts` + `.test.ts`
- `apps/api/src/db/repos/idempotency-repo.ts` + `.test.ts`
- `apps/api/src/middleware/idempotency.ts`
- `apps/api/src/middleware/error-envelope.ts`
- `apps/api/src/middleware/auth-jwt.ts`
- `apps/api/src/middleware/rate-limit.ts`
- `apps/api/src/routes/tasks.ts` + `.integration.test.ts`
- `apps/web/src/sync/idb.ts` + `.test.ts`
- `apps/web/src/sync/api-client.ts` + `.test.ts`
- `apps/web/src/sync/outbox.ts` + `.test.ts`
- `apps/web/src/sync/sw-bridge.ts`
- `apps/web/src/sync/sw.ts`
- `apps/web/src/store/annunciator-store.ts` + `.test.ts`
- `apps/web/src/lib/test-fixtures.ts`
- `tests/property/sync-invariants.test.ts`
- `tests/e2e/j3-return-after-absence.spec.ts`
- `tests/e2e/j6-offline-reconcile.spec.ts`
- `tests/e2e/sw-cdn-cgi-exclusion.spec.ts`

**Modified files:**
- `packages/shared/src/schema.ts` (rewritten)
- `packages/shared/src/index.ts` (re-exports)
- `packages/shared/src/schema.test.ts` (rewritten)
- `packages/shared/package.json` (add zod dep)
- `apps/api/package.json` (add deps)
- `apps/api/src/server.ts` (wire DB + middleware + routes)
- `apps/web/package.json` (add idb, vite-plugin-pwa, workbox-*)
- `apps/web/vite.config.ts` (register VitePWA)
- `apps/web/src/index.tsx` (call `hydrateFromCache` + `registerSw`)
- `apps/web/src/store/task-store.ts` (cache + outbox + reconcile)
- `apps/web/src/components/App.tsx` (call `reconcileWithServer` from onMount; online/offline listeners)
- All test files in `apps/web/src/` and `tests/e2e/` that construct `ActiveTask` literals (Task 16)
- `vitest.config.ts` (add `tests/property/**` to include glob)
- Root `package.json` (devDep `fast-check`, `fake-indexeddb`)

### Testing Standards

**Test framework discipline (architecture.md "Test colocation rules"):**
- Co-located unit tests alongside source — `*.test.ts`/`.test.tsx`. Vitest + jsdom.
- API integration tests in `apps/api/src/routes/*.integration.test.ts` — Vitest, in-memory SQLite via `:memory:` connection string, Fastify's `app.inject(...)` instead of a real HTTP server.
- Property-based: `tests/property/sync-invariants.test.ts` — `fast-check` + Vitest.
- E2E: `tests/e2e/*.spec.ts` — Playwright + Chromium.

**Test framework setup notes:**
- `fake-indexeddb/auto` import at the top of any web-side test that uses IDB. Auto-mode replaces `globalThis.indexedDB` for the test process.
- For property tests, the in-memory SQLite db is rebuilt per `fc.assert` run (not per command) — performance trade-off; document in the test file's header.
- `vitest.setup.ts` already stubs `window.matchMedia`. Story 1.9 may need to extend it with `globalThis.indexedDB = require("fake-indexeddb")` if individual test files start to forget the import — for now, the per-file import is sufficient.

**CI gates that must pass:**
- `pnpm lint` — no `console.log`, no default exports outside whitelist, `import/no-restricted-paths` clean (the new sync layer is the most likely place to violate the components→store→sync direction; verify).
- `pnpm typecheck` — strict TS; the new shared types ripple into web and api; expect 5–15 type-error fix-ups during the migration.
- `pnpm test` — Vitest unit + property + integration. The new property test runs at `numRuns: 100`; if local CI exceeds NFR-Maint-5 (5 min), reduce to `numRuns: 20` and document.
- `bash scripts/check-anti-features.sh` — no `<Modal`, `Spinner`, etc.
- `pnpm test:e2e` — Playwright suite, including the two new specs and the SW exclusion spec.
- `pnpm build` — production build must succeed; Story 1.12 will gate on bundle size.

### Previous Story Intelligence

**From Story 1.8 (Theme Toggle, just-completed `review` status):**
- The `task-store` was extended without breaking changes by Story 1.6 (undo) and Story 1.7 (focus). The pattern: add new exports, don't change existing ones. Story 1.9 follows the same pattern but additionally **migrates** `ActiveTask` to extend the shared `Task` (adds two fields). All existing call-sites continue to work; tests need fixture updates.
- `vitest.setup.ts` was added to stub `window.matchMedia`. If `fake-indexeddb` is similarly easy to globally stub, prefer that. For now, per-file import keeps blast radius small.
- The `theme-store` test pattern (`vi.resetModules()` + dynamic import per test) is reusable for the new `task-store` cache-hydration tests — the cached state at module-load time changes the initial signal.

**From Story 1.7 (Keyboard Navigation):**
- The `applyMutation` mental model: every mutation, including undo replays, goes through the same single entry point. Story 1.9 must preserve this — the outbox enqueue happens inside the existing `task-store` mutators, NOT in `App.tsx` or `TaskRow.tsx`. The components stay presentation-only.
- `clearAllTasks()` is exported from `task-store` for tests. Story 1.9 adds `clearAll()` (in `idb.ts`) and `_resetForTesting()` (in `annunciator-store.ts`) — keep the test-only exports clearly named with the underscore prefix or `clearAllX` form.

**From Story 1.6 (Undo Stack):**
- The undo-stack already snapshots the full task on delete and replays via `insertTaskAtIndex`. No undo logic changes in Story 1.9 — only the side-effects of the mutators it calls.
- The "unbounded undo stack growth" deferred item from Story 1.6 (`deferred-work.md`) is unchanged and remains out of scope.

**From Story 1.4 (Tick / Completion):**
- `toggleTaskCompleted` writes a single column. The corresponding `Mutation { type: 'update', completedAt }` is the smallest possible patch — keep `text` field undefined in the Zod input so the server's `UpdateTaskInput.refine(...)` rule accepts it.

**From Story 1.2 (Tokens & Theme):**
- The `theme-bootstrap.ts` inline-head script in `index.html:8-23` runs before any module script and writes `data-theme`. Story 1.9 adds an awaited `hydrateFromCache()` in the entry script; this means the CACHE-driven first paint may delay first paint by a few milliseconds (IDB open + getAll on a cold DB is typically <10ms). Verify with the latency bench (Story 1.12). If this is a problem, switch to a render-immediately + hydrate-into-store pattern (start with `[]` and replace it post-mount); the user-perceived effect is identical because the empty state is the same composition either way.

**From Story 1.1 (Repo Scaffold):**
- Vite proxy at `vite.config.ts:9-12` already forwards `/tasks` and `/health` to `:3000`. Same-origin assumption holds.
- The `console.log` in `apps/api/src/server.ts:22` is whitelisted by lint. Replace with `log.info({ event: 'server.listening', port })` for consistency, but only after `pino` is wired up (Task 2.3).

### Latest Tech Information

**`vite-plugin-pwa@^0.21` with `injectManifest` strategy (verify before Task 10):**
- The plugin generates a precache manifest at build time and injects `self.__WB_MANIFEST` into the SW source. The SW source is a regular TS file at `srcDir/filename` — Vite compiles it with the same TS config as the app.
- `devOptions.enabled: false` keeps the SW disabled in dev (recommended — avoids HMR collisions). Test SW behavior in production builds via `pnpm --filter web preview` after `pnpm build`.

**`fast-check@^3` `fc.commands` API:**
- The state-machine test pattern: define a `Real` (system under test) and a `Model` (oracle), each with mirrored command implementations. `fc.commands([...generators], { size, replayPath })` produces randomized command sequences; the framework runs each against both Real and Model and checks invariants after each step. The failure log includes the minimal counterexample.

**`better-sqlite3@^11` + `kysely@^0.27` `SqliteDialect`:**
- `better-sqlite3` is synchronous — Kysely's SqliteDialect wraps it in a synchronous-promise to satisfy Kysely's async API. Performance is dominated by the C library; the wrapper adds <1µs/call.
- `WAL mode` (`sqlite.pragma("journal_mode = WAL")`) is required (architecture.md line 197). Concurrent readers under a write don't block.

**`fastify-type-provider-zod@^4`:**
- The `ZodTypeProvider` integrates Fastify's typing with Zod schemas. `validatorCompiler` and `serializerCompiler` are the two functions to register globally. Routes declared with `app.withTypeProvider<ZodTypeProvider>()` get full type inference from `schema.body` / `schema.params` / `schema.querystring` / `schema.response`.

**Workbox `injectManifest` strategy:**
- The SW source is hand-written; the plugin only injects the precache manifest. This keeps the SW's behavior visible in code (the alternative `generateSW` strategy is opaque) and is the right choice for a project with strict bundle and behavior discipline.

### Project Structure Notes

**Alignment with unified project structure (architecture.md "Complete Project Directory Structure", lines 609-762):**
- Every new file Story 1.9 creates is at a path the architecture document already names. No structural variance.
- The architecture's `apps/web/src/sync/` directory is materialized for the first time in this story. It contains exactly: `idb.ts`, `outbox.ts`, `api-client.ts`, `sw-bridge.ts`, `sw.ts`, plus their co-located tests.
- The architecture's `apps/api/src/db/repos/` directory is materialized here. It contains exactly: `tasks-repo.ts`, `idempotency-repo.ts`, plus their co-located tests.
- The architecture's `apps/api/src/middleware/` directory is materialized here. It contains: `idempotency.ts`, `error-envelope.ts`, `auth-jwt.ts`, `rate-limit.ts`. (`auth-jwt.test.ts` is deferred to Story 1.13 since v1 only ships the dev-bypass.)
- The architecture's `apps/api/migrations/` directory is materialized with `0001_init.sql`. (The architecture references `0002_indexes.sql` separately; we fold the indexes into `0001` for simplicity — they're in the same DDL transaction. Note for future migrations: keep them small and additive.)

**Detected conflicts or variances:**
- **Epic body says PostgreSQL — architecture says SQLite.** Resolved per the "Architecture vs Epics Discrepancies" header above; SQLite wins.
- **Epic body lists `position` column on tasks table.** The architecture.md schema (lines 200-210) has no `position` column; ordering is purely by `id` (UUIDv7 ⇔ `created_at DESC`). The architecture is correct — Story 1.3 already implements newest-first via `[task, ...prev]` in-memory; the server matches. **Do not add a `position` column.**
- **Soft-delete retention is "≥30 days" per epic; the architecture says no purge logic in v1.** Reconcile: in v1, soft-deleted rows are never purged — retention is effectively unbounded for the single-user volume. The 30-day floor is satisfied trivially. A purge cron is Growth-scope.
- **`<Annunciator>` UI is intentionally NOT implemented in this story.** AC#3 / AC#11 stop at the `annunciator-store.syncState` signal. Story 1.10 adds the visible UI. Failing to draw this boundary clearly is the highest-risk way this story over-runs scope.

### References

- Source acceptance criteria: [_bmad-output/planning-artifacts/epics.md#Story-1.9](../../_bmad-output/planning-artifacts/epics.md) (lines 651-686)
- PRD requirements: [_bmad-output/planning-artifacts/prd.md](../../_bmad-output/planning-artifacts/prd.md) — FR21–28 (persistence/sync), FR29 (single annunciator surface — partial), FR30 (no success indicators), NFR-Rel-1/2/3/4/5/6, NFR-Sec-1/2/3, NFR-Priv-1/4
- Architecture: [_bmad-output/planning-artifacts/architecture.md](../../_bmad-output/planning-artifacts/architecture.md) — lines 197-231 (Data Architecture), 232-247 (Auth/Security), 248-275 (API patterns), 277-305 (Frontend SW + reactivity), 367-538 (Implementation Patterns — full section), 605-762 (Complete Directory Structure), 805-880 (Data flow diagrams), 1018-1049 (Important gaps + amendments)
- UX design: [_bmad-output/planning-artifacts/ux-design-specification.md](../../_bmad-output/planning-artifacts/ux-design-specification.md) — UX-DR13 (Annunciator behavior — relevant to syncState transitions but NOT to this story's UI), UX-DR20 (annunciator routing principle), UX-DR21 (pre-fetch capture for first-ever visit)
- Existing infrastructure (DO NOT duplicate):
  - In-memory task store: `apps/web/src/store/task-store.ts` (extended in Task 11, not replaced)
  - Undo stack: `apps/web/src/store/undo-stack.ts` (no changes; new outbox side-effects flow through the existing mutators)
  - UUIDv7 generator: `apps/web/src/lib/ids.ts`
  - Vite proxy: `apps/web/vite.config.ts:9-12`
  - Fastify scaffold: `apps/api/src/server.ts` + `apps/api/src/routes/health.ts`
  - Anti-feature check: `scripts/check-anti-features.sh` (forbidden patterns to avoid)
- Previous story: [_bmad-output/implementation-artifacts/1-8-theme-toggle-dark-mode-and-accessibility-tokens.md](./1-8-theme-toggle-dark-mode-and-accessibility-tokens.md) (status `review`; theme-store / sw lifecycle patterns this story extends)
- Deferred work: [_bmad-output/implementation-artifacts/deferred-work.md](./deferred-work.md) — Story 1.4 line 45: "No maximum task count or text length limit in `task-store.ts` — address when persistence lands in Story 1.9." Task 1.1 implements both via Zod (max 10000 chars enforced server-side; no client-side max-task-count cap intentionally — bounded by user behavior and database growth).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Story 1.9 context engineered: full backend persistence + offline-first sync layer + property-based sync invariants.   |
