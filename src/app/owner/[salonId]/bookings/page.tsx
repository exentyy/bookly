import { CalendarDays } from "lucide-react";
import { DemoNotice, DisabledAction, OwnerEmpty, OwnerHeading, OwnerPanel, OwnerShell, demoSalonId } from "../../../../components/OwnerUI";

export default function OwnerBookingsPage() {
  return <OwnerShell salonId={demoSalonId} section="/bookings"><OwnerHeading eyebrow="ЗАЯВКИ · ДЕМО" title="Записи клиентов" description="Все заявки салона, их время и статус — в одном списке." action={<DisabledAction icon={CalendarDays}>Экспорт записей</DisabledAction>} /><DemoNotice /><div className="owner-filter-row"><span className="is-current">Все записи</span><span>Ожидают подтверждения</span><span>Подтверждены</span></div><OwnerPanel icon={CalendarDays} title="Список записей" description="В демо режиме реальные заявки не загружаются."><OwnerEmpty title="Пока нет записей" description="После подключения backend здесь появятся заявки вашего салона. Вымышленные записи не показываются." /></OwnerPanel></OwnerShell>;
}
