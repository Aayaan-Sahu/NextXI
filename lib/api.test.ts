import { afterEach, describe, expect, mock, test } from "bun:test";
import { z } from "zod";

/**
 * The handler is exercised with the auth and data layers replaced: who is
 * signed in and what rows exist are inputs to these tests, not a database.
 */
type FakeUser = { id: string; email?: string } | null;
const state: {
  user: FakeUser;
  player: { id: string; status: string } | null;
  coach: { id: string; status: string } | null;
  guardian: { id: string } | null;
} = { user: null, player: null, coach: null, guardian: null };

mock.module("@/lib/auth", () => ({
  getCurrentUser: async () => state.user,
  isAdmin: (user: FakeUser) => user?.email === "admin@nextxi.pro",
}));
mock.module("@/lib/prisma", () => ({
  prisma: {
    player: { findUnique: async () => state.player },
    coach: { findUnique: async () => state.coach },
    guardian: { findUnique: async () => state.guardian },
  },
}));
mock.module("server-only", () => ({}));

const { ApiError, apiHandler, resolveApiAuth } = await import("@/lib/api");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "player@example.com" };

function request(url: string, init?: RequestInit) {
  return new Request(`https://app.test${url}`, init);
}

async function body(response: Response) {
  return { status: response.status, json: await response.json() };
}

afterEach(() => {
  state.user = null;
  state.player = null;
  state.coach = null;
  state.guardian = null;
});

describe("resolveApiAuth", () => {
  test("none: works signed out and passes the user through when signed in", async () => {
    expect(await resolveApiAuth("none")).toEqual({ user: null });
    state.user = USER;
    expect(await resolveApiAuth("none")).toEqual({ user: USER });
  });

  test("user: 401 when signed out", async () => {
    await expect(resolveApiAuth("user")).rejects.toMatchObject({ status: 401, message: "Authentication required." });
  });

  test("player: the upload routes' exact rules and wording", async () => {
    state.user = USER;
    await expect(resolveApiAuth("player")).rejects.toMatchObject({ status: 403, message: "Player account required." });
    state.player = { id: USER.id, status: "PENDING_GUARDIAN" };
    await expect(resolveApiAuth("player")).rejects.toMatchObject({ status: 403, message: "Account pending guardian approval." });
    state.player = { id: USER.id, status: "ACTIVE" };
    expect(await resolveApiAuth("player")).toEqual({ user: USER, player: state.player });
  });

  test("coach: must exist and be approved", async () => {
    state.user = USER;
    await expect(resolveApiAuth("coach")).rejects.toMatchObject({ status: 403, message: "Coach account required." });
    state.coach = { id: USER.id, status: "PENDING" };
    await expect(resolveApiAuth("coach")).rejects.toMatchObject({ status: 403, message: "Coach account pending approval." });
    state.coach = { id: USER.id, status: "APPROVED" };
    expect(await resolveApiAuth("coach")).toEqual({ user: USER, coach: state.coach });
  });

  test("guardian and admin", async () => {
    state.user = USER;
    await expect(resolveApiAuth("guardian")).rejects.toMatchObject({ status: 403 });
    state.guardian = { id: USER.id };
    expect(await resolveApiAuth("guardian")).toEqual({ user: USER, guardian: state.guardian });
    await expect(resolveApiAuth("admin")).rejects.toMatchObject({ status: 403, message: "Admin access required." });
    state.user = { id: USER.id, email: "admin@nextxi.pro" };
    expect(await resolveApiAuth("admin")).toEqual({ user: state.user });
  });
});

describe("apiHandler", () => {
  test("a plain object is sent as JSON 200; a Response is passed through", async () => {
    state.user = USER;
    const plain = apiHandler({ auth: "user" }, async ({ user }) => ({ hello: user.id }));
    expect(await body(await plain(request("/api/x")))).toEqual({ status: 200, json: { hello: USER.id } });

    const raw = apiHandler({ auth: "none" }, async () => new Response("created", { status: 201 }));
    const response = await raw(request("/api/x"));
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("created");
  });

  test("auth failures use the wire shape { error } with the status", async () => {
    const handler = apiHandler({ auth: "user" }, async () => ({}));
    expect(await body(await handler(request("/api/x")))).toEqual({
      status: 401,
      json: { error: "Authentication required." },
    });
  });

  test("body: invalid JSON is 400, schema failures name the field, valid bodies are typed", async () => {
    const handler = apiHandler(
      { auth: "none", body: z.object({ heightCm: z.number().int().min(1), name: z.string().min(1) }) },
      async ({ body }) => ({ echo: body }),
    );
    const post = (payload: string) =>
      handler(request("/api/x", { method: "POST", body: payload, headers: { "content-type": "application/json" } }));

    expect(await body(await post("{not json"))).toEqual({ status: 400, json: { error: "Invalid JSON body." } });

    const invalid = await body(await post(JSON.stringify({ heightCm: "tall", name: "A" })));
    expect(invalid.status).toBe(400);
    expect(invalid.json.error).toMatch(/^heightCm: /);
    expect(invalid.json.issues).toEqual([{ path: "heightCm", message: expect.any(String) }]);

    expect(await body(await post(JSON.stringify({ heightCm: 175, name: "Aryaman" })))).toEqual({
      status: 200,
      json: { echo: { heightCm: 175, name: "Aryaman" } },
    });
  });

  test("query: parsed from search params, coerced by the schema", async () => {
    const handler = apiHandler(
      { auth: "none", query: z.object({ limit: z.coerce.number().int().max(50).default(20), cursor: z.string().optional() }) },
      async ({ query }) => query,
    );
    expect((await body(await handler(request("/api/x?limit=5")))).json).toEqual({ limit: 5 });
    expect((await body(await handler(request("/api/x")))).json).toEqual({ limit: 20 });
    expect((await body(await handler(request("/api/x?limit=500")))).status).toBe(400);
  });

  test("route params are flattened, catch-alls joined", async () => {
    const handler = apiHandler({ auth: "none" }, async ({ params }) => params);
    const response = await handler(request("/api/x"), {
      params: Promise.resolve({ username: "aryaman", rest: ["a", "b"] }),
    });
    expect((await body(response)).json).toEqual({ username: "aryaman", rest: "a/b" });
  });

  test("ApiError is answered as thrown; anything else is a bare 500", async () => {
    const expected = apiHandler({ auth: "none" }, async () => {
      throw new ApiError(404, "Session not found.");
    });
    expect(await body(await expected(request("/api/x")))).toEqual({ status: 404, json: { error: "Session not found." } });

    const original = console.error;
    console.error = () => {};
    try {
      const crash = apiHandler({ auth: "none" }, async () => {
        throw new Error("secret internal detail");
      });
      expect(await body(await crash(request("/api/x")))).toEqual({ status: 500, json: { error: "Something went wrong." } });
    } finally {
      console.error = original;
    }
  });
});
