import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CreateTaskInput, UpdateTaskInput } from "@bmad-todo/shared";
import type { TasksRepo } from "../db/repos/tasks-repo.js";
import type { IdempotencyRepo } from "../db/repos/idempotency-repo.js";
import { makeIdempotencyHook } from "../middleware/idempotency.js";
import { NotFoundError } from "../middleware/error-envelope.js";
import { log } from "../lib/log.js";

interface TaskRoutesDeps {
  tasksRepo: TasksRepo;
  idempotencyRepo: IdempotencyRepo;
}

async function storeIdempotency(
  req: FastifyRequest,
  idemRepo: IdempotencyRepo,
  status: number,
  body: unknown,
): Promise<void> {
  if (!req.idempotencyKey || !req.idempotencyRequestHash) return;
  const serialized = body === undefined ? "" : JSON.stringify(body);
  await idemRepo.store(
    req.idempotencyKey,
    req.userNamespace,
    req.idempotencyRequestHash,
    status,
    serialized,
  );
}

export async function taskRoutes(
  app: FastifyInstance,
  deps: TaskRoutesDeps,
): Promise<void> {
  const { tasksRepo, idempotencyRepo } = deps;
  const idemHook = makeIdempotencyHook(idempotencyRepo);

  app.get("/tasks", async (req: FastifyRequest, reply: FastifyReply) => {
    const tasks = await tasksRepo.listActive(req.userNamespace);
    return reply.status(200).send(tasks);
  });

  app.post(
    "/tasks",
    { preHandler: idemHook },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = CreateTaskInput.parse(req.body);
      const task = await tasksRepo.create({
        id: parsed.id,
        userNamespace: req.userNamespace,
        text: parsed.text,
        createdAt: parsed.createdAt,
      });
      log.info({
        event: "task.created",
        taskId: task.id,
        userNamespace: req.userNamespace,
        idempotencyKey: req.idempotencyKey,
        status: "new",
      });
      await storeIdempotency(req, idempotencyRepo, 201, task);
      return reply.status(201).send(task);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/tasks/:id",
    { preHandler: idemHook },
    async (req, reply) => {
      const id = req.params.id;
      const parsed = UpdateTaskInput.parse(req.body);
      const patch: { text?: string; completedAt?: number | null } = {};
      if (parsed.text !== undefined) patch.text = parsed.text;
      if (parsed.completedAt !== undefined) patch.completedAt = parsed.completedAt;
      const task = await tasksRepo.update(id, req.userNamespace, patch);
      if (!task) throw new NotFoundError(`Task ${id} not found`);
      log.info({
        event: "task.updated",
        taskId: task.id,
        userNamespace: req.userNamespace,
        idempotencyKey: req.idempotencyKey,
        status: "new",
      });
      await storeIdempotency(req, idempotencyRepo, 200, task);
      return reply.status(200).send(task);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/tasks/:id",
    { preHandler: idemHook },
    async (req, reply) => {
      const id = req.params.id;
      const ok = await tasksRepo.softDelete(id, req.userNamespace);
      if (!ok) throw new NotFoundError(`Task ${id} not found`);
      log.info({
        event: "task.deleted",
        taskId: id,
        userNamespace: req.userNamespace,
        idempotencyKey: req.idempotencyKey,
        status: "new",
      });
      await storeIdempotency(req, idempotencyRepo, 204, undefined);
      return reply.status(204).send();
    },
  );
}
