import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { handleUserCreated, handleUserDeleted } from "./service";
import { authErrorCodes } from "./error";
import { deleteTossBillingKey } from "@/lib/toss/client";
import type { ClerkUserCreated, ClerkUserDeleted } from "./schema";

vi.mock("@/lib/toss/client", () => ({
  deleteTossBillingKey: vi.fn(),
}));

const createMockSupabase = (overrides: {
  insertUserData?: unknown;
  insertUserError?: unknown;
  insertSubError?: unknown;
  selectData?: unknown;
  selectError?: unknown;
  deleteError?: unknown;
}) => {
  const {
    insertUserData = null,
    insertUserError = null,
    insertSubError = null,
    selectData = null,
    selectError = null,
    deleteError = null,
  } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: insertUserData,
                error: insertUserError,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: selectData,
                error: selectError,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: deleteError,
            }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          insert: vi.fn().mockResolvedValue({
            error: insertSubError,
          }),
        };
      }
      return {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
      };
    }),
  };
};

const createMockContext = (supabase: unknown) => ({
  get: vi.fn((key: string) => {
    if (key === "supabase") return supabase;
    if (key === "logger") {
      return {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };
    }
    return null;
  }),
});

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleUserCreated", () => {
    it("should create user and subscription successfully", async () => {
      // Given
      const mockUserData = { id: "user-123", clerk_user_id: "clerk-123", email: "test@example.com" };
      const mockSupabase = createMockSupabase({
        insertUserData: mockUserData,
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserCreated = {
        id: "clerk-123",
        email_addresses: [{ email_address: "test@example.com" }],
      };

      // When
      const result = await handleUserCreated(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ user_id: "user-123" });
      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockSupabase.from).toHaveBeenCalledWith("subscriptions");
    });

    it("should return 400 when email is missing", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      const mockContext = createMockContext(mockSupabase);
      const clerkData = {
        id: "clerk-123",
        email_addresses: [],
      } as any;

      // When
      const result = await handleUserCreated(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(authErrorCodes.EMAIL_MISSING);
      expect(result.error?.message).toBe("이메일이 없습니다.");
    });

    it("should return 500 when user creation fails", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        insertUserData: null,
        insertUserError: { message: "Database error" },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserCreated = {
        id: "clerk-123",
        email_addresses: [{ email_address: "test@example.com" }],
      };

      // When
      const result = await handleUserCreated(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(authErrorCodes.USER_CREATE_FAILED);
      expect(result.error?.message).toBe("사용자 생성 실패");
    });

    it("should rollback user when subscription creation fails", async () => {
      // Given
      const mockUserData = { id: "user-123", clerk_user_id: "clerk-123", email: "test@example.com" };
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "users") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUserData,
                    error: null,
                  }),
                }),
              }),
              delete: deleteMock,
            };
          }
          if (table === "subscriptions") {
            return {
              insert: vi.fn().mockResolvedValue({
                error: { message: "Subscription error" },
              }),
            };
          }
          return {};
        }),
      };
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserCreated = {
        id: "clerk-123",
        email_addresses: [{ email_address: "test@example.com" }],
      };

      // When
      const result = await handleUserCreated(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(authErrorCodes.SUB_CREATE_FAILED);
      expect(result.error?.message).toBe("구독 생성 실패");
      expect(deleteMock).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      // Given
      const mockSupabase = {
        from: vi.fn(() => {
          throw new Error("Unexpected error");
        }),
      };
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserCreated = {
        id: "clerk-123",
        email_addresses: [{ email_address: "test@example.com" }],
      };

      // When
      const result = await handleUserCreated(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(authErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("서버 오류");
    });
  });

  describe("handleUserDeleted", () => {
    it("should delete user successfully without billing key", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: {
          id: "user-123",
          subscriptions: null,
        },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("User deleted");
      expect(deleteTossBillingKey).not.toHaveBeenCalled();
    });

    it("should delete user and billing key when billing_key exists (array format)", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: {
          id: "user-123",
          subscriptions: [{ billing_key: "billing_key_123" }],
        },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };
      (deleteTossBillingKey as Mock).mockResolvedValue(true);

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("User deleted");
      expect(deleteTossBillingKey).toHaveBeenCalledWith("billing_key_123");
    });

    it("should delete user and billing key when billing_key exists (object format)", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: {
          id: "user-123",
          subscriptions: { billing_key: "billing_key_456" },
        },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };
      (deleteTossBillingKey as Mock).mockResolvedValue(true);

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("User deleted");
      expect(deleteTossBillingKey).toHaveBeenCalledWith("billing_key_456");
    });

    it("should continue deletion when billing key deletion fails", async () => {
      // Given
      const warnMock = vi.fn();
      const mockSupabase = createMockSupabase({
        selectData: {
          id: "user-123",
          subscriptions: [{ billing_key: "billing_key_123" }],
        },
      });
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "supabase") return mockSupabase;
          if (key === "logger") {
            return {
              info: vi.fn(),
              error: vi.fn(),
              warn: warnMock,
              debug: vi.fn(),
            };
          }
          return null;
        }),
      };
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };
      (deleteTossBillingKey as Mock).mockResolvedValue(false);

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("User deleted");
      expect(warnMock).toHaveBeenCalled();
    });

    it("should return 500 when user deletion fails", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { id: "user-123", subscriptions: null },
        deleteError: { message: "Delete failed" },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(authErrorCodes.USER_DELETE_FAILED);
      expect(result.error?.message).toBe("사용자 삭제 실패");
    });

    it("should handle unexpected errors", async () => {
      // Given
      const mockSupabase = {
        from: vi.fn(() => {
          throw new Error("Unexpected error");
        }),
      };
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(authErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("서버 오류");
    });

    it("should handle user not found gracefully", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "User not found" },
      });
      const mockContext = createMockContext(mockSupabase);
      const clerkData: ClerkUserDeleted = {
        id: "clerk-123",
      };

      // When
      const result = await handleUserDeleted(mockContext as any, clerkData);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("User deleted");
      expect(deleteTossBillingKey).not.toHaveBeenCalled();
    });
  });
});
