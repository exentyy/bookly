import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Scissors, UsersRound } from "lucide-react";
import { DemoNotice, demoSalon, demoSalonId, OwnerHeading, OwnerPanel, OwnerShell } from "../../../components/OwnerUI";

export default function SalonOverviewPage() {
  const base = `/owner/${demoSalonId}`;
  return <OwnerShell salonId={demoSalonId}><OwnerHeading eyebrow="ОБЗОР САЛОНА · ДЕМО" title={demoSalon.name} description={`${demoSalon.city} · Пространство управления салоном.`} /><DemoNotice />
    <div className="owner-stats"><div><span>Записей сегодня</span><strong>—</strong><small>Демо · реальные данные недоступны</small></div><div><span>Услуг</span><strong>—</strong><small>Демо · реальные данные недоступны</small></div><div><span>Специалистов</span><strong>—</strong><small>Демо · реальные данные недоступны</small></div></div>
    <div className="owner-two-col"><OwnerPanel icon={CalendarDays} title="Ближайшие записи" description="Здесь появятся реальные заявки после подключения кабинета."><div className="owner-empty compact"><Clock3 size={22} /><h3>Записей для показа нет</h3><p>В демо режиме заявки клиентов не создаются и не отображаются.</p><Link href={`${base}/bookings`}>Открыть раздел записей <ArrowRight size={15} /></Link></div></OwnerPanel><OwnerPanel icon={Scissors} title="Быстрые действия" description="Настройте каталог перед публикацией."><div className="owner-action-list"><Link href={`${base}/services`}><Scissors size={17} /> Услуги <ArrowRight size={16} /></Link><Link href={`${base}/specialists`}><UsersRound size={17} /> Специалисты <ArrowRight size={16} /></Link><Link href={`${base}/schedule`}><Clock3 size={17} /> Расписание <ArrowRight size={16} /></Link></div></OwnerPanel></div>
  </OwnerShell>;
}
