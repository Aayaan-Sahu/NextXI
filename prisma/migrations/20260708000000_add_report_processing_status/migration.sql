-- The AI report worker claims queued reports by flipping them from
-- 'pending' to 'processing' (see docs/reports-contract.md).
ALTER TYPE "public"."report_status" ADD VALUE 'processing' AFTER 'pending';
