"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield, CheckCircle } from "lucide-react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerKey: string;
  onSuccess: (billingKey: string) => void;
  onError: (error: Error) => void;
};

const SUBSCRIPTION_AMOUNT = 3900;
const SUBSCRIPTION_ORDER_NAME = "사주포춘 Pro 월간 구독";

export function PaymentDialog({
  open,
  onOpenChange,
  customerKey,
  onError,
}: PaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not defined");
      }

      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 결제창 객체 생성 후 결제 요청
      const payment = tossPayments.payment({ customerKey });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: SUBSCRIPTION_AMOUNT,
        },
        orderId,
        orderName: SUBSCRIPTION_ORDER_NAME,
        successUrl: `${window.location.origin}/subscription/success`,
        failUrl: `${window.location.origin}/subscription/fail`,
      });
    } catch (error) {
      console.error("Payment request failed:", error);
      setIsProcessing(false);
      onError(error instanceof Error ? error : new Error("결제 요청 실패"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Pro 구독 결제</DialogTitle>
          <DialogDescription>
            월 {SUBSCRIPTION_AMOUNT.toLocaleString()}원으로 Pro 플랜의 모든 혜택을 이용하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 구독 혜택 안내 */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pro 플랜 혜택
            </h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                월 10회 고품질 검사
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                Gemini 2.5 Pro 모델 사용
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                더 상세한 분석 결과
              </li>
            </ul>
          </div>

          {/* 결제 금액 표시 */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">월 구독료</span>
              <span className="text-2xl font-bold text-gray-900">
                {SUBSCRIPTION_AMOUNT.toLocaleString()}원
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              매월 자동 결제됩니다. 언제든지 취소할 수 있습니다.
            </p>
          </div>

          {/* 안전 결제 안내 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>토스페이먼츠 안전결제</span>
          </div>
        </div>

        {/* 결제 버튼 */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              결제 페이지로 이동 중...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {SUBSCRIPTION_AMOUNT.toLocaleString()}원 결제하기
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
