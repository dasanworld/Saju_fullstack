import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import type { AppEnv } from "@/backend/hono/context";
import { respond, failure } from "@/backend/http/response";
import { confirmPaymentRequestSchema } from "./schema";
import { confirmPayment } from "./service";
import { paymentsErrorCodes } from "./error";
import { getOrCreateUser } from "@/features/auth/backend/helpers";

export const registerPaymentsRoutes = (app: Hono<AppEnv>) => {
  app.post(
    "/api/payments/confirm",
    zValidator("json", confirmPaymentRequestSchema) as never,
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return respond(
          c,
          failure(401, paymentsErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
        );
      }

      const supabase = c.get("supabase");
      const logger = c.get("logger");
      const userResult = await getOrCreateUser(supabase, logger, auth.userId);

      if (!userResult.success) {
        return respond(
          c,
          failure(404, paymentsErrorCodes.INTERNAL_ERROR, userResult.error)
        );
      }

      const body = await c.req.json();
      const parsed = confirmPaymentRequestSchema.parse(body);

      return respond(
        c,
        await confirmPayment(
          supabase,
          userResult.user.id,
          parsed.paymentKey,
          parsed.orderId,
          parsed.amount
        )
      );
    }
  );
};
