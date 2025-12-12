import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLogger } from "@/backend/hono/context";

type DbUser = {
  id: string;
  email: string;
  clerk_user_id: string;
};

type GetOrCreateUserResult =
  | { success: true; user: DbUser; error?: never }
  | { success: false; user?: never; error: string };

export const getOrCreateUser = async (
  supabase: SupabaseClient,
  logger: AppLogger,
  clerkUserId: string
): Promise<GetOrCreateUserResult> => {
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, email, clerk_user_id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (existingUser) {
    return { success: true, user: existingUser };
  }

  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      logger.error("Clerk user has no email", { clerkUserId });
      return { success: false, error: "이메일이 없습니다" };
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_user_id: clerkUserId,
        email,
      })
      .select("id, email, clerk_user_id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raceUser } = await supabase
          .from("users")
          .select("id, email, clerk_user_id")
          .eq("clerk_user_id", clerkUserId)
          .single();

        if (raceUser) {
          return { success: true, user: raceUser };
        }
      }

      logger.error("User creation failed", insertError);
      return { success: false, error: "사용자 생성 실패" };
    }

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: newUser.id,
      plan: "free",
      remaining_tests: 3,
    });

    if (subError) {
      logger.warn("Subscription creation failed", subError);
    }

    logger.info("User auto-created", { user_id: newUser.id, clerkUserId });

    return { success: true, user: newUser };
  } catch (error) {
    logger.error("Failed to fetch Clerk user", error);
    return { success: false, error: "사용자 정보를 가져올 수 없습니다" };
  }
};
