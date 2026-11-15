import { AuthForm } from "../AuthForm";

export const instant = false;

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; next?: string | string[] }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-up" error={Array.isArray(params.error) ? params.error[0] : params.error} next={Array.isArray(params.next) ? params.next[0] : params.next} />;
}
