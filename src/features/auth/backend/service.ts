import type { AppContext } from "@/backend/hono/context";
import { success, failure } from "@/backend/http/response";
import type { ClerkUserCreated, ClerkUserDeleted } from "./schema";
import { authErrorCodes } from "./error";
import { deleteTossBillingKey } from "@/lib/toss/client";

export const handleUserCreated = async (
  c: AppContext,
  data: ClerkUserCreated
): Promise<ReturnType<typeof success> | ReturnType<typeof failure>> => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  const email = (data as any).email_addresses[0]?.email_address;

  if (!email) {
    return failure(400, authErrorCodes.EMAIL_MISSING, "이메일이 없습니다.");
  }

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        clerk_user_id: (data as any).id,
        email,
      })
      .select()
      .single();

    if (userError) {
      logger.error("User creation failed", userError);
      return failure(500, authErrorCodes.USER_CREATE_FAILED, "사용자 생성 실패");
    }

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan: "free",
      remaining_tests: 3,
    });

    if (subError) {
      logger.error("Subscription creation failed", subError);
      await supabase.from("users").delete().eq("id", user.id);
      return failure(500, authErrorCodes.SUB_CREATE_FAILED, "구독 생성 실패");
    }

    logger.info("User created successfully", { user_id: user.id });

    return success({ user_id: user.id });
  } catch (error) {
    logger.error("Unexpected error", error);
    return failure(500, authErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const handleUserDeleted = async (
  c: AppContext,
  data: ClerkUserDeleted
): Promise<ReturnType<typeof success> | ReturnType<typeof failure>> => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  try {
    const { data: user } = await supabase
      .from("users")
      .select(
        `
        id,
        subscriptions (
          billing_key
        )
      `
      )
      .eq("clerk_user_id", (data as any).id)
      .single();

    const subscriptionData = user?.subscriptions as unknown;
    const billingKeyData = Array.isArray(subscriptionData)
      ? subscriptionData[0]
      : subscriptionData;

    if (
      billingKeyData &&
      typeof billingKeyData === "object" &&
      "billing_key" in billingKeyData &&
      billingKeyData.billing_key
    ) {
      const deleted = await deleteTossBillingKey(
        billingKeyData.billing_key as string
      );
      if (!deleted) {
        logger.warn("Billing key deletion failed (continuing)", {
          user_id: user?.id,
        });
      }
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("clerk_user_id", (data as any).id);

    if (error) {
      logger.error("User deletion failed", error);
      return failure(500, authErrorCodes.USER_DELETE_FAILED, "사용자 삭제 실패");
    }

    logger.info("User deleted successfully", { clerk_user_id: (data as any).id });

    return success({ message: "User deleted" });
  } catch (error) {
    logger.error("Unexpected error", error);
    return failure(500, authErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};
