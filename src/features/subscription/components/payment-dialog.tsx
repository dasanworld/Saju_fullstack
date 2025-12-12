"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  onSuccess,
  onError,
}: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const widgetsRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);

  const handleError = useCallback((error: Error) => {
    onError(error);
  }, [onError]);

  useEffect(() => {
    if (!open) {
      widgetsRef.current = null;
      initAttemptedRef.current = false;
      setIsReady(false);
      setIsLoading(true);
      return;
    }

    if (initAttemptedRef.current) {
      return;
    }

    const initPaymentWidget = async () => {
      initAttemptedRef.current = true;
      setIsLoading(true);

      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (!clientKey) {
          throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not defined");
        }

        // DOM이 렌더링될 때까지 대기
        await new Promise((resolve) => setTimeout(resolve, 300));

        // selector가 존재하는지 확인
        const paymentContainer = document.getElementById("payment-method-container");
        const agreementContainer = document.getElementById("agreement-container");

        if (!paymentContainer || !agreementContainer) {
          throw new Error("결제 위젯 컨테이너를 찾을 수 없습니다");
        }

        // V2 SDK 로드 (CDN)
        let TossPayments = (window as any).TossPayments;

        if (!TossPayments) {
          const existingScript = document.querySelector(
            'script[src="https://js.tosspayments.com/v2/standard"]'
          );

          if (!existingScript) {
            const script = document.createElement("script");
            script.src = "https://js.tosspayments.com/v2/standard";
            script.async = true;

            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load TossPayments SDK"));
              document.head.appendChild(script);
            });
          }

          // SDK 로드 대기
          await new Promise((resolve) => setTimeout(resolve, 500));
          TossPayments = (window as any).TossPayments;
        }

        if (!TossPayments) {
          throw new Error("TossPayments SDK not loaded");
        }

        console.log("TossPayments SDK loaded, initializing...");

        const tossPayments = TossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey });

        // 금액 설정 (렌더링 전 필수)
        await widgets.setAmount({
          currency: "KRW",
          value: SUBSCRIPTION_AMOUNT,
        });

        console.log("Amount set, rendering widgets...");

        // 결제 수단 및 약관 UI 렌더링
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#payment-method-container",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#agreement-container",
            variantKey: "AGREEMENT",
          }),
        ]);

        console.log("Widgets rendered successfully");

        widgetsRef.current = widgets;
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Payment widget initialization failed:", error);
        setIsLoading(false);
        handleError(error instanceof Error ? error : new Error("결제 위젯 초기화 실패"));
      }
    };

    initPaymentWidget();
  }, [open, customerKey, handleError]);

  const handlePayment = async () => {
    if (!widgetsRef.current) {
      onError(new Error("결제 위젯이 초기화되지 않았습니다."));
      return;
    }

    setIsProcessing(true);

    try {
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await widgetsRef.current.requestPayment({
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pro 구독 결제</DialogTitle>
          <DialogDescription>
            월 {SUBSCRIPTION_AMOUNT.toLocaleString()}원으로 Pro 플랜의 모든 혜택을 이용하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 구독 혜택 안내 */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Pro 플랜 혜택</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✨ 월 10회 고품질 검사</li>
              <li>✨ Gemini 2.5 Pro 모델 사용</li>
              <li>✨ 더 상세한 분석 결과</li>
            </ul>
          </div>

          {/* 결제 금액 표시 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">월 구독료</span>
              <span className="text-xl font-bold">
                {SUBSCRIPTION_AMOUNT.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">결제 위젯 로딩 중...</span>
            </div>
          )}

          {/* 결제 수단 선택 영역 */}
          <div
            id="payment-method-container"
            className={isLoading ? "hidden" : ""}
          />

          {/* 약관 동의 영역 */}
          <div
            id="agreement-container"
            className={isLoading ? "hidden" : "mt-4"}
          />
        </div>

        {/* 결제 버튼 */}
        <Button
          onClick={handlePayment}
          disabled={isLoading || isProcessing || !isReady}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              결제 진행 중...
            </>
          ) : isLoading ? (
            "로딩 중..."
          ) : (
            `${SUBSCRIPTION_AMOUNT.toLocaleString()}원 결제하기`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
