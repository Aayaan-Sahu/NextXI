-- Consent capture: when the account holder agreed to the terms/privacy
-- policies at onboarding, and which policy version they agreed to.
alter table "public"."profiles"
  add column "consented_at" timestamptz,
  add column "consent_policy_version" text;
