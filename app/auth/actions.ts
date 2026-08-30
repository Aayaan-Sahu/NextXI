"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ClubStatus, CoachStatus, PlayerStatus, Visibility } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { generateGuardianCode, normalizeGuardianCode } from "@/lib/guardian-code";
import { notifyTeam } from "@/lib/notify";
import { clubNameMatches, isValidClubName, MAX_CLUB_BIO_LENGTH } from "@/lib/clubs";
import { CONTACT_EMAIL } from "@/lib/contact";
import { ageInYears, isCountry, parsePlayerRoles } from "@/lib/players";
import { POLICY_VERSION } from "@/lib/policy";
import { authEmailOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USERNAME_PATTERN } from "@/lib/usernames";
import { usernameStatus } from "@/lib/usernames.server";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function secret(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
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

async function afterSignIn(userId: string): Promise<never> {
  const status = await getOnboardingStatus(userId);
  redirect(status.role ? "/dashboard" : "/onboarding");
}

function signInMessage(error: { code?: string; message: string }) {
  if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
    return "Click the verification link we emailed you — then sign in with your password.";
  }
  return error.message;
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase();
  const username = normalizeUsername(formData);
  const password = secret(formData, "password");
  const confirm = secret(formData, "confirmPassword");

  if (!formData.get("consent")) {
    return { error: "Agree to the Terms of Use and Privacy Policy to create an account." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Use 3-30 letters, numbers, or underscores for username." };
  }
  if (!email) return { error: "Enter your email address." };
  if (password.length < 6) return { error: "Use at least 6 characters for your password." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const taken = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (taken) return { error: "That username is taken." };

  const supabase = await createSupabaseServerClient();
  const origin = await authEmailOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) return { error: signupMessage(error) };
  if (!data.user) return { error: "Could not create the account." };
  if (data.user.identities && data.user.identities.length === 0) {
    return { error: "That account already exists. Sign in or reset your password." };
  }

  try {
    await prisma.profile.create({
      data: {
        consentedAt: new Date(),
        consentPolicyVersion: POLICY_VERSION,
        id: data.user.id,
        username,
      },
    });
  } catch (createError) {
    if (!isUniqueError(createError)) throw createError;
    // Auth user exists; they can pick another handle on onboarding.
  }

  // Confirm-email withholds the session until they click the mail. Do not
  // confirm them from here — that would let anyone register as any address.
  if (!data.session) {
    redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
  }

  return afterSignIn(data.user.id);
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase();
  const password = secret(formData, "password");

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

export async function resendVerification(
  _prev: CheckEmailState,
  formData: FormData,
): Promise<CheckEmailState> {
  const email = text(formData, "email").toLowerCase();

  if (!email) return { error: "Enter the email address you used." };

  const supabase = await createSupabaseServerClient();
  const origin = await authEmailOrigin();
  const { error } = await supabase.auth.resend({
    email,
    type: "signup",
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) return { error: error.message };

  return { message: "Verification email sent. Click the link to open your account." };
}

export async function checkUsername(username: string) {
  return (await usernameStatus(username)).status;
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
  const reserved = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  const username = reserved?.username ?? normalizeUsername(formData);

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

    const hasProfile = Boolean(reserved);
    const minor = age < 18;
    let failure: string | null = null;

    try {
      await prisma.$transaction([
        ...(hasProfile
          ? []
          : [
              prisma.profile.create({
                data: {
                  consentedAt: new Date(),
                  consentPolicyVersion: POLICY_VERSION,
                  id: user.id,
                  username,
                },
              }),
            ]),
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
            // Every player opens ACTIVE for now. The guardian code is still
            // minted for under-18s so a parent can link the account, but it no
            // longer holds the account shut. Put PENDING_GUARDIAN back here to
            // restore the consent gate — the gated views it drives are intact.
            status: PlayerStatus.ACTIVE,
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
        ...(reserved
          ? []
          : [
              prisma.profile.create({
                data: {
                  consentedAt: new Date(),
                  consentPolicyVersion: POLICY_VERSION,
                  id: user.id,
                  username,
                },
              }),
            ]),
        // Auto-approved for now so nobody waits on an unmanned queue. Drop
        // this line to send coaches back through /dashboard/admin.
        prisma.coach.create({
          data: {
            accomplishments,
            id: user.id,
            name,
            status: CoachStatus.APPROVED,
          },
        }),
      ]);
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      usernameTaken = true;
    }

    if (usernameTaken) return onboardingError("Username is taken.");

    await notifyTeam(`New coach signed up: ${name} (@${username}) — approved automatically`);

    redirect("/dashboard");
  }

  if (role === "club") {
    const name = text(formData, "name");
    const country = text(formData, "country");
    const bio = text(formData, "bio");

    if (!isValidClubName(name)) {
      return onboardingError("Enter the club's name, between 2 and 120 characters.");
    }
    if (!isCountry(country)) {
      return onboardingError("Select a valid country.");
    }
    if (bio.length > MAX_CLUB_BIO_LENGTH) {
      return onboardingError("Keep the club description under 500 characters.");
    }

    // Approving on sign-up puts this straight onto the partial unique index
    // over approved club names (20260829070000_unique_approved_club_names).
    // Check it here so a name clash reads as a name clash, not as the P2002
    // below reporting a taken username.
    const approvedClubs = await prisma.club.findMany({
      where: { status: ClubStatus.APPROVED },
      select: { name: true },
    });
    if (approvedClubs.some((club) => clubNameMatches(club.name, name))) {
      return onboardingError(
        `A club called "${name}" is already on NextXI. Ask them to add you as a coach, or email ${CONTACT_EMAIL} if this is your club.`,
      );
    }

    let failure: string | null = null;

    try {
      await prisma.$transaction([
        ...(reserved
          ? []
          : [
              prisma.profile.create({
                data: {
                  consentedAt: new Date(),
                  consentPolicyVersion: POLICY_VERSION,
                  id: user.id,
                  username,
                },
              }),
            ]),
        // Auto-approved for now, alongside coaches. Drop `status` to go back
        // to an admin verifying the name a club is claiming before it reaches
        // any player.
        prisma.club.create({
          data: { bio: bio || null, country, id: user.id, name, status: ClubStatus.APPROVED },
        }),
      ]);
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      // The check above lost a race with another club claiming the same name.
      failure = String(error.meta?.target ?? "").includes("normalized_name")
        ? `A club called "${name}" was just registered by someone else. Email ${CONTACT_EMAIL} if this is your club.`
        : "Username is taken.";
    }

    if (failure) return onboardingError(failure);

    await notifyTeam(`New club signed up: ${name} (@${username}) — approved automatically`);

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

    // The code is the claim, not the account's status: players now open
    // ACTIVE, so an unclaimed code is one no guardian holds yet.
    const unclaimedChild = await prisma.player.findFirst({
      where: { guardianCode: code, guardianId: null },
      select: { id: true },
    });

    if (!unclaimedChild) {
      return onboardingError("That code doesn't match a player account.");
    }

    const codeClaimed = "guardian-code-claimed";
    let failure: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        if (!reserved) {
          await tx.profile.create({
            data: {
              consentedAt: new Date(),
              consentPolicyVersion: POLICY_VERSION,
              id: user.id,
              username,
            },
          });
        }
        await tx.guardian.create({ data: { id: user.id, name } });
        // The guarded updateMany is the atomic claim: if another guardian
        // linked this code first, count is 0 and the transaction rolls back.
        const linked = await tx.player.updateMany({
          where: { guardianCode: code, guardianId: null },
          data: { guardianId: user.id, guardianCode: null },
        });

        if (linked.count === 0) throw new Error(codeClaimed);
      });
    } catch (error) {
      if (isUniqueError(error)) {
        failure = "Username is taken.";
      } else if (error instanceof Error && error.message === codeClaimed) {
        failure = "That code doesn't match a player account.";
      } else {
        throw error;
      }
    }

    if (failure) return onboardingError(failure);

    await notifyTeam(`New guardian onboarded: ${name} (@${username})`);

    redirect("/dashboard");
  }

  return onboardingError("Choose player, coach, guardian, or club.");
}
