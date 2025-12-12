import { z } from "zod";

export const confirmPaymentRequestSchema = z.object({
  paymentKey: z.string().min(1, "paymentKey is required"),
  orderId: z.string().min(1, "orderId is required"),
  amount: z.number().positive("amount must be positive"),
});

export type ConfirmPaymentRequest = z.infer<typeof confirmPaymentRequestSchema>;

export const confirmPaymentResponseSchema = z.object({
  success: z.boolean(),
  paymentKey: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
});

export type ConfirmPaymentResponse = z.infer<typeof confirmPaymentResponseSchema>;
