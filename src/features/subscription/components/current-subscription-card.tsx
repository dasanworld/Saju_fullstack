"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { useReactivateSubscription } from "../hooks/useReactivateSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { CancelConfirmModal } from "./cancel-confirm-modal";
import type { SubscriptionStatusResponse } from "../lib/dto";

interface CurrentSubscriptionCardProps {
  subscription: SubscriptionStatusResponse;
}

export function CurrentSubscriptionCard({ subscription }: CurrentSubscriptionCardProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const { toast } = useToast();
  const reactivateSubscription = useReactivateSubscription();
  const queryClient = useQueryClient();

  const isFree = subscription.plan === "free";
  const isPro = subscription.plan === "pro";
  const isCancelScheduled = subscription.cancel_at_period_end;

  const maxTests = isPro ? 10 : 3;
  const modelName = isPro ? "Gemini 2.5 Pro" : "Gemini 2.5 Flash";

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivateSubscription.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "구독 취소가 철회되었습니다",
        description: "다음 결제일에 정상적으로 자동 갱신됩니다.",
      });
    } catch (error) {
      toast({
        title: "철회에 실패했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  if (isFree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Free 플랜
            <Badge variant="outline">무료</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">잔여 횟수</p>
            <p className="text-2xl font-bold">
              {subscription.remaining_tests}/{maxTests}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">사용 모델</p>
            <p className="font-medium">{modelName}</p>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold">혜택</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ 가입 즉시 3회 무료 검사</li>
              <li>✓ Gemini 2.5 Flash 모델 사용</li>
              <li>✓ 검사 내역 영구 보관</li>
              <li>✓ 마크다운 형식 분석 결과</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPro && !isCancelScheduled) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pro 플랜
              <Badge variant="default">활성</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">잔여 횟수</p>
              <p className="text-2xl font-bold">
                {subscription.remaining_tests}/{maxTests}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">다음 결제일</p>
              <p className="font-medium">
                {subscription.next_billing_date
                  ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">사용 모델</p>
              <p className="font-medium">{modelName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 정보</p>
              <p className="font-medium">월 3,900원 자동 결제</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full"
            >
              구독 취소
            </Button>
          </CardFooter>
        </Card>
        <CancelConfirmModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
        />
      </>
    );
  }

  if (isPro && isCancelScheduled) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pro 플랜
            <Badge variant="destructive">취소 예정</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              ⚠️ {subscription.next_billing_date
                ? format(parseISO(subscription.next_billing_date), "yyyy년 MM월 dd일")
                : "다음 결제일"}에 구독이 종료됩니다
            </AlertDescription>
          </Alert>

          <div>
            <p className="text-sm text-muted-foreground">
              잔여 횟수 (종료일까지 사용 가능)
            </p>
            <p className="text-2xl font-bold">
              {subscription.remaining_tests}/{maxTests}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">사용 모델</p>
            <p className="font-medium">{modelName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">안내</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              <li>• 종료일까지 Pro 서비스를 계속 이용하실 수 있습니다</li>
              <li>• 다음 결제가 진행되지 않습니다</li>
              <li>• 종료 후 Free 플랜으로 전환됩니다</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleReactivate}
            disabled={isReactivating}
            className="w-full"
          >
            {isReactivating ? "처리 중..." : "취소 철회"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
