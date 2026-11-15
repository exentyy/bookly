import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

type Mode = "sign-in" | "sign-up" | "forgot" | "update-password";

const errors: Record<string, string> = {
  invalid: "Проверьте введённые данные. Пароль должен содержать не менее 8 символов.",
  credentials: "Не удалось войти. Проверьте email и пароль.",
  signup: "Не удалось создать аккаунт. Возможно, этот email уже зарегистрирован.",
  send: "Не удалось отправить письмо. Попробуйте ещё раз позже.",
  update: "Не удалось обновить пароль. Запросите новое письмо для восстановления.",
};

const content: Record<Mode, { title: string; copy: string; action: string }> = {
  "sign-in": { title: "С возвращением", copy: "Войдите, чтобы продолжить заботиться о себе.", action: "Войти" },
  "sign-up": { title: "Создайте аккаунт", copy: "Ваше время для себя начинается здесь.", action: "Зарегистрироваться" },
  forgot: { title: "Восстановление пароля", copy: "Отправим ссылку для создания нового пароля.", action: "Отправить ссылку" },
  "update-password": { title: "Новый пароль", copy: "Задайте новый пароль для аккаунта BOOKLY.", action: "Сохранить пароль" },
};

export function AuthForm({ mode, error, next }: { mode: Mode; error?: string; next?: string }) {
  const current = content[mode];
  const action = mode === "sign-in" ? signIn : mode === "sign-up" ? signUp : mode === "forgot" ? requestPasswordReset : updatePassword;
  return <main className="auth-shell">
    <Link className="auth-back" href="/"><ArrowLeft size={16}/> На главную</Link>
    <section className="auth-card glass-surface">
      <div className="auth-mark"><Sparkles size={19}/></div>
      <span className="auth-kicker">BOOKLY · ВРЕМЯ ДЛЯ СЕБЯ</span>
      <h1>{current.title}</h1><p className="auth-copy">{current.copy}</p>
      {error && errors[error] && <p className="auth-error" role="alert">{errors[error]}</p>}
      <form action={action} className="auth-form">
        {next && <input type="hidden" name="next" value={next}/>}
        {mode === "sign-up" && <label>Ваше имя<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>}
        {mode !== "update-password" && <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
        {mode !== "forgot" && <label>{mode === "update-password" ? "Новый пароль" : "Пароль"}<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} maxLength={72} /></label>}
        <button className="auth-submit" type="submit">{current.action}</button>
      </form>
      <nav className="auth-links" aria-label="Действия аккаунта">
        {mode === "sign-in" && <><Link href="/auth/forgot-password">Забыли пароль?</Link><span>Нет аккаунта? <Link href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}>Зарегистрироваться</Link></span></>}
        {mode === "sign-up" && <span>Уже есть аккаунт? <Link href={next ? `/auth/sign-in?next=${encodeURIComponent(next)}` : "/auth/sign-in"}>Войти</Link></span>}
        {mode === "forgot" && <span>Вспомнили пароль? <Link href="/auth/sign-in">Войти</Link></span>}
        {mode === "update-password" && <span><Link href="/auth/forgot-password">Запросить новую ссылку</Link></span>}
      </nav>
    </section>
  </main>;
}
