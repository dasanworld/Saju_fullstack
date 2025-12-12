export const subscriptionErrorCodes = {
  SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND",
  ALREADY_PRO: "ALREADY_PRO",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  NOT_PRO: "NOT_PRO",
  ALREADY_CANCELLED: "ALREADY_CANCELLED",
  NOT_CANCELLED: "NOT_CANCELLED",
  PERIOD_EXPIRED: "PERIOD_EXPIRED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type SubscriptionErrorCode =
  (typeof subscriptionErrorCodes)[keyof typeof subscriptionErrorCodes];
