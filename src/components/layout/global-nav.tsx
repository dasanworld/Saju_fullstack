"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PlusCircle, Sparkles } from "lucide-react";
import { NavFooter } from "./nav-footer";

const menuItems = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: Home,
  },
  {
    href: "/new-test",
    label: "새 검사",
    icon: PlusCircle,
  },
];

export function GlobalNav() {
  const pathname = usePathname();

  return (
    <nav className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Saju피아</h1>
        </div>
      </div>

      <div className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <NavFooter />
    </nav>
  );
}
