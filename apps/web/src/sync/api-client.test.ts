import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteTaskRequest,
  fetchTasks,
  patchTask,
  postTask,
} from "./api-client";

function mockResponse(
  status: number,
  body: unknown,
  init: { isJson?: boolean } = {},
): Response {
  const headers = new Headers();
  if (status !== 204 && init.isJson !== false) {
    headers.set("content-type", "application/json");
  }
  return new Response(
    status === 204 ? null : JSON.stringify(body ?? null),
    { status, headers },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api-client", () => {
  it("postTask sends Idempotency-Key + JSON body and returns the task", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(201, {
        id: "a",
        userNamespace: "default",
        text: "x",
        completedAt: null,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const t = await postTask(
      { id: "a", text: "x", createdAt: 1 },
      "key-1",
    );
    expect(t.id).toBe("a");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/tasks");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "key-1",
    );
  });

  it("fetchTasks returns parsed JSON on 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(200, []),
    );
    expect(await fetchTasks()).toEqual([]);
  });

  it("patchTask sends PATCH with the id encoded", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(200, {
        id: "a/b",
        userNamespace: "default",
        text: "y",
        completedAt: null,
        createdAt: 1,
        updatedAt: 2,
      }),
    );
    await patchTask("a/b", { text: "y" }, "k");
    const [url] = fetchSpy.mock.calls[0]! as [string];
    expect(url).toBe("/tasks/a%2Fb");
  });

  it("deleteTaskRequest handles 204", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(204, null),
    );
    await expect(deleteTaskRequest("a", "k")).resolves.toBeUndefined();
  });

  it("throws ApiError for 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(400, {
        error: { code: "ValidationError", message: "bad" },
      }),
    );
    await expect(fetchTasks()).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError for 409", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(409, {
        error: { code: "Conflict", message: "key replay" },
      }),
    );
    await expect(
      postTask({ id: "a", text: "x", createdAt: 1 }, "k"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws ApiError for 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(500, { error: { code: "ServerError", message: "boom" } }),
    );
    await expect(fetchTasks()).rejects.toMatchObject({ status: 500 });
  });
});
