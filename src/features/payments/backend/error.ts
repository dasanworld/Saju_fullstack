export const paymentsErrorCodes = {
  PAYMENT_CONFIRMATION_FAILED: "PAYMENT_CONFIRMATION_FAILED",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  INVALID_ORDER: "INVALID_ORDER",
  TOSS_API_ERROR: "TOSS_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type PaymentsErrorCode =
  (typeof paymentsErrorCodes)[keyof typeof paymentsErrorCodes];
