import { AuthForm } from "../AuthForm";

export const instant = false;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  return <AuthForm mode="forgot" error={Array.isArray(params.error) ? params.error[0] : params.error} />;
}
