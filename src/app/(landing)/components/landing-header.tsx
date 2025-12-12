"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Menu, X } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { label: "홈", href: "#hero" },
  { label: "서비스", href: "#service" },
  { label: "가격", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleScroll = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  const handleCTAClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900">Saju피아</span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleScroll(link.href)}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:block">
          {isLoading ? (
            <Button variant="outline" size="sm" disabled>
              로딩 중...
            </Button>
          ) : isAuthenticated ? (
            <Button onClick={handleCTAClick} size="sm">
              대시보드로 이동
            </Button>
          ) : (
            <Button onClick={handleCTAClick} size="sm">
              시작하기
            </Button>
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex flex-col gap-4 pt-8">
              <div className="flex items-center gap-2 pb-4">
                <Sparkles className="h-6 w-6 text-indigo-600" />
                <span className="text-lg font-bold text-slate-900">
                  Saju피아
                </span>
              </div>
              <nav className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleScroll(link.href)}
                    className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
              <div className="mt-4 pt-4 border-t border-slate-200">
                {isLoading ? (
                  <Button variant="outline" className="w-full" disabled>
                    로딩 중...
                  </Button>
                ) : isAuthenticated ? (
                  <Button onClick={handleCTAClick} className="w-full">
                    대시보드로 이동
                  </Button>
                ) : (
                  <Button onClick={handleCTAClick} className="w-full">
                    시작하기
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
