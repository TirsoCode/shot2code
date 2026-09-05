import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shot2Code — Captura a Código",
  description: "Sube una captura y obtén HTML/React instantáneo. Gratis, open-source.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Adsterra - pega tu código aquí */}
        {/* <script async src="https://...adsterra..."></script> */}
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
