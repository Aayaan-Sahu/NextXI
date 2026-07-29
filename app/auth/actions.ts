"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerStatus, Visibility } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { generateGuardianCode, normalizeGuardianCode } from "@/lib/guardian-code";
import { notifyTeam } from "@/lib/notify";
import { isCountry, parsePlayerRoles } from "@/lib/players";
import { POLICY_VERSION } from "@/lib/policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function authError(mode: "sign-in" | "sign-up", message: string): never {
  redirect(`/auth?mode=${mode}&error=${encodeURIComponent(message)}`);
}

function signupMessage(error: { code?: string; message: string }) {
  return error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    /already registered/i.test(error.message)
    ? "That account already exists. Sign in or reset your password."
    : error.message;
}

function resetError(message: string): never {
  redirect(`/auth/reset-password?error=${encodeURIComponent(message)}`);
}

function normalizeUsername(formData: FormData) {
  return text(formData, "username").toLowerCase();
}

const INVALID_NUMBER = Symbol("invalid-number");

function optionalInt(formData: FormData, name: string, min: number, max: number) {
  const raw = text(formData, name);
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return INVALID_NUMBER;

  return value;
}

function onboardingError(role: string, message: string): never {
  const roleQuery =
    role === "player" || role === "coach" || role === "guardian" ? `role=${role}&` : "";
  redirect(`/onboarding?${roleQuery}error=${encodeURIComponent(message)}`);
}

function isUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// DOB is stored as UTC midnight, so compare against UTC "today" to avoid
// timezone off-by-one on birthdays.
function ageInYears(dob: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  const monthDay = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  return now.getUTCFullYear() - y - (monthDay < m * 100 + d ? 1 : 0);
}

async function origin() {
  return (
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

async function afterSignIn(userId: string): Promise<never> {
  const status = await getOnboardingStatus(userId);
  redirect(status.role ? "/dashboard" : "/onboarding");
}

export async function signUp(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!email || password.length < 6) {
    authError("sign-up", "Enter an email and a password with at least 6 characters.");
  }

  if (!formData.get("consent")) {
    authError("sign-up", "Agree to the Terms of Use and Privacy Policy to create an account.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) authError("sign-up", signupMessage(error));

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!email || !password) authError("sign-in", "Enter your email and password.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) authError("sign-in", error.message);
  if (!data.user) authError("sign-in", "Sign in failed.");

  if (isAdmin(data.user)) redirect("/dashboard/admin");

  await afterSignIn(data.user.id);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resendVerification(formData: FormData) {
  const email = text(formData, "email").toLowerCase();

  if (!email) {
    redirect("/auth/check-email?error=Enter%20the%20email%20address%20you%20used.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    email,
    type: "signup",
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/onboarding`,
    },
  });

  const query = error
    ? `error=${encodeURIComponent(error.message)}`
    : `email=${encodeURIComponent(email)}&message=Verification%20email%20sent.`;

  redirect(`/auth/check-email?${query}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = text(formData, "email").toLowerCase();

  if (!email) resetError("Enter your email address.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?type=recovery&next=/auth/reset-password`,
  });

  if (error) resetError(error.message);

  redirect("/auth/reset-password?message=Password%20reset%20email%20sent.");
}

export async function updatePassword(formData: FormData) {
  const password = text(formData, "password");

  if (password.length < 6) resetError("Use at least 6 characters.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) resetError(error.message);

  redirect("/dashboard");
}

export async function completeOnboarding(formData: FormData) {
  const user = await requireUser();
  const existing = await getOnboardingStatus(user.id);

  if (existing.role) redirect("/dashboard");

  const role = text(formData, "role");
  const username = normalizeUsername(formData);

  if (!usernamePattern.test(username)) {
    onboardingError(role, "Use 3-30 letters, numbers, or underscores for username.");
  }

  if (role === "player") {
    const name = text(formData, "name");
    const dateOfBirth = text(formData, "dateOfBirth");
    const club = text(formData, "club");
    const roles = parsePlayerRoles(formData);
    const country = text(formData, "country");
    const parsedDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
    const heightCm = optionalInt(formData, "heightCm", 1, 300);
    const weightKg = optionalInt(formData, "weightKg", 1, 500);

    if (!name || !club || Number.isNaN(parsedDate.getTime())) {
      onboardingError(role, "Complete all player fields.");
    }

    // Sanity floor: a date of birth outside 8-100 years is a typo, not a player.
    const age = ageInYears(dateOfBirth);
    if (age < 8 || age > 100) {
      onboardingError(
        role,
        "Check the date of birth — players must be between 8 and 100 years old.",
      );
    }

    if (!isCountry(country)) {
      onboardingError(role, "Select a valid country.");
    }

    if (heightCm === null || heightCm === INVALID_NUMBER) {
      onboardingError(role, "Enter a valid height.");
    }
    if (weightKg === INVALID_NUMBER) {
      onboardingError(role, "Enter a valid weight, or leave it blank.");
    }

    const minor = age < 18;
    let failure: string | null = null;

    try {
      await prisma.$transaction([
        prisma.profile.create({
          data: {
            consentedAt: new Date(),
            consentPolicyVersion: POLICY_VERSION,
            id: user.id,
            username,
          },
        }),
        prisma.player.create({
          data: {
            club,
            country,
            dateOfBirth: parsedDate,
            guardianCode: minor ? generateGuardianCode() : null,
            heightCm,
            id: user.id,
            name,
            roles,
            status: minor ? PlayerStatus.PENDING_GUARDIAN : PlayerStatus.ACTIVE,
            visibility: Visibility.PRIVATE,
            weightKg,
          },
        }),
      ]);
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      failure = String(error.meta?.target ?? "").includes("guardian_code")
        ? "Something went wrong. Please try again."
        : "Username is taken.";
    }

    if (failure) onboardingError(role, failure);

    // Non-fatal by design: notifyTeam swallows its own errors.
    await notifyTeam(`New player onboarded: ${name} (@${username})`);

    redirect("/dashboard");
  }

  if (role === "coach") {
    const name = text(formData, "name");
    const accomplishments = text(formData, "accomplishments")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name) onboardingError(role, "Enter your name.");

    let usernameTaken = false;

    try {
      await prisma.$transaction([
        prisma.profile.create({
          data: {
            consentedAt: new Date(),
            consentPolicyVersion: POLICY_VERSION,
            id: user.id,
            username,
          },
        }),
        prisma.coach.create({
          data: {
            accomplishments,
            id: user.id,
            name,
          },
        }),
      ]);
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      usernameTaken = true;
    }

    if (usernameTaken) onboardingError(role, "Username is taken.");

    await notifyTeam(
      `New coach signed up: ${name} (@${username}) — awaiting approval at /dashboard/admin`,
    );

    redirect("/dashboard");
  }

  if (role === "guardian") {
    const name = text(formData, "name");
    const code = normalizeGuardianCode(text(formData, "childCode"));

    if (!name) onboardingError(role, "Enter your name.");
    if (!code) onboardingError(role, "Enter the code shown on your child's dashboard.");
    if (!formData.get("guardianConsent")) {
      onboardingError(
        role,
        "Confirm you are this player's parent or legal guardian and consent to their use of NextXI.",
      );
    }

    const pendingChild = await prisma.player.findFirst({
      where: { guardianCode: code, status: PlayerStatus.PENDING_GUARDIAN },
      select: { id: true },
    });

    if (!pendingChild) {
      onboardingError(role, "That code doesn't match a pending player account.");
    }

    const codeClaimed = "guardian-code-claimed";
    let failure: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            consentedAt: new Date(),
            consentPolicyVersion: POLICY_VERSION,
            id: user.id,
            username,
          },
        });
        await tx.guardian.create({ data: { id: user.id, name } });
        // The guarded updateMany is the atomic claim: if another guardian
        // linked this code first, count is 0 and the transaction rolls back.
        const linked = await tx.player.updateMany({
          where: { guardianCode: code, status: PlayerStatus.PENDING_GUARDIAN },
          data: { status: PlayerStatus.ACTIVE, guardianId: user.id, guardianCode: null },
        });

        if (linked.count === 0) throw new Error(codeClaimed);
      });
    } catch (error) {
      if (isUniqueError(error)) {
        failure = "Username is taken.";
      } else if (error instanceof Error && error.message === codeClaimed) {
        failure = "That code doesn't match a pending player account.";
      } else {
        throw error;
      }
    }

    if (failure) onboardingError(role, failure);

    await notifyTeam(`New guardian onboarded: ${name} (@${username})`);

    redirect("/dashboard");
  }

  onboardingError(role, "Choose player, coach, or guardian.");
}
