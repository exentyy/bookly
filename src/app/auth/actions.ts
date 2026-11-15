"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function authErrorPath(path: string, code: string, next?: string): never {
  const query = new URLSearchParams({ error: code });
  if (next) query.set("next", next);
  redirect(`${path}?${query}`);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const deployment = process.env.VERCEL_URL?.trim();
  const local = !configured || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configured);
  if (process.env.VERCEL && local && deployment) return `https://${deployment}`;
  if (process.env.VERCEL && local) throw new Error("Set NEXT_PUBLIC_SITE_URL for the deployed BOOKLY site.");
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}

function safeNext(value: FormDataEntryValue | null) {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/account";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!validEmail(email) || !password) authErrorPath("/auth/sign-in", "invalid", safeNext(formData.get("next")));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authErrorPath("/auth/sign-in", "credentials", safeNext(formData.get("next")));
  redirect(safeNext(formData.get("next")));
}

export async function signUp(formData: FormData) {
  const displayName = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (displayName.length < 2 || displayName.length > 120 || !validEmail(email) || password.length < 8) {
    authErrorPath("/auth/sign-up", "invalid", safeNext(formData.get("next")));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}`,
    },
  });
  if (error) {
    // Codes and status are safe to log; never log submitted fields or auth responses.
    console.error("BOOKLY sign-up failed", { code: error.code ?? "unknown", status: error.status });
    authErrorPath("/auth/sign-up", "signup", safeNext(formData.get("next")));
  }
  if (data.session) redirect(safeNext(formData.get("next")));
  redirect("/auth/check-email");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!validEmail(email)) authErrorPath("/auth/forgot-password", "invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/update-password`,
  });
  if (error) authErrorPath("/auth/forgot-password", "send");
  redirect("/auth/check-email?reset=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) authErrorPath("/auth/update-password", "invalid");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/sign-in");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) authErrorPath("/auth/update-password", "update");
  redirect("/account?updated=1");
}

export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get("name") || "").trim();
  if (displayName.length < 2 || displayName.length > 120) redirect("/account?error=name");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/sign-in");
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id).select("id").single();
  if (error) redirect("/account?error=save");
  redirect("/account?saved=1");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect("/account?error=signout");
  redirect("/");
}
