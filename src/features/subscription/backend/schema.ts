import { z } from "zod";

export const createSubscriptionRequestSchema = z.object({
  billing_key: z.string().min(1),
});

export const subscriptionStatusResponseSchema = z.object({
  plan: z.enum(["free", "pro"]),
  remaining_tests: z.number(),
  billing_key: z.string().nullable(),
  next_billing_date: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
});

export const createSubscriptionResponseSchema = z.object({
  message: z.string(),
});

export const cancelSubscriptionResponseSchema = z.object({
  message: z.string(),
});

export const reactivateSubscriptionResponseSchema = z.object({
  message: z.string(),
});

export type CreateSubscriptionRequest = z.infer<
  typeof createSubscriptionRequestSchema
>;
export type SubscriptionStatusResponse = z.infer<
  typeof subscriptionStatusResponseSchema
>;
export type CreateSubscriptionResponse = z.infer<
  typeof createSubscriptionResponseSchema
>;
export type CancelSubscriptionResponse = z.infer<
  typeof cancelSubscriptionResponseSchema
>;
export type ReactivateSubscriptionResponse = z.infer<
  typeof reactivateSubscriptionResponseSchema
>;
