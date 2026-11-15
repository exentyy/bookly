import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BOOKLY",
    short_name: "BOOKLY",
    description: "Выбирайте услуги и записывайтесь к специалистам с BOOKLY.",
    lang: "ru",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090b0e",
    theme_color: "#090b0e",
    icons: [
      { src: "/icons/bookly-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/bookly-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/bookly-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
