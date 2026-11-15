import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "../components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOOKLY — время для себя",
  description: "Выбирайте услуги лучших специалистов и записывайтесь онлайн с BOOKLY.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BOOKLY" },
  icons: {
    icon: [
      { url: "/icons/bookly-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/bookly-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/bookly-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090b0e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru-RU">
      <body><PwaRegistration />{children}</body>
    </html>
  );
}
