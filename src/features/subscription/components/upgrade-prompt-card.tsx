"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { requestBillingKey } from "@/lib/toss/sdk";
import { useCreateSubscription } from "../hooks/useCreateSubscription";
import { useQueryClient } from "@tanstack/react-query";

export function UpgradePromptCard() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { toast } = useToast();
  const createSubscription = useCreateSubscription();
  const queryClient = useQueryClient();

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const billingKeyResult = await requestBillingKey({
        customerKey: `customer_${Date.now()}`,
        successUrl: `${window.location.origin}/subscription?status=success`,
        failUrl: `${window.location.origin}/subscription?status=fail`,
      });

      await createSubscription.mutateAsync({
        billing_key: billingKeyResult.billingKey
      });

      await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });

      toast({
        title: "Pro 구독이 시작되었습니다!",
        description: "이제 월 10회 고품질 검사를 이용하실 수 있습니다.",
      });
    } catch (error) {
      toast({
        title: "결제에 실패했습니다",
        description: "결제 수단을 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">
          Pro 플랜으로 업그레이드하세요!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-blue-800">
          더 많은 검사와 고품질 분석을 경험해보세요.
        </p>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>✨ 월 10회 고품질 검사</li>
          <li>✨ Gemini 2.5 Pro 모델 사용</li>
          <li>✨ 더 상세한 분석 결과</li>
          <li>✨ 월 3,900원 자동 결제</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className="w-full"
        >
          {isUpgrading ? "처리 중..." : "지금 시작하기"}
        </Button>
      </CardFooter>
    </Card>
  );
}
