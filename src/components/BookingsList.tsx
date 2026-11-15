"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelBookingAction } from "../app/booking/actions";
import type { Database } from "../lib/supabase/types";

type Booking = Pick<Database["public"]["Tables"]["bookings"]["Row"], "id" | "customer_id" | "city_id" | "specialist_id" | "service_name" | "price_rub" | "duration_minutes" | "starts_at" | "status">;
const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
const statusLabel = { pending: "Ожидает подтверждения", confirmed: "Подтверждена", cancelled: "Отменена", completed: "Завершена" };

export function BookingsList({ bookings, specialistNames, cityZones }: { bookings: Booking[]; specialistNames: Record<string, string>; cityZones: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [now] = useState(() => Date.now());
  if (!bookings.length) return <div className="empty-state"><h3>Пока нет записей</h3><p>Выберите услугу и удобное время.</p><Link className="glass-cta" href="/">Посмотреть услуги</Link></div>;
  return <div className="booking-list">{message && <p className="auth-error" role="status">{message}</p>}{bookings.map((item) => {
    const canCancel = new Date(item.starts_at).getTime() > now && (item.status === "pending" || item.status === "confirmed");
    return <article className="booking-card" key={item.id}><div className="booking-copy"><span className="section-kicker">{statusLabel[item.status]}</span><h3>{item.service_name}</h3><p>{specialistNames[item.specialist_id] || "Специалист"}</p><p>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: cityZones[item.city_id] || "UTC" }).format(new Date(item.starts_at))} · {item.duration_minutes} мин.</p></div><div className="booking-price"><strong>{money(item.price_rub)}</strong>{canCancel && <button className="glass-secondary" disabled={pending} onClick={() => startTransition(async () => { const result = await cancelBookingAction(item.id); setMessage(result.message); if (result.ok) router.refresh(); })}>Отменить</button>}</div></article>;
  })}</div>;
}
