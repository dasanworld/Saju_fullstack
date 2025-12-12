export const authErrorCodes = {
  EMAIL_MISSING: "EMAIL_MISSING",
  USER_CREATE_FAILED: "USER_CREATE_FAILED",
  SUB_CREATE_FAILED: "SUB_CREATE_FAILED",
  USER_DELETE_FAILED: "USER_DELETE_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AuthErrorCode =
  (typeof authErrorCodes)[keyof typeof authErrorCodes];
