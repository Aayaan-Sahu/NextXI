"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Visibility } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getOnboardingStatus, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  await afterSignIn(data.user.id);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
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

  if (role === "player") {
    const name = text(formData, "name");
    const dateOfBirth = text(formData, "dateOfBirth");
    const club = text(formData, "club");
    const country = text(formData, "country");
    const parsedDate = new Date(`${dateOfBirth}T00:00:00.000Z`);

    if (!name || !club || !country || Number.isNaN(parsedDate.getTime())) {
      redirect("/onboarding?error=Complete%20all%20player%20fields.");
    }

    await prisma.player.create({
      data: {
        club,
        country,
        dateOfBirth: parsedDate,
        id: user.id,
        name,
        visibility: Visibility.PRIVATE,
      },
    });

    redirect("/dashboard");
  }

  if (role === "coach") {
    const name = text(formData, "name");
    const accomplishments = text(formData, "accomplishments")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name) redirect("/onboarding?error=Enter%20your%20name.");

    await prisma.coach.create({
      data: {
        accomplishments,
        id: user.id,
        name,
      },
    });

    redirect("/dashboard");
  }

  redirect("/onboarding?error=Choose%20player%20or%20coach.");
}
