import type {
  CreateTaskInput,
  ErrorEnvelope,
  Task,
  UpdateTaskInput,
} from "@bmad-todo/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    public envelope: ErrorEnvelope,
  ) {
    super(envelope.error.message);
    this.name = "ApiError";
  }
}

async function parseOrThrow(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiError(res.status, {
        error: { code: "ServerError", message: `HTTP ${res.status}` },
      });
    }
    return null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, json as ErrorEnvelope);
  }
  return json;
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/tasks", { method: "GET" });
  return (await parseOrThrow(res)) as Task[];
}

export async function postTask(
  input: CreateTaskInput,
  idempotencyKey: string,
): Promise<Task> {
  const res = await fetch("/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  return (await parseOrThrow(res)) as Task;
}

export async function patchTask(
  id: string,
  input: UpdateTaskInput,
  idempotencyKey: string,
): Promise<Task> {
  const res = await fetch(`/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  return (await parseOrThrow(res)) as Task;
}

export async function deleteTaskRequest(
  id: string,
  idempotencyKey: string,
): Promise<void> {
  const res = await fetch(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  await parseOrThrow(res);
}
