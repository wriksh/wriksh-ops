"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineChatAlt2,
  HiOutlineCurrencyRupee,
  HiOutlineUserGroup,
  HiOutlineMap,
  HiOutlineAcademicCap,
  HiOutlinePhotograph,
} from "react-icons/hi";

/**
 * Side navigation for the Dhoomkethu dashboard.
 *
 * Each module maps to one of the numbered items in the project TODO. Links
 * to modules that haven't shipped yet use placeholder pages — clicking
 * them won't 404, but the page will clearly say "coming soon".
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string; // small text shown right of the label
};

const items: NavItem[] = [
  { href: "/", label: "Dhoomkethu", icon: HiOutlineHome },
  { href: "/cataloguing", label: "Cataloguing", icon: HiOutlineDocumentText, badge: "Live" },
  { href: "/marketing", label: "Marketing Calendar", icon: HiOutlineCalendar, badge: "Soon" },
  { href: "/discord", label: "Discord · wrikshbot", icon: HiOutlineChatAlt2, badge: "Soon" },
  { href: "/finance", label: "Finance", icon: HiOutlineCurrencyRupee, badge: "Soon" },
  { href: "/discover-artists", label: "Discover Artists", icon: HiOutlineUserGroup, badge: "Soon" },
  { href: "/experience-guides", label: "Experience Guides", icon: HiOutlineMap, badge: "Soon" },
  { href: "/learn-hosts", label: "Learn Hosts", icon: HiOutlineAcademicCap, badge: "Soon" },
  { href: "/media", label: "Media Assets", icon: HiOutlinePhotograph, badge: "Soon" },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-stone/40 bg-parchment md:block">
      <div className="flex h-16 items-center px-6 border-b border-stone/40">
        <div>
          <div className="font-display text-xl text-ink">Wriksh Ops</div>
          <div className="font-body text-[10px] tracking-[0.32em] uppercase text-gold">
            Dhoomkethu
          </div>
        </div>
      </div>
      <nav className="px-3 py-4">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-forest text-linen"
                  : "text-ink-soft hover:bg-parchment-2 hover:text-ink")
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
                    (item.badge === "Live"
                      ? "bg-gold/20 text-gold"
                      : "bg-stone/40 text-umber")
                  }
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 mt-auto border-t border-stone/40">
        <p className="font-body text-[11px] leading-relaxed text-umber">
          A portrayal of the
          <br />
          <span className="italic text-gold">Suvarna Yuga of Bharath</span>
        </p>
      </div>
    </aside>
  );
}
