import "server-only";

import { createClient } from "./server";

export async function listActiveCities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug, name, timezone")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Не удалось загрузить города: ${error.message}`);
  return data;
}

export async function listActiveServices(cityId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select("id, city_id, name, category, description, duration_minutes, price_rub, image_url")
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (cityId) query = query.eq("city_id", cityId);
  const { data, error } = await query;
  if (error) throw new Error(`Не удалось загрузить услуги: ${error.message}`);
  return data;
}

export async function listActiveSpecialists(cityId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("specialists")
    .select("id, city_id, name, title, bio, experience_years, rating, rating_count")
    .eq("is_active", true)
    .order("name");

  if (cityId) query = query.eq("city_id", cityId);
  const { data, error } = await query;
  if (error) throw new Error(`Не удалось загрузить специалистов: ${error.message}`);
  return data;
}

export async function loadCatalog() {
  const supabase = await createClient();
  const { data: publicSalons, error: salonError } = await supabase.from("salons")
    .select("id, city_id")
    .in("status", ["published", "legacy_unclaimed"]);
  // Keep the current catalog available until the new SQL has been applied.
  const beforeSalonMigration = salonError?.code === "PGRST205" || salonError?.code === "42P01";
  if (salonError && !beforeSalonMigration) {
    throw new Error("Не удалось загрузить каталог BOOKLY.");
  }
  if (!beforeSalonMigration && !publicSalons?.length) {
    return { cities: [], services: [], specialists: [], links: [] };
  }
  const salonIds = (publicSalons || []).map((item) => item.id);
  const cityIds = [...new Set((publicSalons || []).map((item) => item.city_id))];
  let citiesQuery = supabase.from("cities").select("id, slug, name, timezone").eq("is_active", true).order("name");
  let servicesQuery = supabase.from("services")
    .select("id, city_id, name, category, description, duration_minutes, price_rub, image_url")
    .eq("is_active", true).order("name");
  let specialistsQuery = supabase.from("specialists")
    .select("id, city_id, name, title, experience_years, rating")
    .eq("is_active", true).order("name");
  let linksQuery = supabase.from("specialist_services").select("service_id, specialist_id");
  if (!beforeSalonMigration) {
    citiesQuery = citiesQuery.in("id", cityIds);
    servicesQuery = servicesQuery.in("salon_id", salonIds);
    specialistsQuery = specialistsQuery.in("salon_id", salonIds);
    linksQuery = linksQuery.in("salon_id", salonIds);
  }
  const [cities, services, specialists, links] = await Promise.all([
    citiesQuery,
    servicesQuery,
    specialistsQuery,
    linksQuery,
  ]);
  if (cities.error || services.error || specialists.error || links.error) {
    throw new Error("Не удалось загрузить каталог BOOKLY.");
  }
  return { cities: cities.data, services: services.data, specialists: specialists.data, links: links.data };
}

export async function listMyBookings() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error("Не удалось проверить сессию BOOKLY.");
  if (!userData.user) throw new Error("Для просмотра записей нужно войти в аккаунт.");

  const { data, error } = await supabase
    .from("bookings")
    .select("id, city_id, service_id, specialist_id, starts_at, ends_at, status, service_name, price_rub, duration_minutes, created_at")
    .eq("customer_id", userData.user.id)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(`Не удалось загрузить записи: ${error.message}`);
  return data;
}

export async function createMyBooking(input: { serviceId: string; specialistId: string; startsAt: string }) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error("Не удалось проверить сессию BOOKLY.");
  if (!userData.user) throw new Error("Для записи нужно войти в аккаунт.");
  const { data, error } = await supabase.rpc("bookly_create_booking", {
    p_service_id: input.serviceId,
    p_specialist_id: input.specialistId,
    p_starts_at: input.startsAt,
  });
  if (error) {
    if (error.code === "23P01") throw new Error("Это время уже занято. Выберите другой слот.");
    if (error.message.includes("slot_unavailable")) throw new Error("Это время больше недоступно. Выберите другой слот.");
    throw new Error("Не удалось создать запись. Попробуйте ещё раз.");
  }
  return data;
}
