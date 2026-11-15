import { Scissors } from "lucide-react";
import { DemoNotice, DisabledAction, OwnerEmpty, OwnerHeading, OwnerPanel, OwnerShell, demoSalonId } from "../../../../components/OwnerUI";

export default function OwnerServicesPage() {
  return <OwnerShell salonId={demoSalonId} section="/services"><OwnerHeading eyebrow="КАТАЛОГ · ДЕМО" title="Услуги" description="Стоимость, длительность и описание услуг салона." action={<DisabledAction>Добавить услугу</DisabledAction>} /><DemoNotice /><OwnerPanel icon={Scissors} title="Услуги салона" description="Управление каталогом станет доступно после подключения backend."><OwnerEmpty title="Услуг пока нет" description="Добавленные услуги будут появляться здесь после сохранения в салоне." /></OwnerPanel></OwnerShell>;
}
