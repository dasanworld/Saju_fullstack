export const cronErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type CronErrorCode = (typeof cronErrorCodes)[keyof typeof cronErrorCodes];
