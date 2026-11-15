"use client";

import Link from "next/link";

export default function OwnerError({ reset }: { error: Error; reset: () => void }) {
  return <main className="owner-shell owner-error" role="alert"><div className="owner-panel"><h1>Не удалось открыть кабинет</h1><p>Попробуйте загрузить страницу ещё раз. Если ошибка повторится, вернитесь к BOOKLY.</p><div className="owner-error-actions"><button className="glass-cta" onClick={reset}>Повторить</button><Link className="glass-secondary" href="/">На главную</Link></div></div></main>;
}
