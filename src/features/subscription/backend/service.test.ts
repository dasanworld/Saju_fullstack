import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  getSubscriptionStatus,
  createProSubscription,
  cancelSubscription,
  reactivateSubscription,
} from "./service";
import { subscriptionErrorCodes } from "./error";
import { chargeTossPayment } from "@/lib/toss/client";

vi.mock("@/lib/toss/client", () => ({
  chargeTossPayment: vi.fn(),
  deleteTossBillingKey: vi.fn(),
}));

const createMockSupabase = (overrides: {
  selectData?: unknown;
  selectError?: unknown;
  updateError?: unknown;
}) => {
  const { selectData = null, selectError = null, updateError = null } = overrides;

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: selectData,
            error: selectError,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: updateError,
        }),
      }),
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

describe("Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSubscriptionStatus", () => {
    it("should return subscription status for valid user", async () => {
      // Given
      const mockData = {
        plan: "free",
        remaining_tests: 3,
        billing_key: null,
        next_billing_date: null,
        cancel_at_period_end: false,
      };
      const mockSupabase = createMockSupabase({ selectData: mockData });

      // When
      const result = await getSubscriptionStatus(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it("should return 404 when subscription not found", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });

      // When
      const result = await getSubscriptionStatus(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND);
    });
  });

  describe("createProSubscription", () => {
    it("should prevent double subscription (already Pro user)", async () => {
      // Given - 이미 Pro 플랜인 유저
      const mockSupabase = createMockSupabase({
        selectData: { plan: "pro" },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await createProSubscription(
        mockContext as any,
        "user-123",
        "test@example.com",
        { billing_key: "billing_key_123" }
      );

      // Then - 409 Conflict 반환
      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error?.code).toBe(subscriptionErrorCodes.ALREADY_PRO);
    });

    it("should return 404 when subscription not found", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await createProSubscription(
        mockContext as any,
        "user-123",
        "test@example.com",
        { billing_key: "billing_key_123" }
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(subscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND);
    });

    it("should fail when payment fails (no DB update)", async () => {
      // Given - free 플랜 유저, 결제 실패
      const mockSupabase = createMockSupabase({
        selectData: { plan: "free" },
      });
      const mockContext = createMockContext(mockSupabase);
      (chargeTossPayment as Mock).mockResolvedValue({
        success: false,
        error: "카드 잔액 부족",
      });

      // When
      const result = await createProSubscription(
        mockContext as any,
        "user-123",
        "test@example.com",
        { billing_key: "billing_key_123" }
      );

      // Then - 결제 실패 시 DB 업데이트 없이 에러 반환
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(subscriptionErrorCodes.PAYMENT_FAILED);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should create pro subscription successfully", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { plan: "free" },
      });
      const mockContext = createMockContext(mockSupabase);
      (chargeTossPayment as Mock).mockResolvedValue({ success: true });

      // When
      const result = await createProSubscription(
        mockContext as any,
        "user-123",
        "test@example.com",
        { billing_key: "billing_key_123" }
      );

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("Pro 구독이 시작되었습니다");
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel pro subscription successfully", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { plan: "pro", cancel_at_period_end: false },
      });

      // When
      const result = await cancelSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("구독 취소가 예약되었습니다");
    });

    it("should fail when not pro plan", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { plan: "free", cancel_at_period_end: false },
      });

      // When
      const result = await cancelSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(subscriptionErrorCodes.NOT_PRO);
    });

    it("should fail when already cancelled", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { plan: "pro", cancel_at_period_end: true },
      });

      // When
      const result = await cancelSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error?.code).toBe(subscriptionErrorCodes.ALREADY_CANCELLED);
    });
  });

  describe("reactivateSubscription", () => {
    it("should reactivate cancelled subscription", async () => {
      // Given
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const mockSupabase = createMockSupabase({
        selectData: {
          plan: "pro",
          cancel_at_period_end: true,
          next_billing_date: futureDate.toISOString().split("T")[0],
        },
      });

      // When
      const result = await reactivateSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.message).toBe("구독 취소가 철회되었습니다");
    });

    it("should fail when not in cancelled state", async () => {
      // Given
      const mockSupabase = createMockSupabase({
        selectData: { plan: "pro", cancel_at_period_end: false },
      });

      // When
      const result = await reactivateSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(subscriptionErrorCodes.NOT_CANCELLED);
    });

    it("should fail when period already expired", async () => {
      // Given
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const mockSupabase = createMockSupabase({
        selectData: {
          plan: "pro",
          cancel_at_period_end: true,
          next_billing_date: pastDate.toISOString().split("T")[0],
        },
      });

      // When
      const result = await reactivateSubscription(mockSupabase as any, "user-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(subscriptionErrorCodes.PERIOD_EXPIRED);
    });
  });
});
