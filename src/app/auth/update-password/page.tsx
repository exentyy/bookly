import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { createClient } from "../../../lib/supabase/server";

export const instant = false;

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/forgot-password");
  const params = await searchParams;
  return <AuthForm mode="update-password" error={Array.isArray(params.error) ? params.error[0] : params.error} />;
}
