import { AuthForm } from "../AuthForm";

export const instant = false;

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; next?: string | string[] }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-in" error={Array.isArray(params.error) ? params.error[0] : params.error} next={Array.isArray(params.next) ? params.next[0] : params.next} />;
}
