import Link from "next/link";

export const instant = false;

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ reset?: string | string[] }> }) {
  const params = await searchParams;
  const isReset = Array.isArray(params.reset) ? params.reset[0] === "1" : params.reset === "1";
  return <main className="auth-shell"><Link className="auth-back" href="/">BOOKLY</Link><section className="auth-card glass-surface">
    <div className="auth-mark">✉</div><span className="auth-kicker">BOOKLY · ПРОВЕРЬТЕ ПОЧТУ</span>
    <h1>Письмо отправлено</h1><p className="auth-copy">{isReset ? "Если адрес зарегистрирован, на него придёт ссылка для восстановления пароля." : "Подтвердите email по ссылке в письме, чтобы завершить регистрацию."}</p>
    <Link className="auth-submit auth-button-link" href="/auth/sign-in">Вернуться ко входу</Link>
  </section></main>;
}
