import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createClient } from "../../../lib/supabase/server";
import { BookingsList } from "../../../components/BookingsList";

export const instant = false;

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=/account/bookings");
  const { data: bookings, error } = await supabase.from("bookings")
    .select("id, customer_id, city_id, specialist_id, service_name, price_rub, duration_minutes, starts_at, status")
    .eq("customer_id", user.id).order("starts_at", { ascending: false });
  const ids = [...new Set((bookings || []).map((item) => item.specialist_id))];
  const specialists = ids.length ? await supabase.from("specialists").select("id, name").in("id", ids) : { data: [], error: null };
  const names = Object.fromEntries((specialists.data || []).map((item) => [item.id, item.name]));
  const cityIds = [...new Set((bookings || []).map((item) => item.city_id))];
  const cities = cityIds.length ? await supabase.from("cities").select("id, timezone").in("id", cityIds) : { data: [], error: null };
  const cityZones = Object.fromEntries((cities.data || []).map((item) => [item.id, item.timezone]));
  return <main className="auth-shell bookings-shell"><Link className="auth-back" href="/"><ArrowLeft size={16}/> На главную</Link>
    <section className="auth-card bookings-page glass-surface"><div className="auth-mark"><CalendarDays size={19}/></div><span className="auth-kicker">ВАШ АККАУНТ BOOKLY</span><h1>Мои записи</h1><p className="auth-copy">Ваше время для себя — в одном месте.</p>
      {error ? <p className="auth-error" role="alert">Не удалось загрузить записи. Обновите страницу.</p> : <BookingsList bookings={bookings || []} specialistNames={names} cityZones={cityZones}/>}
      <Link className="glass-secondary bookings-back" href="/account">Вернуться в профиль</Link>
    </section>
  </main>;
}
