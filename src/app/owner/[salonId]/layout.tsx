import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { demoSalonId } from "../../../components/OwnerUI";

export default async function SalonLayout({ children, params }: { children: ReactNode; params: Promise<{ salonId: string }> }) {
  if ((await params).salonId !== demoSalonId) notFound();
  return children;
}
