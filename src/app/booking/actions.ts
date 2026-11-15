"use server";

import { createClient } from "../../lib/supabase/server";
import { createMyBooking } from "../../lib/supabase/queries";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createBookingAction(input: { serviceId: string; specialistId: string; startsAt: string }) {
  if (!uuid.test(input.serviceId) || !uuid.test(input.specialistId) || !Number.isFinite(Date.parse(input.startsAt))) {
    return { ok: false, message: "Выберите услугу, специалиста и время." };
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, loginRequired: true, message: "Войдите, чтобы подтвердить запись." };
  try {
    await createMyBooking(input);
    return { ok: true, message: "Запись создана. Она появится в разделе «Мои записи»." };
  } catch (bookingError) {
    return { ok: false, message: bookingError instanceof Error ? bookingError.message : "Не удалось создать запись." };
  }
}

export async function cancelBookingAction(bookingId: string) {
  if (!uuid.test(bookingId)) return { ok: false, message: "Запись не найдена." };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Войдите, чтобы отменить запись." };
  const { data: booking, error: readError } = await supabase.from("bookings")
    .select("id, customer_id, starts_at, status")
    .eq("id", bookingId).eq("customer_id", user.id).maybeSingle();
  if (readError || !booking) return { ok: false, message: "Запись не найдена." };
  if (new Date(booking.starts_at).getTime() <= Date.now() || !["pending", "confirmed"].includes(booking.status)) {
    return { ok: false, message: "Эту запись уже нельзя отменить." };
  }
  const { data, error } = await supabase.from("bookings").update({ status: "cancelled" })
    .eq("id", bookingId).eq("customer_id", user.id)
    .in("status", ["pending", "confirmed"]).gt("starts_at", new Date().toISOString())
    .select("id").maybeSingle();
  if (error) return { ok: false, message: "Отмена станет доступна после обновления политики базы." };
  if (!data) return { ok: false, message: "Запись уже изменилась. Обновите страницу." };
  return { ok: true, message: "Запись отменена." };
}
