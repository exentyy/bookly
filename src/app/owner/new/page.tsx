import Link from "next/link";
import { ArrowLeft, Info, Store } from "lucide-react";
import { OwnerHeading, OwnerPanel, OwnerShell } from "../../../components/OwnerUI";

export default function NewSalonPage() {
  return <OwnerShell><OwnerHeading eyebrow="НОВЫЙ САЛОН" title="Расскажите о своём салоне" description="Форма готова к подключению после применения мультитенантной миграции." action={<Link className="glass-secondary owner-back" href="/owner"><ArrowLeft size={15} /> К салонам</Link>} />
    <div className="owner-form-layout"><OwnerPanel icon={Store} title="Основная информация" description="Эти данные будут показаны клиентам после публикации."><div className="owner-form"><label>Название салона<input name="name" placeholder="Например, Ателье красоты" autoComplete="organization" maxLength={120} /></label><label>Город<select name="city" defaultValue=""><option value="" disabled>Выберите город</option><option value="tyumen">Тюмень · демо</option></select><small>Список городов появится после подключения кабинета.</small></label><label>Описание<textarea name="description" rows={5} maxLength={2000} placeholder="Атмосфера, услуги и то, что делает ваш салон особенным" /></label><button className="glass-cta owner-primary" disabled type="button">Создать салон</button><p className="owner-form-note">Сохранение пока недоступно. Данные формы никуда не отправляются.</p></div></OwnerPanel><aside className="owner-help"><Info size={19} /><h2>Что будет дальше</h2><p>После создания вы сможете добавить услуги, специалистов и рабочие часы, затем опубликовать салон.</p><span>Предварительный просмотр</span></aside></div>
  </OwnerShell>;
}
