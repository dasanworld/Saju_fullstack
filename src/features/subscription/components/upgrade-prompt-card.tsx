"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "./payment-dialog";
import { useAuth } from "@clerk/nextjs";

export function UpgradePromptCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handlePaymentSuccess = (billingKey: string) => {
    setIsDialogOpen(false);
    toast({
      title: "결제가 진행 중입니다",
      description: "결제 완료 후 구독이 활성화됩니다.",
    });
  };

  const handlePaymentError = (error: Error) => {
    toast({
      title: "결제에 실패했습니다",
      description: error.message || "결제 수단을 확인해주세요.",
      variant: "destructive",
    });
  };

  const customerKey = userId ? `customer_${userId}` : `customer_${Date.now()}`;

  return (
    <>
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
            onClick={handleOpenDialog}
            className="w-full"
          >
            지금 시작하기
          </Button>
        </CardFooter>
      </Card>

      <PaymentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customerKey={customerKey}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  );
}
