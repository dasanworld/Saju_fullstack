import { z } from "zod";

export const clerkWebhookSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user.created"),
    data: z.object({
      id: z.string(),
      email_addresses: z
        .array(
          z.object({
            email_address: z.string().email(),
          })
        )
        .min(1),
    }),
  }),
  z.object({
    type: z.literal("user.deleted"),
    data: z.object({
      id: z.string(),
    }),
  }),
]);

export type ClerkWebhookPayload = z.infer<typeof clerkWebhookSchema>;
export type ClerkUserCreated = Extract<
  ClerkWebhookPayload,
  { type: "user.created" }
>["data"];
export type ClerkUserDeleted = Extract<
  ClerkWebhookPayload,
  { type: "user.deleted" }
>["data"];
