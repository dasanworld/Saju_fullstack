"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle } from "lucide-react";

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  const handleGoToSubscription = () => {
    router.push("/subscription");
  };

  const handleRetry = () => {
    router.push("/subscription");
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-center">결제 실패</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage || "결제 처리 중 문제가 발생했습니다."}
              {errorCode && (
                <span className="block mt-1 text-xs opacity-70">
                  오류 코드: {errorCode}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-gray-600 text-center">
            결제 정보를 확인하시고 다시 시도해주세요.
            <br />
            문제가 계속되면 고객센터로 문의해주세요.
          </p>

          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              다시 시도하기
            </Button>
            <Button
              variant="outline"
              onClick={handleGoToSubscription}
              className="w-full"
            >
              구독 페이지로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
