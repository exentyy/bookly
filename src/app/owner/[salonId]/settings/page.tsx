import { Settings2 } from "lucide-react";
import { DemoNotice, OwnerHeading, OwnerPanel, OwnerShell, demoSalon, demoSalonId } from "../../../../components/OwnerUI";

export default function OwnerSettingsPage() {
  return <OwnerShell salonId={demoSalonId} section="/settings"><OwnerHeading eyebrow="САЛОН · ДЕМО" title="Настройки" description="Название, город, описание и видимость салона." /><DemoNotice /><OwnerPanel icon={Settings2} title="Профиль салона" description="Поля показаны для предварительного просмотра и не сохраняются."><div className="owner-form"><label>Название<input value={demoSalon.name} readOnly aria-readonly="true" /></label><label>Город<input value={demoSalon.city} readOnly aria-readonly="true" /></label><label>Описание<textarea value={demoSalon.description} readOnly aria-readonly="true" rows={4} /></label><div className="owner-settings-status"><span>Статус публикации</span><strong>Демо · не опубликован</strong></div><button className="glass-cta owner-primary" type="button" disabled>Сохранить изменения</button><p className="owner-form-note">Редактирование и публикация появятся после подключения backend.</p></div></OwnerPanel></OwnerShell>;
}
