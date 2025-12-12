"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/remote/api-client";
import { useQueryClient } from "@tanstack/react-query";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setErrorMessage("결제 정보가 올바르지 않습니다.");
        setIsProcessing(false);
        return;
      }

      try {
        const response = await apiClient.post("/api/payments/confirm", {
          paymentKey,
          orderId,
          amount: Number(amount),
        });

        if (response.data.success) {
          setIsSuccess(true);
          await queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
          toast({
            title: "Pro 구독이 시작되었습니다!",
            description: "이제 월 10회 고품질 검사를 이용하실 수 있습니다.",
          });
        } else {
          setErrorMessage(response.data.error?.message || "결제 승인에 실패했습니다.");
        }
      } catch (error: any) {
        const message = error.response?.data?.error?.message || "결제 처리 중 오류가 발생했습니다.";
        setErrorMessage(message);
      } finally {
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount, queryClient, toast]);

  const handleGoToSubscription = () => {
    router.push("/subscription");
  };

  if (isProcessing) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-medium">결제를 확인하고 있습니다...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-600">결제 실패</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button onClick={handleGoToSubscription} className="w-full">
              구독 페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">결제 완료!</h2>
          <p className="text-gray-600 text-center mb-6">
            Pro 구독이 성공적으로 시작되었습니다.
            <br />
            이제 모든 프리미엄 기능을 이용하실 수 있습니다.
          </p>
          <div className="space-y-2 w-full">
            <Button onClick={handleGoToSubscription} className="w-full">
              구독 관리로 이동
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/saju")}
              className="w-full"
            >
              사주 분석 시작하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
