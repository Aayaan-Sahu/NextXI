import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { CoachStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { getCurrentUser, isAdmin, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The one way to write a JSON API route.
 *
 * The web app is Server Actions almost everywhere; the native apps can only
 * speak HTTP, so every screen they need gets a route here. `apiHandler`
 * owns the three things every route would otherwise re-implement — who is
 * calling (and whether their role and status allow the action), what the
 * request must contain, and what an error looks like on the wire — so a
 * route body is only the rule itself, and the rule lives in one `lib/*`
 * function that the equivalent Server Action calls too.
 *
 * On the wire, every failure is `{ error: string }` with an HTTP status —
 * the shape the existing upload routes have always returned and the one the
 * web's upload client already parses. Validation failures add `issues`.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...details }, { status });
}

/**
 * Who may call a route. Statuses are enforced here with the same messages
 * the existing routes and Server Actions use, so a client sees one wording
 * for one condition wherever it hits it.
 */
export type ApiAuth = "none" | "user" | "player" | "coach" | "guardian" | "admin";

export type PlayerAuth = { id: string; status: PlayerStatus };
export type CoachAuth = { id: string; status: CoachStatus };
export type GuardianAuth = { id: string };

export type AuthContext<A extends ApiAuth> = A extends "none"
  ? { user: SessionUser | null }
  : A extends "player"
    ? { user: SessionUser; player: PlayerAuth }
    : A extends "coach"
      ? { user: SessionUser; coach: CoachAuth }
      : A extends "guardian"
        ? { user: SessionUser; guardian: GuardianAuth }
        : { user: SessionUser };

export const AUTH_REQUIRED = "Authentication required.";

/** Resolves the caller for `auth`, or throws the ApiError the route returns. */
export async function resolveApiAuth<A extends ApiAuth>(auth: A): Promise<AuthContext<A>> {
  const user = await getCurrentUser();
  if (auth === "none") return { user } as AuthContext<A>;
  if (!user) throw new ApiError(401, AUTH_REQUIRED);

  switch (auth) {
    case "user":
      return { user } as AuthContext<A>;
    case "admin":
      if (!isAdmin(user)) throw new ApiError(403, "Admin access required.");
      return { user } as AuthContext<A>;
    case "player": {
      const player = await prisma.player.findUnique({
        where: { id: user.id },
        select: { id: true, status: true },
      });
      if (!player) throw new ApiError(403, "Player account required.");
      if (player.status !== PlayerStatus.ACTIVE) {
        throw new ApiError(403, "Account pending guardian approval.");
      }
      return { user, player } as AuthContext<A>;
    }
    case "coach": {
      const coach = await prisma.coach.findUnique({
        where: { id: user.id },
        select: { id: true, status: true },
      });
      if (!coach) throw new ApiError(403, "Coach account required.");
      if (coach.status !== CoachStatus.APPROVED) {
        throw new ApiError(403, "Coach account pending approval.");
      }
      return { user, coach } as AuthContext<A>;
    }
    case "guardian": {
      const guardian = await prisma.guardian.findUnique({
        where: { id: user.id },
        select: { id: true },
      });
      if (!guardian) throw new ApiError(403, "Guardian account required.");
      return { user, guardian } as AuthContext<A>;
    }
  }
  throw new ApiError(500, "Unknown auth requirement.");
}

type RouteContext = { params?: Promise<Record<string, string | string[]>> };

type HandlerContext<A extends ApiAuth, B, Q> = AuthContext<A> & {
  body: B;
  query: Q;
  params: Record<string, string>;
  request: Request;
};

type Options<A extends ApiAuth, B, Q> = {
  auth: A;
  /** Parsed from the JSON body. Absent → the body is not read. */
  body?: ZodType<B>;
  /** Parsed from the URL's search params (strings; coerce in the schema). */
  query?: ZodType<Q>;
};

/** "heightCm: Expected number" — the first issue, path-prefixed, as the error line. */
function issueMessage(issue: { path: PropertyKey[]; message: string }) {
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function parseWith<T>(schema: ZodType<T>, input: unknown, what: string): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
  throw new ApiError(400, issues[0] ? issueMessage(result.error.issues[0]) : `Invalid ${what}.`, {
    issues,
  });
}

/** Route params arrive as string | string[]; a catch-all's array joins with "/". */
function flattenParams(params: Record<string, string | string[]> | undefined) {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    flat[key] = Array.isArray(value) ? value.join("/") : value;
  }
  return flat;
}

/**
 * Wraps a route body. The body returns either a `Response` (for anything but
 * 200 JSON — a 201, a redirect, a stream) or a plain object, which is sent
 * as JSON. Throw `ApiError` for expected failures; anything else is logged
 * and answered with a bare 500 so no internals leak.
 */
export function apiHandler<A extends ApiAuth, B = undefined, Q = undefined>(
  options: Options<A, B, Q>,
  handler: (context: HandlerContext<A, B, Q>) => Promise<Response | object>,
) {
  return async (request: Request, route?: RouteContext): Promise<Response> => {
    try {
      const auth = await resolveApiAuth(options.auth);

      let body = undefined as B;
      if (options.body) {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw new ApiError(400, "Invalid JSON body.");
        }
        body = parseWith(options.body, raw, "body");
      }

      let query = undefined as Q;
      if (options.query) {
        const search = Object.fromEntries(new URL(request.url).searchParams);
        query = parseWith(options.query, search, "query");
      }

      const params = flattenParams(await route?.params);
      const result = await handler({ ...auth, body, query, params, request });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error.message, error.status, error.details);
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return jsonError("Something went wrong.", 500);
    }
  };
}
