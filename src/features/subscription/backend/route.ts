import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import type { AppEnv } from "@/backend/hono/context";
import { respond, failure } from "@/backend/http/response";
import { createSubscriptionRequestSchema } from "./schema";
import {
  getSubscriptionStatus,
  createProSubscription,
  cancelSubscription,
  reactivateSubscription,
} from "./service";
import { subscriptionErrorCodes } from "./error";

export const registerSubscriptionRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/subscription/status", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, subscriptionErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (!dbUser) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
      );
    }

    return respond(c, await getSubscriptionStatus(supabase, dbUser.id));
  });

  app.post(
    "/api/subscription/create",
    zValidator("json", createSubscriptionRequestSchema) as never,
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return respond(
          c,
          failure(401, subscriptionErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
        );
      }

      const supabase = c.get("supabase");
      const { data: dbUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("clerk_user_id", auth.userId)
        .single();

      if (!dbUser) {
        return respond(
          c,
          failure(404, subscriptionErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
        );
      }

      const body = await c.req.json();
      const parsed = createSubscriptionRequestSchema.parse(body);

      return respond(
        c,
        await createProSubscription(c, dbUser.id, dbUser.email, parsed)
      );
    }
  );

  app.post("/api/subscription/cancel", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, subscriptionErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (!dbUser) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
      );
    }

    return respond(c, await cancelSubscription(supabase, dbUser.id));
  });

  app.post("/api/subscription/reactivate", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, subscriptionErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (!dbUser) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
      );
    }

    return respond(c, await reactivateSubscription(supabase, dbUser.id));
  });
};
