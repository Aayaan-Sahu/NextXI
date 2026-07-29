import { Prisma } from "@/app/generated/prisma/client";
import { ReportStatus } from "@/app/generated/prisma/enums";
import { requireIngestAuth } from "@/app/api/reports/utils";
import { isUuid, jsonError } from "@/app/api/videos/utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Service-to-service ingress for the AI coaching pipeline.
 * See docs/reports-contract.md for the integration contract.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const unauthorized = requireIngestAuth(request);
  if (unauthorized) return unauthorized;

  const { videoId } = await params;
  if (!isUuid(videoId)) return jsonError("videoId must be a UUID.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!isPlainObject(body)) return jsonError("Request body must be a JSON object.", 400);

  const { schema_version, status, payload, error, model_version } = body;

  if (!Number.isInteger(schema_version)) {
    return jsonError("schema_version must be an integer.", 400);
  }
  if (status !== "ready" && status !== "failed") {
    return jsonError('status must be "ready" or "failed".', 400);
  }
  if (status === "ready" && !isPlainObject(payload)) {
    return jsonError("payload object is required when status is ready.", 400);
  }
  if (status === "failed" && (typeof error !== "string" || !error.trim())) {
    return jsonError("error is required when status is failed.", 400);
  }
  if (model_version !== undefined && typeof model_version !== "string") {
    return jsonError("model_version must be a string.", 400);
  }

  const video = await prisma.playerVideo.findUnique({
    where: { id: videoId },
    select: { id: true },
  });
  if (!video) return jsonError("Video not found.", 404);

  const isReady = status === "ready";
  const data = {
    status: isReady ? ReportStatus.READY : ReportStatus.FAILED,
    schemaVersion: schema_version as number,
    // Setting these on every write keeps repeated/retried PUTs fully idempotent.
    payload: isReady ? (payload as Prisma.InputJsonValue) : Prisma.DbNull,
    error: isReady ? null : (error as string),
    modelVersion: (model_version as string | undefined) ?? null,
  };

  const report = await prisma.report.upsert({
    where: { videoId },
    update: data,
    create: { videoId, ...data },
    select: {
      status: true,
      schemaVersion: true,
      modelVersion: true,
      updatedAt: true,
    },
  });

  return Response.json({
    ok: true,
    report: {
      videoId,
      status: report.status,
      schemaVersion: report.schemaVersion,
      modelVersion: report.modelVersion,
      updatedAt: report.updatedAt.toISOString(),
    },
  });
}
