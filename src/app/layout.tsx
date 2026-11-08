import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "@/styles/globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-face",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-heading-face",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  title: "Ludoteca",
  description: "Tu biblioteca de videojuegos, tus tiendas y tus suscripciones.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
