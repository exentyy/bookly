import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "../../lib/supabase/server";
import { signOut, updateProfile } from "../auth/actions";

export const instant = false;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string | string[]; updated?: string | string[]; error?: string | string[] }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/sign-in");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const params = await searchParams;
  const param = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const name = profile?.display_name || user.user_metadata.full_name || "";
  return <main className="auth-shell">
    <Link className="auth-back" href="/"><ArrowLeft size={16}/> BOOKLY</Link>
    <section className="auth-card account-card glass-surface">
      <div className="auth-mark"><Sparkles size={19}/></div><span className="auth-kicker">ВАШ АККАУНТ BOOKLY</span>
      <h1>Профиль</h1><p className="auth-copy">Данные вашего аккаунта.</p>
      {param(params.saved) && <p className="auth-success" role="status">Имя сохранено.</p>}
      {param(params.updated) && <p className="auth-success" role="status">Пароль обновлён.</p>}
      {param(params.error) && <p className="auth-error" role="alert">{param(params.error) === "name" ? "Имя должно содержать от 2 до 120 символов." : param(params.error) === "signout" ? "Не удалось завершить сеанс. Попробуйте ещё раз." : "Не удалось сохранить изменения. Попробуйте ещё раз."}</p>}
      {profileError && <p className="auth-error" role="alert">Не удалось загрузить профиль. Обновите страницу.</p>}
      <form action={updateProfile} className="auth-form">
        <label>Имя<input name="name" defaultValue={name} required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>Email<input value={user.email || ""} readOnly aria-readonly="true" /></label>
        <button className="auth-submit" type="submit">Сохранить имя</button>
      </form>
      <Link className="glass-secondary bookings-back" href="/account/bookings">Мои записи</Link>
      <Link className="glass-secondary bookings-back" href="/owner">Кабинет салона · демо</Link>
      <form action={signOut} className="signout-form"><button className="glass-secondary" type="submit">Выйти из аккаунта</button></form>
    </section>
  </main>;
}
