-- Waitlist signups from the public landing page. No auth user attached —
-- just an email captured pre-launch, deduplicated case-insensitively at the
-- application layer (emails are normalized to lowercase before insert).

CREATE TABLE "public"."waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "public"."waitlist_entries"("email");
