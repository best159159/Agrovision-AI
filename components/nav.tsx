"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Brain, Info, Leaf, Map, Plane, Plus } from "lucide-react";

const LINKS = [
  { href: "/scan",         label: "New Scan",    icon: Plus,     primary: true },
  { href: "/dashboard",    label: "Results",     icon: BarChart2 },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/map",          label: "Disease Map", icon: Map },
  { href: "/drone",        label: "Drone",       icon: Plane },
  { href: "/about",        label: "About",       icon: Info },
];

export function Nav({ fieldReportCount = 0 }: { fieldReportCount?: number }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 hover:text-green-700 transition-colors">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-4.5 w-4.5 text-white" />
          </span>
          <span className="text-base font-bold">AgroVision<span className="font-normal text-slate-400 ml-1 text-sm">AI</span></span>
        </Link>

        {/* Links */}
        <nav className="order-3 grid w-full grid-cols-6 items-center gap-1 pt-1 sm:order-none sm:flex sm:w-auto sm:pt-0" aria-label="Primary navigation">
          {LINKS.map(({ href, label, icon: Icon, primary }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            if (primary) return (
              <Link key={href} href={href} aria-label={label}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 sm:ml-2 sm:px-4 sm:text-sm">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
            return (
              <Link key={href} href={href} aria-label={label}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${active ? "nav-active" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {href === "/map" && fieldReportCount > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-green-100 px-1 text-[10px] font-semibold text-green-700">
                    {fieldReportCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
