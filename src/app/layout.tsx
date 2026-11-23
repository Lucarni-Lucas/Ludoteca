import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { htmlLang } from "@/model/account/locale";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");

  return { title: "Ludoteca", description: t("description") };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={htmlLang(locale)} className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable}`}>
      <body>
        {/* Hereda el idioma y el catálogo de src/i18n/request.ts. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
