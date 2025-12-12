"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useSubscription } from "@/features/subscription/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export function NavFooter() {
  const { user } = useCurrentUser();
  const { data: subscription, isLoading } = useSubscription();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
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
    <div className="p-4 border-t space-y-2">
      <div className="text-sm text-muted-foreground truncate">
        {user.email}
      </div>
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
  );
}
