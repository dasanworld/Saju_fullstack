"use client";

import { type ReactNode } from "react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { GlobalNav } from "@/components/layout/global-nav";
import { NavFooter } from "@/components/layout/nav-footer";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background">
        <GlobalNav />
        <NavFooter />
      </aside>
      <main className="flex-1 pl-64">
        {children}
      </main>
    </div>
  );
}
