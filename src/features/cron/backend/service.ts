import type { AppContext } from "@/backend/hono/context";
import { success, failure } from "@/backend/http/response";
import { chargeTossPayment, deleteTossBillingKey } from "@/lib/toss/client";
import { cronErrorCodes } from "./error";

const PRO_PRICE = 3900;

export const processDailyBilling = async (c: AppContext) => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: subscriptions, error: queryError } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        user_id,
        billing_key,
        cancel_at_period_end,
        users!inner (
          email
        )
      `
      )
      .eq("next_billing_date", today)
      .eq("plan", "pro");

    if (queryError) {
      logger.error("Failed to query subscriptions", queryError);
      return failure(500, cronErrorCodes.INTERNAL_ERROR, "구독 조회 실패");
    }

    if (!subscriptions || subscriptions.length === 0) {
      logger.info("No subscriptions to process today");
      return success({ processed: 0, success: 0, failed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const subscription of subscriptions) {
      const userData = Array.isArray(subscription.users)
        ? subscription.users[0]
        : subscription.users;

      const userEmail =
        userData && typeof userData === "object" && "email" in userData
          ? (userData.email as string)
          : "";

      if (subscription.cancel_at_period_end) {
        if (subscription.billing_key) {
          await deleteTossBillingKey(subscription.billing_key);
        }

        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            billing_key: null,
            next_billing_date: null,
            remaining_tests: 0,
            cancel_at_period_end: false,
          })
          .eq("id", subscription.id);

        logger.info("Subscription expired", { subscription_id: subscription.id });
        continue;
      }

      if (!subscription.billing_key) {
        failCount++;
        continue;
      }

      const paymentResult = await chargeTossPayment({
        billing_key: subscription.billing_key,
        amount: PRO_PRICE,
        customer_email: userEmail,
      });

      if (paymentResult.success) {
        const nextBillingDate = new Date(today);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await supabase
          .from("subscriptions")
          .update({
            remaining_tests: 10,
            next_billing_date: nextBillingDate.toISOString().split("T")[0],
          })
          .eq("id", subscription.id);

        logger.info("Payment success", { subscription_id: subscription.id });
        successCount++;
      } else {
        await deleteTossBillingKey(subscription.billing_key);

        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            billing_key: null,
            next_billing_date: null,
            remaining_tests: 0,
          })
          .eq("id", subscription.id);

        logger.error("Payment failed", {
          subscription_id: subscription.id,
          error: paymentResult.error,
        });
        failCount++;
      }
    }

    logger.info("Daily billing completed", {
      total: subscriptions.length,
      success: successCount,
      failed: failCount,
    });

    return success({
      processed: subscriptions.length,
      success: successCount,
      failed: failCount,
    });
  } catch (error) {
    logger.error("Unexpected error in daily billing", error);
    return failure(500, cronErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};
