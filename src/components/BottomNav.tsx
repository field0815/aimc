"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─────────────────────────────────────────────────────────────
// 모바일 하단 탭바 (갤럭시 등 좁은 화면). 데스크톱에서는 숨김.
// ─────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur sm:hidden">
      <ul className="mx-auto grid max-w-5xl grid-cols-5">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "text-accent" : "text-gray-400"
                }`}
              >
                <span className="text-base leading-none">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
