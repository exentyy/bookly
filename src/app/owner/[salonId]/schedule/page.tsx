import { Clock3 } from "lucide-react";
import { DemoNotice, DisabledAction, OwnerEmpty, OwnerHeading, OwnerPanel, OwnerShell, demoSalonId } from "../../../../components/OwnerUI";

export default function OwnerSchedulePage() {
  return <OwnerShell salonId={demoSalonId} section="/schedule"><OwnerHeading eyebrow="РАБОЧЕЕ ВРЕМЯ · ДЕМО" title="Расписание" description="Рабочие окна специалистов определяют свободное время для записи." action={<DisabledAction>Добавить часы</DisabledAction>} /><DemoNotice /><OwnerPanel icon={Clock3} title="Рабочие окна" description="Для реальной записи необходимо опубликованное расписание."><OwnerEmpty title="Расписание не настроено" description="В демо режиме мы не создаём фиктивные свободные слоты. После подключения вы сможете задать часы каждого специалиста." /></OwnerPanel></OwnerShell>;
}
