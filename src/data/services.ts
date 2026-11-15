export type Service = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  rating: string;
  image: string;
  imagePosition: string;
  artist: string;
  accent: string;
};

export const services: Service[] = [
  { id: 1, name: "Фирменная стрижка", category: "Волосы", description: "Стрижка, созданная специально для вас.", price: 3200, duration: "60 мин.", rating: "4,98", image: "/images/bookly-services.png", imagePosition: "0% 18%", artist: "Дмитрий Орлов", accent: "#6e777b" },
  { id: 2, name: "Восстанавливающий уход", category: "Лицо", description: "Верните коже естественное сияние.", price: 5400, duration: "75 мин.", rating: "4,96", image: "/images/bookly-services.png", imagePosition: "100% 18%", artist: "Анна Белова", accent: "#8b7164" },
  { id: 3, name: "Массаж глубоких тканей", category: "Тело", description: "Оставьте заботы дня позади и отдохните.", price: 6800, duration: "90 мин.", rating: "4,99", image: "/images/bookly-services.png", imagePosition: "0% 82%", artist: "Анастасия Миронова", accent: "#667469" },
  { id: 4, name: "Аккуратный маникюр", category: "Ногти", description: "Маленькая деталь, которая меняет всё.", price: 2600, duration: "45 мин.", rating: "4,95", image: "/images/bookly-services.png", imagePosition: "100% 82%", artist: "Мария Крылова", accent: "#907e77" },
];

export const categories = ["Все", "Волосы", "Лицо", "Тело", "Ногти"];
