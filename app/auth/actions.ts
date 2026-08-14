"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PlayerStatus, Visibility } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { generateGuardianCode, normalizeGuardianCode } from "@/lib/guardian-code";
import { notifyTeam } from "@/lib/notify";
import { isCountry, parsePlayerRoles } from "@/lib/players";
import { POLICY_VERSION } from "@/lib/policy";
import { authEmailOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USERNAME_PATTERN } from "@/lib/usernames";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export type AuthFormState = { error?: string };

export type CheckEmailState = { error?: string; message?: string };

export type OnboardingState = { error?: string };

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
  if (!Number.isFinite(value)) return INVALID_NUMBER;

  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return INVALID_NUMBER;

  return rounded;
}

function onboardingError(message: string): OnboardingState {
  return { error: message };
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

async function afterSignIn(userId: string): Promise<never> {
  const status = await getOnboardingStatus(userId);
  redirect(status.role ? "/dashboard" : "/onboarding");
}

function signInMessage(error: { code?: string; message: string }) {
  if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
    return "Confirm your email first — enter the code from the NextXI email, or tap the confirm link.";
  }
  return error.message;
}

export async function requestEmailCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase();
  const intent = text(formData, "intent") === "sign-up" ? "sign-up" : "sign-in";

  if (!email) return { error: "Enter your email address." };

  if (intent === "sign-up" && !formData.get("consent")) {
    return { error: "Agree to the Terms of Use and Privacy Policy to create an account." };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await authEmailOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      shouldCreateUser: intent === "sign-up",
    },
  });

  if (error) return { error: signupMessage(error) };

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: signInMessage(error) };
  if (!data.user) return { error: "Sign in failed." };

  if (isAdmin(data.user)) redirect("/dashboard/admin");

  return afterSignIn(data.user.id);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function verifySignupOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase();
  const token = text(formData, "token").replace(/\s/g, "");

  if (!email) return { error: "Enter the email address you used." };
  if (token.length < 6) return { error: "Enter the 6-digit code from the email." };

  const supabase = await createSupabaseServerClient();
  let result = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (result.error) {
    result = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  }
  if (result.error) {
    result = await supabase.auth.verifyOtp({ email, token, type: "magiclink" });
  }

  if (result.error) return { error: result.error.message };

  const user = result.data.user;
  if (user && isAdmin(user)) redirect("/dashboard/admin");
  if (user) return afterSignIn(user.id);

  redirect("/onboarding");
}

export async function resendVerification(
  _prev: CheckEmailState,
  formData: FormData,
): Promise<CheckEmailState> {
  const email = text(formData, "email").toLowerCase();

  if (!email) return { error: "Enter the email address you used." };

  const supabase = await createSupabaseServerClient();
  const origin = await authEmailOrigin();
  const otp = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      shouldCreateUser: false,
    },
  });

  if (otp.error) {
    const signup = await supabase.auth.resend({
      email,
      type: "signup",
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      },
    });
    if (signup.error) return { error: signup.error.message };
  }

  return { message: "Code sent. Check your inbox." };
}

export async function checkUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) return "invalid" as const;

  const existing = await prisma.profile.findUnique({
    where: { username: normalized },
    select: { id: true },
  });

  return existing ? ("taken" as const) : ("free" as const);
}

export async function requestPasswordReset(formData: FormData) {
  const email = text(formData, "email").toLowerCase();

  if (!email) resetError("Enter your email address.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await authEmailOrigin()}/auth/confirm?type=recovery&next=/auth/reset-password`,
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

export async function setAccountPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = text(formData, "password");

  if (password.length < 6) return { error: "Use at least 6 characters." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/profile");
  redirect(`/dashboard/profile?message=${encodeURIComponent("Password saved.")}`);
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const existing = await getOnboardingStatus(user.id);

  if (existing.role) redirect("/dashboard");

  const role = text(formData, "role");
  const username = normalizeUsername(formData);

  if (!USERNAME_PATTERN.test(username)) {
    return onboardingError("Use 3-30 letters, numbers, or underscores for username.");
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
      return onboardingError("Complete all player fields.");
    }

    // Sanity floor: a date of birth outside 8-100 years is a typo, not a player.
    const age = ageInYears(dateOfBirth);
    if (age < 8 || age > 100) {
      return onboardingError(
        "Check the date of birth — players must be between 8 and 100 years old.",
      );
    }

    if (!isCountry(country)) {
      return onboardingError("Select a valid country.");
    }

    if (heightCm === null || heightCm === INVALID_NUMBER) {
      return onboardingError("Enter a valid height in centimetres, for example 175.");
    }
    if (weightKg === INVALID_NUMBER) {
      return onboardingError("Enter a valid weight, or leave it blank.");
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

    if (failure) return onboardingError(failure);

    await notifyTeam(`New player onboarded: ${name} (@${username})`);

    redirect("/dashboard");
  }

  if (role === "coach") {
    const name = text(formData, "name");
    const accomplishments = text(formData, "accomplishments")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name) return onboardingError("Enter your name.");

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

    if (usernameTaken) return onboardingError("Username is taken.");

    await notifyTeam(
      `New coach signed up: ${name} (@${username}) — awaiting approval at /dashboard/admin`,
    );

    redirect("/dashboard");
  }

  if (role === "guardian") {
    const name = text(formData, "name");
    const code = normalizeGuardianCode(text(formData, "childCode"));

    if (!name) return onboardingError("Enter your name.");
    if (!code) return onboardingError("Enter the code shown on your child's dashboard.");
    if (!formData.get("guardianConsent")) {
      return onboardingError(
        "Confirm you are this player's parent or legal guardian and consent to their use of NextXI.",
      );
    }

    const pendingChild = await prisma.player.findFirst({
      where: { guardianCode: code, status: PlayerStatus.PENDING_GUARDIAN },
      select: { id: true },
    });

    if (!pendingChild) {
      return onboardingError("That code doesn't match a pending player account.");
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

    if (failure) return onboardingError(failure);

    await notifyTeam(`New guardian onboarded: ${name} (@${username})`);

    redirect("/dashboard");
  }

  return onboardingError("Choose player, coach, or guardian.");
}
