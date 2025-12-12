import type { Hono } from "hono";
import type { AppEnv } from "@/backend/hono/context";
import { respond, failure } from "@/backend/http/response";
import { processDailyBilling } from "./service";
import { cronErrorCodes } from "./error";

export const registerCronRoutes = (app: Hono<AppEnv>) => {
  app.post("/api/cron/daily-billing", async (c) => {
    const authHeader = c.req.header("Authorization");
    const config = c.get("config");

    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return respond(
        c,
        failure(401, cronErrorCodes.UNAUTHORIZED, "인증 실패")
      );
    }

    return respond(c, await processDailyBilling(c));
  });
};
