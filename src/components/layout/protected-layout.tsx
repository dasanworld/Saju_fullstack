"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { GlobalNav } from "./global-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex">
      <GlobalNav />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  );
}
