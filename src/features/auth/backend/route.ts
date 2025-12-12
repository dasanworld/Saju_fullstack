import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/backend/hono/context";
import { respond } from "@/backend/http/response";
import { clerkWebhookSchema } from "./schema";
import { handleUserCreated, handleUserDeleted } from "./service";

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post(
    "/api/auth/webhook",
    zValidator("json", clerkWebhookSchema) as never,
    async (c) => {
      const body = await c.req.json();
      const parsed = clerkWebhookSchema.parse(body);

      switch (parsed.type) {
        case "user.created":
          return respond(c, await handleUserCreated(c, parsed.data));

        case "user.deleted":
          return respond(c, await handleUserDeleted(c, parsed.data));

        default:
          return c.json({ message: "Webhook received" }, 200);
      }
    }
  );
};
