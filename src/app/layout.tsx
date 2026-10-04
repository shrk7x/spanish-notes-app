import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalToastProvider } from "@/components/ToastProvider";
import { getThemeInitScript } from "@/utils/theme";
import { I18nProvider } from "@/components/I18nProvider";
import { getServerLocale } from "@/i18n/server";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VivaNote",
  description: "Write, listen, and review language notes — all in one place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/favicon.ico?v=2" />
        <link rel="icon" href="/icons/favicon-32x32.png?v=2" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/favicon-16x16.png?v=2" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2" />
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VivaNote" />
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body className="antialiased">
        <GlobalToastProvider>
          <I18nProvider initialLocale={locale}>
            <ServiceWorkerRegistration />
            {children}
          </I18nProvider>
        </GlobalToastProvider>
      </body>
    </html>
  );
}
