import { loadCatalog } from "../lib/supabase/queries";
import { BooklyApp } from "../components/BooklyApp";

export const instant = false;

export default async function Home() {
  const catalog = await loadCatalog();
  return <BooklyApp catalog={catalog} />;
}
