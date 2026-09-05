import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shot2Code — Captura a Código",
  description: "Sube una captura y obtén HTML/React instantáneo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Adsterra - pega tu código aquí */}
        {/* <script async src="https://...adsterra..."></script> */}
      </head>
      <body className="bg-white text-gray-900 antialiased font-sans">{children}</body>
    </html>
  );
}
