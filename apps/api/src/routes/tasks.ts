import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { CreateTaskInput, UpdateTaskInput } from "@bmad-todo/shared";
import { TasksRepo } from "../db/repos/tasks-repo.js";
import { IdempotencyRepo } from "../db/repos/idempotency-repo.js";
import type { DB } from "../db/kysely.js";
import { makeIdempotencyHook } from "../middleware/idempotency.js";
import { NotFoundError, ConflictError } from "../middleware/error-envelope.js";
import { log } from "../lib/log.js";

export interface TaskRoutesDeps {
  tasksRepo: TasksRepo;
  idempotencyRepo: IdempotencyRepo;
  kysely: Kysely<DB>;
}

async function storeIdempotencyTrx(
  trx: Kysely<DB>,
  req: FastifyRequest,
  status: number,
  body: unknown,
): Promise<void> {
  if (!req.idempotencyKey || !req.idempotencyRequestHash) return;
  const serialized = body === undefined ? "" : JSON.stringify(body);
  const repo = new IdempotencyRepo(trx);
  await repo.store(
    req.idempotencyKey,
    req.userNamespace,
    req.idempotencyRequestHash,
    status,
    serialized,
  );
}

export async function taskRoutes(app: FastifyInstance, deps: TaskRoutesDeps): Promise<void> {
  const { tasksRepo, idempotencyRepo, kysely } = deps;
  const idemHook = makeIdempotencyHook(idempotencyRepo);

  app.get("/tasks", async (req: FastifyRequest, reply: FastifyReply) => {
    const tasks = await tasksRepo.listActive(req.userNamespace);
    return reply.status(200).send(tasks);
  });

  app.post("/tasks", { preHandler: idemHook }, async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateTaskInput.parse(req.body);
    const task = await kysely.transaction().execute(async (trx) => {
      const trxTasksRepo = new TasksRepo(trx);
      let created;
      try {
        created = await trxTasksRepo.create({
          id: parsed.id,
          userNamespace: req.userNamespace,
          text: parsed.text,
          createdAt: parsed.createdAt,
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
          throw new ConflictError(`Task ${parsed.id} already exists`);
        }
        throw err;
      }
      await storeIdempotencyTrx(trx, req, 201, created);
      return created;
    });
    log.info({
      event: "task.created",
      taskId: task.id,
      userNamespace: req.userNamespace,
      idempotencyKey: req.idempotencyKey,
      status: "new",
    });
    return reply.status(201).send(task);
  });

  app.patch<{ Params: { id: string } }>(
    "/tasks/:id",
    { preHandler: idemHook },
    async (req, reply) => {
      const id = req.params.id;
      const parsed = UpdateTaskInput.parse(req.body);
      const patch: { text?: string; completedAt?: number | null } = {};
      if (parsed.text !== undefined) patch.text = parsed.text;
      if (parsed.completedAt !== undefined) patch.completedAt = parsed.completedAt;
      const task = await kysely.transaction().execute(async (trx) => {
        const trxTasksRepo = new TasksRepo(trx);
        const updated = await trxTasksRepo.update(id, req.userNamespace, patch);
        if (!updated) throw new NotFoundError(`Task ${id} not found`);
        await storeIdempotencyTrx(trx, req, 200, updated);
        return updated;
      });
      log.info({
        event: "task.updated",
        taskId: task.id,
        userNamespace: req.userNamespace,
        idempotencyKey: req.idempotencyKey,
        status: "new",
      });
      return reply.status(200).send(task);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/tasks/:id",
    { preHandler: idemHook },
    async (req, reply) => {
      const id = req.params.id;
      await kysely.transaction().execute(async (trx) => {
        const trxTasksRepo = new TasksRepo(trx);
        await trxTasksRepo.softDelete(id, req.userNamespace);
        await storeIdempotencyTrx(trx, req, 204, undefined);
      });
      log.info({
        event: "task.deleted",
        taskId: id,
        userNamespace: req.userNamespace,
        idempotencyKey: req.idempotencyKey,
        status: "new",
      });
      return reply.status(204).send();
    },
  );
}
