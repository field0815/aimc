import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getI18n } from "@/lib/i18n";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "AI Semiconductor Market Calendar",
  description: "AI 반도체 투자자용 증시 이벤트 캘린더",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = getI18n();

  const nav = [
    { href: "/", label: t.nav.dashboard, icon: "🏠" },
    { href: "/calendar", label: t.nav.calendar, icon: "🗓️" },
    { href: "/events", label: t.nav.events, icon: "📋" },
    { href: "/my", label: t.nav.my, icon: "📌" },
    { href: "/seed", label: t.nav.seed, icon: "💰" },
  ];

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen bg-bg text-gray-200 antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-base">
                🛰️
              </span>
              <span className="leading-tight">
                <span className="block text-base font-extrabold tracking-tight text-white">
                  {t.appShort}
                </span>
                <span className="hidden text-[11px] text-gray-500 sm:block">{t.tagline}</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <span className="hidden items-center gap-1 sm:flex">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-2.5 py-1.5 text-gray-300 hover:bg-bg-card hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
              </span>
              <LocaleToggle current={locale} />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-6">{children}</main>

        <footer className="mx-auto max-w-5xl px-4 pb-24 pt-10 text-center text-xs text-gray-500 sm:pb-10">
          <p>
            <Link href="/guide" className="text-accent hover:underline">
              {t.decline.navGuide}
            </Link>
          </p>
          <p className="mt-2">{t.footer.line1}</p>
          <p className="mt-1">{t.footer.line2}</p>
        </footer>

        <BottomNav items={nav} />
      </body>
    </html>
  );
}
