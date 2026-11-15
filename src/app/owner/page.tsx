import Link from "next/link";
import { ArrowRight, Plus, Store } from "lucide-react";
import { DemoNotice, demoSalon, demoSalonId, OwnerHeading, OwnerShell } from "../../components/OwnerUI";

export default function OwnerPage() {
  return <OwnerShell><OwnerHeading eyebrow="КАБИНЕТ ВЛАДЕЛЬЦА" title="Ваши салоны" description="Управляйте услугами, командой и расписанием в одном месте." action={<Link className="glass-cta owner-primary" href="/owner/new"><Plus size={17} />Создать салон</Link>} />
    <DemoNotice />
    <div className="owner-section-label">Предварительный просмотр <span>1 демо салон</span></div>
    <Link className="owner-salon-card" href={`/owner/${demoSalonId}`}><span className="owner-salon-symbol"><Store size={28} /></span><span className="owner-salon-main"><span className="owner-demo-tag">Демо салон</span><strong>{demoSalon.name}</strong><span>{demoSalon.city} · {demoSalon.description}</span></span><ArrowRight className="owner-card-arrow" size={21} /></Link>
    <p className="owner-footnote">После подключения backend здесь появятся только салоны вашего аккаунта.</p>
  </OwnerShell>;
}
