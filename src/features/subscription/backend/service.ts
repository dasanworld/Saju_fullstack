import type { AppContext } from "@/backend/hono/context";
import { success, failure } from "@/backend/http/response";
import { chargeTossPayment, deleteTossBillingKey } from "@/lib/toss/client";
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionStatusResponse,
  CancelSubscriptionResponse,
  ReactivateSubscriptionResponse,
} from "./schema";
import { subscriptionErrorCodes } from "./error";
import type { SupabaseClient } from "@supabase/supabase-js";

const PRO_PRICE = 3900;

export const getSubscriptionStatus = async (
  supabase: SupabaseClient,
  userId: string
) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan, remaining_tests, billing_key, next_billing_date, cancel_at_period_end")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return failure(
        404,
        subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND,
        "구독 정보를 찾을 수 없습니다"
      );
    }

    const response: SubscriptionStatusResponse = {
      plan: data.plan,
      remaining_tests: data.remaining_tests,
      billing_key: data.billing_key,
      next_billing_date: data.next_billing_date,
      cancel_at_period_end: data.cancel_at_period_end,
    };

    return success(response);
  } catch (error) {
    return failure(500, subscriptionErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const createProSubscription = async (
  c: AppContext,
  userId: string,
  userEmail: string,
  input: CreateSubscriptionRequest
) => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      return failure(
        404,
        subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND,
        "구독 정보를 찾을 수 없습니다"
      );
    }

    if (subscription.plan === "pro") {
      return failure(
        409,
        subscriptionErrorCodes.ALREADY_PRO,
        "이미 Pro 구독 중입니다"
      );
    }

    const paymentResult = await chargeTossPayment({
      billing_key: input.billing_key,
      amount: PRO_PRICE,
      customer_email: userEmail,
    });

    if (!paymentResult.success) {
      logger.error("Payment failed", paymentResult.error);
      return failure(
        500,
        subscriptionErrorCodes.PAYMENT_FAILED,
        paymentResult.error || "결제 실패"
      );
    }

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        plan: "pro",
        billing_key: input.billing_key,
        next_billing_date: nextBillingDate.toISOString().split("T")[0],
        remaining_tests: 10,
        cancel_at_period_end: false,
      })
      .eq("user_id", userId);

    if (updateError) {
      logger.error("Subscription update failed", updateError);
      return failure(
        500,
        subscriptionErrorCodes.INTERNAL_ERROR,
        "구독 업데이트 실패"
      );
    }

    logger.info("Pro subscription created", { user_id: userId });

    const response: CreateSubscriptionResponse = {
      message: "Pro 구독이 시작되었습니다",
    };

    return success(response);
  } catch (error) {
    logger.error("Unexpected error", error);
    return failure(500, subscriptionErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const cancelSubscription = async (
  supabase: SupabaseClient,
  userId: string
) => {
  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("plan, cancel_at_period_end")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      return failure(
        404,
        subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND,
        "구독 정보를 찾을 수 없습니다"
      );
    }

    if (subscription.plan !== "pro") {
      return failure(
        400,
        subscriptionErrorCodes.NOT_PRO,
        "Pro 구독이 아닙니다"
      );
    }

    if (subscription.cancel_at_period_end) {
      return failure(
        409,
        subscriptionErrorCodes.ALREADY_CANCELLED,
        "이미 취소 예약되었습니다"
      );
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("user_id", userId);

    if (updateError) {
      return failure(
        500,
        subscriptionErrorCodes.INTERNAL_ERROR,
        "구독 취소 실패"
      );
    }

    const response: CancelSubscriptionResponse = {
      message: "구독 취소가 예약되었습니다",
    };

    return success(response);
  } catch (error) {
    return failure(500, subscriptionErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const reactivateSubscription = async (
  supabase: SupabaseClient,
  userId: string
) => {
  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("plan, cancel_at_period_end, next_billing_date")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      return failure(
        404,
        subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND,
        "구독 정보를 찾을 수 없습니다"
      );
    }

    if (!subscription.cancel_at_period_end) {
      return failure(
        400,
        subscriptionErrorCodes.NOT_CANCELLED,
        "취소 예약 상태가 아닙니다"
      );
    }

    if (
      subscription.next_billing_date &&
      new Date(subscription.next_billing_date) <= new Date()
    ) {
      return failure(
        400,
        subscriptionErrorCodes.PERIOD_EXPIRED,
        "구독 기간이 만료되어 철회할 수 없습니다"
      );
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: false })
      .eq("user_id", userId);

    if (updateError) {
      return failure(
        500,
        subscriptionErrorCodes.INTERNAL_ERROR,
        "철회 실패"
      );
    }

    const response: ReactivateSubscriptionResponse = {
      message: "구독 취소가 철회되었습니다",
    };

    return success(response);
  } catch (error) {
    return failure(500, subscriptionErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};
