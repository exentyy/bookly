"use client";

import { ArrowRight, ArrowUpRight, Heart, Star } from "lucide-react";
import type { Service } from "../data/services";

type Props = {
  service: Service;
  favorite: boolean;
  onFavorite: (id: number) => void;
  onBook: (service: Service) => void;
  onDetails: (service: Service) => void;
  index: number;
  money: (value: number) => string;
};

export function ServiceCard({ service, favorite, onFavorite, onBook, onDetails, index, money }: Props) {
  return (
    <article className={`service-card glass-surface card-${index % 2}`}>
      <div className="service-photo" style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(5,7,8,.52) 100%), url("${service.image}")`, backgroundSize: "200% auto", backgroundPosition: service.imagePosition }}>
        <span className="photo-tag"><i/> {service.category.toUpperCase()}</span>
        <button className={`favorite-toggle glass-icon ${favorite ? "is-favorite" : ""}`} onClick={() => onFavorite(service.id)} aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}>
          <Heart size={17} fill={favorite ? "currentColor" : "none"}/>
        </button>
        <span className="rating"><Star size={12} fill="currentColor" aria-hidden="true"/> {service.rating}</span>
      </div>
      <div className="service-info">
        <div className="service-title-row">
          <div><h3>{service.name}</h3><p>{service.description}</p></div>
          <div className="price">{money(service.price)}<small> / {service.duration}</small></div>
        </div>
        <div className="service-bottom">
          <span className="artist"><span className="artist-avatar" style={{ background: `linear-gradient(135deg,${service.accent},#d3c3af)` }}>{service.artist.split(" ").map((word) => word[0]).join("")}</span><span>Мастер: {service.artist}</span></span>
          <div className="service-actions"><button className="service-details glass-secondary" onClick={() => onDetails(service)} aria-label={`Подробнее: ${service.name}`}>Подробнее <ArrowUpRight size={14}/></button><button className="glass-cta service-book" onClick={() => onBook(service)} aria-label={`Записаться: ${service.name}`}>Записаться <ArrowRight size={15}/></button></div>
        </div>
      </div>
    </article>
  );
}
