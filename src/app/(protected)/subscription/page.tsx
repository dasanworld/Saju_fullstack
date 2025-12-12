"use client";

import { useSubscription } from "@/features/subscription/hooks/useSubscription";
import { CurrentSubscriptionCard } from "@/features/subscription/components/current-subscription-card";
import { UpgradePromptCard } from "@/features/subscription/components/upgrade-prompt-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
  const { data: subscription, isLoading, isError, refetch } = useSubscription();

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
        <p className="mt-2 text-gray-600">
          현재 구독 상태를 확인하고 관리할 수 있습니다.
        </p>
        <div className="mt-8 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !subscription) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            구독 정보를 불러올 수 없습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  const isFree = subscription.plan === "free";

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">구독 관리</h1>
      <p className="mt-2 text-gray-600">
        현재 구독 상태를 확인하고 관리할 수 있습니다.
      </p>

      <div className="mt-8 space-y-6">
        <CurrentSubscriptionCard subscription={subscription} />
        {isFree && <UpgradePromptCard />}
      </div>
    </div>
  );
}
