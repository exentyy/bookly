import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("service") || "";
  const specialistId = request.nextUrl.searchParams.get("specialist") || "";
  const day = request.nextUrl.searchParams.get("day") || "";
  if (!uuid.test(serviceId) || !uuid.test(specialistId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ slots: [], message: "Выберите услугу, специалиста и дату." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bookly_available_slots", {
    p_service_id: serviceId,
    p_specialist_id: specialistId,
    p_day: day,
  });
  if (error) {
    return NextResponse.json({ slots: [], message: "Расписание пока не опубликовано." }, { status: 503 });
  }
  return NextResponse.json({ slots: data }, { headers: { "Cache-Control": "no-store" } });
}
