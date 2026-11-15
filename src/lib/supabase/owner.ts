import "server-only";

import { createClient } from "./server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9-]{3,100}$/;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Войдите в BOOKLY, чтобы управлять салоном.");
  return { supabase, user };
}

export async function listOwnedSalons() {
  const { supabase, user } = await requireUser();
  const { data: memberships, error: membershipError } = await supabase
    .from("salon_memberships")
    .select("salon_id")
    .eq("user_id", user.id)
    .eq("role", "owner");
  if (membershipError) throw new Error("Не удалось загрузить ваши салоны.");
  const ids = (memberships || []).map((item) => item.salon_id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("salons")
    .select("id, city_id, slug, name, description, status")
    .in("id", ids)
    .order("name");
  if (error) throw new Error("Не удалось загрузить ваши салоны.");
  return data;
}

export async function requireSalonOwner(salonId: string) {
  if (!uuid.test(salonId)) throw new Error("Салон не найден.");
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("salon_memberships")
    .select("salon_id")
    .eq("salon_id", salonId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (error || !data) throw new Error("Нет доступа к этому салону.");
  return { supabase, user };
}

async function getOwnedSalon(salonId: string) {
  const { supabase, user } = await requireSalonOwner(salonId);
  const { data: salon, error } = await supabase.from("salons")
    .select("id, city_id, status")
    .eq("id", salonId)
    .maybeSingle();
  if (error || !salon || salon.status === "legacy_unclaimed") {
    throw new Error("Нет доступа к этому салону.");
  }
  return { supabase, user, salon };
}

export async function createSalon(input: {
  cityId: string;
  slug: string;
  name: string;
  description?: string;
}) {
  if (!uuid.test(input.cityId) || !slug.test(input.slug) || input.slug.startsWith("legacy-")
    || input.name.trim().length < 2 || input.name.trim().length > 120
    || (input.description || "").length > 2000) {
    throw new Error("Проверьте название, адрес страницы и город салона.");
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("bookly_create_salon", {
    p_city_id: input.cityId,
    p_slug: input.slug,
    p_name: input.name.trim(),
    p_description: input.description || "",
  });
  if (error?.code === "23505") throw new Error("Этот адрес салона уже занят.");
  if (error || !data) throw new Error("Не удалось создать салон.");
  return data;
}

export async function listSalonBookings(salonId: string) {
  const { supabase } = await requireSalonOwner(salonId);
  const { data, error } = await supabase.from("bookings")
    .select("id, salon_id, customer_id, service_name, specialist_id, starts_at, ends_at, status, price_rub, created_at")
    .eq("salon_id", salonId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error("Не удалось загрузить заявки салона.");
  return data;
}

export async function createSalonService(salonId: string, input: {
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  priceRub: number;
  imageUrl?: string;
}) {
  if (input.name.trim().length < 1 || input.name.length > 160
    || input.category.trim().length < 1 || input.category.length > 80
    || input.description.length > 2000
    || !Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 720
    || !Number.isInteger(input.priceRub) || input.priceRub < 1
    || (input.imageUrl !== undefined
      && !/^\/images\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(input.imageUrl))) {
    throw new Error("Проверьте название, длительность и стоимость услуги.");
  }
  const { supabase, salon } = await getOwnedSalon(salonId);
  const { data, error } = await supabase.from("services").insert({
    salon_id: salon.id,
    city_id: salon.city_id,
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description,
    duration_minutes: input.durationMinutes,
    price_rub: input.priceRub,
    image_url: input.imageUrl || null,
  }).select("id").single();
  if (error || !data) throw new Error("Не удалось добавить услугу.");
  return data.id;
}

export async function createSalonSpecialist(salonId: string, input: {
  name: string;
  title: string;
  bio?: string;
  experienceYears?: number;
}) {
  if (input.name.trim().length < 1 || input.name.length > 120
    || input.title.trim().length < 1 || input.title.length > 160
    || (input.bio || "").length > 2000
    || !Number.isInteger(input.experienceYears ?? 0)
    || (input.experienceYears ?? 0) < 0 || (input.experienceYears ?? 0) > 60) {
    throw new Error("Проверьте имя и данные специалиста.");
  }
  const { supabase, salon } = await getOwnedSalon(salonId);
  const { data, error } = await supabase.from("specialists").insert({
    salon_id: salon.id,
    city_id: salon.city_id,
    name: input.name.trim(),
    title: input.title.trim(),
    bio: input.bio || null,
    experience_years: input.experienceYears ?? 0,
  }).select("id").single();
  if (error || !data) throw new Error("Не удалось добавить специалиста.");
  return data.id;
}

export async function linkSalonSpecialistService(salonId: string, specialistId: string, serviceId: string) {
  if (!uuid.test(specialistId) || !uuid.test(serviceId)) {
    throw new Error("Выберите услугу и специалиста.");
  }
  const { supabase } = await getOwnedSalon(salonId);
  const { error } = await supabase.from("specialist_services").insert({
    salon_id: salonId,
    specialist_id: specialistId,
    service_id: serviceId,
  });
  if (error?.code === "23505") return;
  if (error) throw new Error("Не удалось связать услугу и специалиста.");
}

export async function addSalonAvailability(salonId: string, specialistId: string, startsAt: string, endsAt: string) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const explicitZone = /(Z|[+-]\d{2}:\d{2})$/i;
  if (!uuid.test(specialistId) || !explicitZone.test(startsAt) || !explicitZone.test(endsAt)
    || !Number.isFinite(start) || !Number.isFinite(end)
    || start <= Date.now() || end <= start || end - start > 24 * 60 * 60 * 1000) {
    throw new Error("Проверьте специалиста и время рабочего окна.");
  }
  const { supabase } = await getOwnedSalon(salonId);
  const { data, error } = await supabase.from("specialist_availability").insert({
    salon_id: salonId,
    specialist_id: specialistId,
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(end).toISOString(),
  }).select("id").single();
  if (error || !data) throw new Error("Не удалось добавить рабочее время.");
  return data.id;
}

export async function confirmSalonBooking(salonId: string, bookingId: string) {
  if (!uuid.test(bookingId)) throw new Error("Запись не найдена.");
  const { supabase } = await requireSalonOwner(salonId);
  const { data, error } = await supabase.rpc("bookly_confirm_booking", {
    p_salon_id: salonId,
    p_booking_id: bookingId,
  });
  if (error || !data) throw new Error("Запись уже изменилась или недоступна для подтверждения.");
  return data;
}
