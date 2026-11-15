import { UsersRound } from "lucide-react";
import { DemoNotice, DisabledAction, OwnerEmpty, OwnerHeading, OwnerPanel, OwnerShell, demoSalonId } from "../../../../components/OwnerUI";

export default function OwnerSpecialistsPage() {
  return <OwnerShell salonId={demoSalonId} section="/specialists"><OwnerHeading eyebrow="КОМАНДА · ДЕМО" title="Специалисты" description="Люди, которые создают впечатление о вашем салоне." action={<DisabledAction>Добавить специалиста</DisabledAction>} /><DemoNotice /><OwnerPanel icon={UsersRound} title="Команда салона" description="После подключения здесь можно будет связать специалистов с услугами."><OwnerEmpty title="Специалистов пока нет" description="Создайте карточки команды после подключения кабинета к базе." /></OwnerPanel></OwnerShell>;
}
