"use client";

import { ArrowRight, X } from "lucide-react";
import type { Database } from "../lib/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];
const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export function ServiceDetails({ service, onClose, onBook }: { service: Pick<Service, "name" | "description" | "price_rub" | "duration_minutes" | "category">; onClose: () => void; onBook: () => void }) {
  return <div className="modal-scrim"><div className="booking-modal" role="dialog" aria-modal="true" aria-label={`Информация об услуге: ${service.name}`}>
    <div className="modal-top"><div><span className="section-kicker">{service.category.toLocaleUpperCase("ru-RU")}</span><h2>{service.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={18}/></button></div>
    <p className="detail-description">{service.description}</p>
    <div className="detail-facts"><div><span>ДЛИТЕЛЬНОСТЬ</span><strong>{service.duration_minutes} мин.</strong></div><div><span>СТОИМОСТЬ</span><strong>{money(service.price_rub)}</strong></div></div>
    <div className="modal-actions"><button className="glass-cta" onClick={onBook}>Выбрать время <ArrowRight size={16}/></button></div>
  </div></div>;
}
