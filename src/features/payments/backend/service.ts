import type { SupabaseClient } from "@supabase/supabase-js";
import type { HandlerResult } from "@/backend/http/response";
import { success, failure } from "@/backend/http/response";
import { paymentsErrorCodes, type PaymentsErrorCode } from "./error";
import type { ConfirmPaymentResponse } from "./schema";
import { addMonths, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const SUBSCRIPTION_AMOUNT = 3900;
const PRO_MONTHLY_TESTS = 10;
const TIMEZONE = "Asia/Seoul";

type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  requestedAt: string;
  approvedAt: string;
};

export async function confirmPayment(
  supabase: SupabaseClient,
  userId: string,
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<HandlerResult<ConfirmPaymentResponse, PaymentsErrorCode>> {
  // 1. 금액 검증
  if (amount !== SUBSCRIPTION_AMOUNT) {
    return failure(
      400,
      paymentsErrorCodes.AMOUNT_MISMATCH,
      `결제 금액이 일치하지 않습니다. 예상: ${SUBSCRIPTION_AMOUNT}원, 받은: ${amount}원`
    );
  }

  // 2. 토스페이먼츠 결제 승인 API 호출
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return failure(
      500,
      paymentsErrorCodes.INTERNAL_ERROR,
      "결제 설정이 올바르지 않습니다"
    );
  }

  const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

  try {
    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    if (!tossResponse.ok) {
      const errorData = await tossResponse.json();
      return failure(
        400,
        paymentsErrorCodes.TOSS_API_ERROR,
        errorData.message || "결제 승인에 실패했습니다"
      );
    }

    const paymentData: TossPaymentResponse = await tossResponse.json();

    // 3. 결제 내역 저장
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      payment_key: paymentKey,
      order_id: orderId,
      amount,
      status: paymentData.status,
      method: paymentData.method,
      approved_at: paymentData.approvedAt,
    });

    if (paymentError) {
      console.error("Failed to save payment record:", paymentError);
      // 결제는 성공했지만 기록 저장 실패 - 계속 진행
    }

    // 4. 구독 활성화 (기존 subscriptions 테이블 구조 사용)
    const now = toZonedTime(new Date(), TIMEZONE);
    const nextBillingDate = addMonths(now, 1);

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: "pro",
          status: "active",
          remaining_tests: PRO_MONTHLY_TESTS,
          next_billing_date: format(nextBillingDate, "yyyy-MM-dd"),
          current_period_start: now.toISOString(),
          current_period_end: nextBillingDate.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (subscriptionError) {
      console.error("Failed to update subscription:", subscriptionError);
      return failure(
        500,
        paymentsErrorCodes.INTERNAL_ERROR,
        "구독 활성화에 실패했습니다"
      );
    }

    return success<ConfirmPaymentResponse>({
      success: true,
      paymentKey: paymentData.paymentKey,
      orderId: paymentData.orderId,
      status: paymentData.status,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return failure(
      500,
      paymentsErrorCodes.INTERNAL_ERROR,
      "결제 처리 중 오류가 발생했습니다"
    );
  }
}
