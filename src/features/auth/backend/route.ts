import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/backend/hono/context";
import { respond } from "@/backend/http/response";
import {
  clerkWebhookSchema,
  type ClerkUserCreated,
  type ClerkUserDeleted,
} from "./schema";
import { handleUserCreated, handleUserDeleted } from "./service";

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post(
    "/api/auth/webhook",
    zValidator("json", clerkWebhookSchema) as never,
    async (c) => {
      const body = await c.req.json();
      const parsed = clerkWebhookSchema.parse(body);

      if (parsed.type === "user.created") {
        const userData: ClerkUserCreated = parsed.data as ClerkUserCreated;
        return respond(c, await handleUserCreated(c, userData));
      }

      if (parsed.type === "user.deleted") {
        const userData: ClerkUserDeleted = parsed.data as ClerkUserDeleted;
        return respond(c, await handleUserDeleted(c, userData));
      }

      return c.json({ message: "Webhook received" }, 200);
    }
  );
};
