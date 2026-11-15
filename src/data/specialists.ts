export type Specialist = {
  id: string;
  name: string;
  category: string[];
  specialty: string;
  experience: number;
  rating: string;
  availability: string;
  tone: string;
};

export const specialists: Specialist[] = [
  { id: "anna", name: "Анна Белова", category: ["Лицо"], specialty: "Косметолог-эстетист", experience: 8, rating: "4,98", availability: "12 ноября, 12:30", tone: "#a78c80" },
  { id: "ekaterina", name: "Екатерина Соколова", category: ["Лицо", "Ногти"], specialty: "Мастер ухода", experience: 6, rating: "4,97", availability: "12 ноября, 14:00", tone: "#9f9b86" },
  { id: "anastasia", name: "Анастасия Миронова", category: ["Тело"], specialty: "Массажист", experience: 9, rating: "4,99", availability: "12 ноября, 16:30", tone: "#8d9a90" },
  { id: "maria", name: "Мария Крылова", category: ["Ногти"], specialty: "Мастер маникюра", experience: 5, rating: "4,96", availability: "13 ноября, 10:00", tone: "#ab9087" },
  { id: "dmitry", name: "Дмитрий Орлов", category: ["Волосы"], specialty: "Парикмахер-стилист", experience: 11, rating: "4,99", availability: "12 ноября, 13:00", tone: "#7e8d91" },
  { id: "alexander", name: "Александр Волков", category: ["Волосы", "Тело"], specialty: "Стилист и массажист", experience: 7, rating: "4,97", availability: "12 ноября, 17:00", tone: "#878b9d" },
];
