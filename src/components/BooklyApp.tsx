"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronDown, Compass, Heart, Search, Star, UserRound, X } from "lucide-react";
import type { loadCatalog } from "../lib/supabase/queries";
import { createBookingAction } from "../app/booking/actions";
import { ServiceDetails } from "./ServiceDetails";

type Catalog = Awaited<ReturnType<typeof loadCatalog>>;
type Service = Catalog["services"][number];
type Slot = { starts_at: string; ends_at: string };
const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
const photoPosition: Record<string, string> = { Волосы: "0% 18%", Лицо: "100% 18%", Тело: "0% 82%", Ногти: "100% 82%" };
const todayIn = (zone: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: zone }).format(new Date());

export function BooklyApp({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = catalog.services.find((item) => item.id === params.get("service"));
  const [cityId, setCityId] = useState(requested?.city_id || catalog.cities[0]?.id || "");
  const [view, setView] = useState<"home" | "catalog" | "favorites">("home");
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [service, setService] = useState<Service | null>(requested || null);
  const [details, setDetails] = useState<Service | null>(null);
  const [specialistId, setSpecialistId] = useState(params.get("specialist") || "");
  const [day, setDay] = useState(params.get("day") || (requested ? todayIn(catalog.cities.find((item) => item.id === requested.city_id)?.timezone || "Europe/Moscow") : ""));
  const [slot, setSlot] = useState(params.get("slot") || "");
  const [slotResult, setSlotResult] = useState<{ key: string; slots: Slot[]; message: string } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const city = catalog.cities.find((item) => item.id === cityId);
  const categories = useMemo(() => ["Все", ...new Set(catalog.services.filter((item) => item.city_id === cityId).map((item) => item.category))], [catalog.services, cityId]);
  const services = catalog.services.filter((item) => item.city_id === cityId && (view !== "favorites" || favorites.includes(item.id)) && (category === "Все" || item.category === category) && `${item.name} ${item.description}`.toLocaleLowerCase("ru-RU").includes(query.toLocaleLowerCase("ru-RU")));
  const specialists = service ? catalog.specialists.filter((person) => person.city_id === service.city_id && catalog.links.some((link) => link.service_id === service.id && link.specialist_id === person.id)) : [];
  const specialist = specialists.find((person) => person.id === specialistId);
  const slotKey = service && specialistId && day ? `${service.id}:${specialistId}:${day}` : "";
  const slots = slotResult?.key === slotKey ? slotResult.slots : [];
  const slotMessage = slotResult?.key === slotKey ? slotResult.message : "Загружаем расписание…";

  useEffect(() => {
    if (!service || !specialistId || !day) return;
    const controller = new AbortController();
    fetch(`/api/availability?${new URLSearchParams({ service: service.id, specialist: specialistId, day })}`, { signal: controller.signal })
      .then(async (response) => { const body = await response.json() as { slots: Slot[]; message?: string }; if (!response.ok) throw new Error(body.message || "Расписание недоступно."); return body.slots; })
      .then((available) => { setSlotResult({ key: `${service.id}:${specialistId}:${day}`, slots: available, message: available.length ? "" : "На этот день свободного времени нет." }); })
      .catch((error: unknown) => { if (controller.signal.aborted) return; setSlotResult({ key: `${service.id}:${specialistId}:${day}`, slots: [], message: error instanceof Error ? error.message : "Расписание недоступно." }); });
    return () => controller.abort();
  }, [service, specialistId, day]);

  function openBooking(item: Service) { setDetails(null); setService(item); setSpecialistId(""); setDay(todayIn(city?.timezone || "Europe/Moscow")); setSlot(""); setFeedback(""); }
  function confirmBooking() {
    if (!service || !specialistId || !slot || !slots.some((item) => item.starts_at === slot)) return;
    startTransition(async () => {
      const result = await createBookingAction({ serviceId: service.id, specialistId, startsAt: slot });
      if (result.loginRequired) {
        const next = `/?${new URLSearchParams({ service: service.id, specialist: specialistId, day, slot })}`;
        router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`);
      } else if (result.ok) {
        setService(null);
        router.push("/account/bookings");
      } else { setFeedback(result.message); setSlot(""); }
    });
  }

  const nav = [
    { name: "Главная", icon: Compass, action: () => setView("home") },
    { name: "Услуги", icon: Search, action: () => setView("catalog") },
    { name: "Избранное", icon: Heart, action: () => setView("favorites") },
  ];
  return <main className="shell">
    <header className="topbar"><button className="brand" onClick={() => setView("home")} aria-label="BOOKLY — главная"><span className="brand-mark"><span/></span><span>BOOKLY<span className="brand-dot">.</span></span></button><div className="top-actions"><button className="top-location" onClick={() => setCityOpen(true)} aria-label="Выбрать город"><span className="live-dot"/>{city?.name || "Выбрать город"}<ChevronDown size={13}/></button><Link className="icon-button glass-icon" href="/account" aria-label="Аккаунт"><UserRound size={17}/></Link><Link className="icon-button glass-icon" href="/account/bookings" aria-label="Мои записи"><CalendarDays size={18}/></Link></div></header>
    <div className="layout"><aside className="side-rail"><div className="rail-label">ВАШЕ ПРОСТРАНСТВО</div>{nav.map(({ name, icon: Icon, action }) => <button className={`rail-link ${view === (name === "Главная" ? "home" : name === "Услуги" ? "catalog" : "favorites") ? "active" : ""}`} key={name} onClick={action}><Icon size={19}/>{name}</button>)}<Link className="rail-link" href="/account/bookings"><CalendarDays size={19}/>Мои записи</Link><Link className="rail-link" href="/account"><UserRound size={19}/>Профиль</Link><div className="rail-card glass-surface"><CalendarDays size={17}/><p>Найдите время<br/>для себя.</p><button className="glass-secondary" onClick={() => setView("catalog")}>Выбрать услугу <ArrowRight size={14}/></button></div></aside>
      <section className="main-content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> ВРЕМЯ ДЛЯ СЕБЯ</div><h1>{view === "home" ? <>Немного времени,<br/><em>только для себя.</em></> : view === "catalog" ? "Услуги" : "Избранное"}</h1><p className="welcome-copy">Выберите услугу и найдите время у своего специалиста.</p></div></div>
        <div className="search-wrap glass-surface"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Какую услугу вы ищете?" aria-label="Поиск услуг"/><button className="glass-icon" onClick={() => setView("catalog")} aria-label="Искать"><ArrowRight size={16}/></button></div>
        <div className="section-heading"><div><span className="section-kicker">НАЧНИТЕ С ЭТОГО</span><h2>Услуги по настроению</h2></div><span className="section-count">{categories.length - 1} <span>КАТЕГОРИЙ</span></span></div><div className="category-row">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? "selected" : ""}`} aria-pressed={category === item} onClick={() => { setCategory(item); setView("catalog"); }}>{item}<ArrowRight size={13}/></button>)}</div>
        <div className="section-heading popular-heading"><div><span className="section-kicker">ВЫБОР BOOKLY</span><h2>{view === "home" ? "Популярное" : view === "favorites" ? "Сохранённые услуги" : "Все услуги"}</h2></div>{view === "home" && <button className="text-link" onClick={() => setView("catalog")}>Все услуги <ArrowRight size={14}/></button>}</div>
        {services.length ? <div className="service-grid">{services.map((item, index) => <article key={item.id} className={`service-card glass-surface card-${index % 2}`}><div className="service-photo" style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(5,7,8,.52) 100%), url("${item.image_url || "/images/bookly-services.png"}")`, backgroundSize: item.image_url ? "cover" : "200% auto", backgroundPosition: item.image_url ? "center" : photoPosition[item.category] || "center" }}><span className="photo-tag"><i/>{item.category.toLocaleUpperCase("ru-RU")}</span><button className={`favorite-toggle glass-icon ${favorites.includes(item.id) ? "is-favorite" : ""}`} onClick={() => setFavorites((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} aria-label={favorites.includes(item.id) ? "Убрать из избранного" : "Добавить в избранное"}><Heart size={17} fill={favorites.includes(item.id) ? "currentColor" : "none"}/></button></div><div className="service-info"><div className="service-title-row"><div><h3>{item.name}</h3><p>{item.description}</p></div><div className="price">{money(item.price_rub)}<small> / {item.duration_minutes} мин.</small></div></div><div className="service-bottom"><span className="artist"><Star size={15}/>{catalog.links.filter((link) => link.service_id === item.id).length} специалистов</span><div className="service-actions"><button className="service-details glass-secondary" onClick={() => setDetails(item)}>Подробнее</button><button className="glass-cta service-book" onClick={() => openBooking(item)}>Записаться <ArrowRight size={15}/></button></div></div></div></article>)}</div> : <div className="empty-state catalog-empty"><Search size={25}/><h3>{view === "favorites" ? "Пока нет избранного" : "Услуг пока нет"}</h3><p>Каталог пока не заполнен. Услуги появятся здесь после публикации.</p></div>}</section></div>
    <nav className="bottom-nav glass-surface" aria-label="Основная навигация"><button onClick={() => setView("home")} aria-label="Главная"><Compass size={18}/><span>Главная</span></button><button onClick={() => setView("catalog")} aria-label="Услуги"><Search size={18}/><span>Услуги</span></button><Link href="/account/bookings" aria-label="Мои записи"><CalendarDays size={18}/><span>Мои записи</span></Link><button onClick={() => setView("favorites")} aria-label="Избранное"><Heart size={18}/><span>Избранное</span></button><Link href="/account" aria-label="Профиль"><UserRound size={18}/><span>Профиль</span></Link></nav>
    {cityOpen && <div className="modal-scrim"><div className="booking-modal compact-modal" role="dialog" aria-modal="true" aria-label="Выбор города"><div className="modal-top"><h2>Выберите город</h2><button className="icon-button" onClick={() => setCityOpen(false)} aria-label="Закрыть"><X size={18}/></button></div><div className="city-options">{catalog.cities.map((item) => <button className={`city-option ${cityId === item.id ? "chosen" : ""}`} key={item.id} onClick={() => { setCityId(item.id); setCategory("Все"); setCityOpen(false); }}>{item.name}{cityId === item.id && <Check size={16}/>}</button>)}</div></div></div>}
    {details && <ServiceDetails service={details} onClose={() => setDetails(null)} onBook={() => openBooking(details)}/>}
    {service && <div className="modal-scrim"><div className="booking-modal" role="dialog" aria-modal="true" aria-label="Запись на услугу"><div className="modal-top"><div><span className="section-kicker">ЗАПИСЬ В BOOKLY</span><h2>{service.name}</h2></div><button className="icon-button" onClick={() => setService(null)} aria-label="Закрыть"><X size={18}/></button></div><p className="modal-intro">{service.description}<span>{money(service.price_rub)} · {service.duration_minutes} мин. · {city?.name}</span></p><span className="section-kicker modal-label">СПЕЦИАЛИСТ</span><div className="specialist-list">{specialists.map((person) => <button key={person.id} className={`specialist-option ${specialistId === person.id ? "chosen" : ""}`} onClick={() => { setSpecialistId(person.id); setSlot(""); }}><span className="specialist-portrait"><UserRound size={18}/></span><span className="specialist-details"><span className="specialist-name">{person.name}</span><small>{person.title} · {person.experience_years} лет опыта</small></span><span className="specialist-rating"><Star size={12} fill="currentColor"/>{person.rating}</span></button>)}</div>{!specialists.length && <p className="modal-intro">Для этой услуги пока нет доступных специалистов.</p>}{specialist && <><label className="booking-date-label">Дата<input type="date" value={day} min={todayIn(city?.timezone || "Europe/Moscow")} onChange={(event) => { setDay(event.target.value); setSlot(""); }}/></label><span className="section-kicker modal-label">СВОБОДНОЕ ВРЕМЯ</span>{slots.length ? <div className="time-grid">{slots.map((item) => <button key={item.starts_at} className={slot === item.starts_at ? "chosen" : ""} onClick={() => setSlot(item.starts_at)}>{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: city?.timezone || "Europe/Moscow" }).format(new Date(item.starts_at))}</button>)}</div> : <p className="modal-intro" role="status">{slotMessage || "Выберите дату."}</p>}</>}{slot && <div className="review-box"><span className="section-kicker">ВАША ЗАПИСЬ</span><h3>{service.name}</h3><p>{specialist?.name}</p><p>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: city?.timezone || "Europe/Moscow" }).format(new Date(slot))}</p><strong>{money(service.price_rub)}</strong></div>}{feedback && <p className="auth-error" role="alert">{feedback}</p>}<div className="modal-actions"><button className="glass-cta" disabled={!slot || !slots.some((item) => item.starts_at === slot) || pending} onClick={confirmBooking}>{pending ? "Сохраняем…" : "Подтвердить запись"}<ArrowRight size={16}/></button></div></div></div>}
  </main>;
}
