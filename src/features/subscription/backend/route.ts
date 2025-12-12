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
import { getOrCreateUser } from "@/features/auth/backend/helpers";

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
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    return respond(c, await getSubscriptionStatus(supabase, userResult.user.id));
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
      const logger = c.get("logger");
      const userResult = await getOrCreateUser(supabase, logger, auth.userId);

      if (!userResult.success) {
        return respond(
          c,
          failure(404, subscriptionErrorCodes.INTERNAL_ERROR, userResult.error)
        );
      }

      const body = await c.req.json();
      const parsed = createSubscriptionRequestSchema.parse(body);

      return respond(
        c,
        await createProSubscription(c, userResult.user.id, userResult.user.email, parsed)
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
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    return respond(c, await cancelSubscription(supabase, userResult.user.id));
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
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, subscriptionErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    return respond(c, await reactivateSubscription(supabase, userResult.user.id));
  });
};
