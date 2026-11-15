import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LayoutDashboard, Plus, Scissors, Settings2, Store, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const demoSalonId = "demo-salon";
export const demoSalon = { name: "Ателье красоты", city: "Тюмень", description: "Пример салона для предварительного просмотра кабинета." };

const sections: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "Обзор", path: "", icon: LayoutDashboard },
  { label: "Записи", path: "/bookings", icon: CalendarDays },
  { label: "Услуги", path: "/services", icon: Scissors },
  { label: "Специалисты", path: "/specialists", icon: UsersRound },
  { label: "Расписание", path: "/schedule", icon: Clock3 },
  { label: "Настройки", path: "/settings", icon: Settings2 },
];

export function OwnerShell({ children, section = "", salonId }: { children: ReactNode; section?: string; salonId?: string }) {
  const base = salonId ? `/owner/${salonId}` : "/owner";
  return <main className="owner-shell">
    <header className="owner-topbar glass-surface">
      <Link className="owner-brand" href="/"><span className="brand-mark"><span /></span>BOOKLY<span className="brand-dot">.</span></Link>
      <span className="owner-top-caption">Для салонов</span>
      <Link className="owner-top-link" href="/account">Мой профиль <ArrowRight size={15} /></Link>
    </header>
    <div className="owner-layout">
      <aside className="owner-sidebar glass-surface">
        <Link className="owner-return" href="/owner"><ArrowLeft size={16} /> Все салоны</Link>
        <div className="owner-side-heading"><Store size={18} /><span>{salonId === demoSalonId ? demoSalon.name : salonId ? "Салон" : "Кабинет владельца"}</span></div>
        {salonId && <nav className="owner-nav" aria-label="Разделы салона">{sections.map(({ label, path, icon: Icon }) => <Link key={path} href={`${base}${path}`} className={`owner-nav-link ${section === path ? "is-current" : ""}`} aria-current={section === path ? "page" : undefined}><Icon size={18} />{label}</Link>)}</nav>}
        {!salonId && <p className="owner-side-note">Здесь будут ваши салоны и инструменты управления.</p>}
        <div className="owner-side-bottom">BOOKLY <span>·</span> пространство для вашего дела</div>
      </aside>
      <div className="owner-content">
        {salonId && <nav className="owner-mobile-nav glass-surface" aria-label="Разделы салона">{sections.map(({ label, path, icon: Icon }) => <Link key={path} href={`${base}${path}`} className={section === path ? "is-current" : ""} aria-current={section === path ? "page" : undefined}><Icon size={17} />{label}</Link>)}</nav>}
        {children}
      </div>
    </div>
  </main>;
}

export function OwnerHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="owner-heading"><div><span className="owner-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function DemoNotice() {
  return <div className="owner-demo-notice" role="status"><span>Демо</span> Это предварительный просмотр. Сведения ниже не связаны с реальными салонами или заявками.</div>;
}

export function OwnerPanel({ title, description, children, icon: Icon }: { title: string; description?: string; children?: ReactNode; icon: LucideIcon }) {
  return <section className="owner-panel"><div className="owner-panel-heading"><span className="owner-panel-icon"><Icon size={19} /></span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</section>;
}

export function DisabledAction({ children, icon: Icon = Plus }: { children: ReactNode; icon?: LucideIcon }) {
  return <button className="glass-secondary owner-disabled" type="button" disabled title="Станет доступно после подключения кабинета"><Icon size={15} />{children}</button>;
}

export function OwnerEmpty({ title, description }: { title: string; description: string }) {
  return <div className="owner-empty"><div className="owner-empty-mark"><Store size={22} /></div><h3>{title}</h3><p>{description}</p></div>;
}
