import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/account";
  const destination = new URL(requestedNext, url.origin);
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") && destination.origin === url.origin
    ? destination.pathname + destination.search + destination.hash
    : "/account";
  if (!code) return NextResponse.redirect(new URL("/auth/sign-in?error=credentials", url.origin));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/sign-in?error=credentials", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
