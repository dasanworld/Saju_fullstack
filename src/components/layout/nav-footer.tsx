"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useSubscription } from "@/features/subscription/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut, Settings, User } from "lucide-react";

export function NavFooter() {
  const { user } = useCurrentUser();
  const { data: subscription, isLoading } = useSubscription();
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();

  const handleLogout = () => {
    signOut({ redirectUrl: "/" });
  };

  const handleManageAccount = () => {
    openUserProfile();
  };

  if (isLoading) {
    return (
      <div className="mt-auto p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!user || !subscription) {
    return null;
  }

  const maxTests = subscription.plan === "pro" ? 10 : 3;

  return (
    <div className="mt-auto">
      <div className="p-4 border-t space-y-2">
        <div className="text-sm font-medium">
          잔여 횟수: {subscription.remaining_tests}/{maxTests}
        </div>
        <Button
          variant={subscription.plan === "free" ? "outline" : "default"}
          size="sm"
          className="w-full"
          onClick={() => router.push("/subscription")}
        >
          {subscription.plan === "free" ? "Pro로 업그레이드" : "구독 관리"}
        </Button>
      </div>

      <div className="p-4 border-t space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
          <User className="w-4 h-4" />
          <span className="truncate flex-1">{user.email}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleManageAccount}
        >
          <Settings className="w-4 h-4 mr-2" />
          계정 관리
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
