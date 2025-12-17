import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmPayment } from "./service";
import { paymentsErrorCodes } from "./error";

// Global fetch mock
global.fetch = vi.fn();

const createMockSupabase = (overrides: {
  insertData?: unknown;
  insertError?: unknown;
  upsertError?: unknown;
}) => {
  const { insertData = null, insertError = null, upsertError = null } = overrides;

  const mockInsert = vi.fn().mockResolvedValue({
    data: insertData,
    error: insertError,
  });

  const mockUpsert = vi.fn().mockResolvedValue({
    data: null,
    error: upsertError,
  });

  const mockFrom = vi.fn((table: string) => {
    if (table === "payments") {
      return { insert: mockInsert };
    }
    if (table === "subscriptions") {
      return { upsert: mockUpsert };
    }
    return {};
  });

  return {
    from: mockFrom,
    _mockInsert: mockInsert,
    _mockUpsert: mockUpsert,
  };
};

const MOCK_TOSS_RESPONSE = {
  paymentKey: "test_payment_key_123",
  orderId: "order_123",
  status: "DONE",
  totalAmount: 3900,
  method: "카드",
  requestedAt: "2025-12-17T10:00:00+09:00",
  approvedAt: "2025-12-17T10:00:05+09:00",
};

const MOCK_SECRET_KEY = "test_sk_123";

describe("Payment Service - confirmPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOSS_SECRET_KEY = MOCK_SECRET_KEY;
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  describe("금액 검증 (Amount Validation)", () => {
    it("should reject when amount does not match subscription price", async () => {
      // Given - 잘못된 금액
      const mockSupabase = createMockSupabase({});
      const wrongAmount = 5000;

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        wrongAmount
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(paymentsErrorCodes.AMOUNT_MISMATCH);
      expect(result.error?.message).toContain("결제 금액이 일치하지 않습니다");
      expect(result.error?.message).toContain("3900");
      expect(result.error?.message).toContain(wrongAmount.toString());
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should accept correct amount (3900)", async () => {
      // Given - 올바른 금액
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 금액 검증 통과, Toss API 호출됨
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("환경 변수 검증 (Environment Variable Validation)", () => {
    it("should fail when TOSS_SECRET_KEY is missing", async () => {
      // Given - 환경 변수 없음
      delete process.env.TOSS_SECRET_KEY;
      const mockSupabase = createMockSupabase({});

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(paymentsErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("결제 설정이 올바르지 않습니다");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Toss API 호출 (Toss API Interaction)", () => {
    it("should call Toss API with correct headers and body", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      const paymentKey = "payment_key_abc";
      const orderId = "order_xyz";
      const amount = 3900;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      await confirmPayment(mockSupabase as any, "user-123", paymentKey, orderId, amount);

      // Then - Toss API 호출 검증
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(url).toBe("https://api.tosspayments.com/v1/payments/confirm");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers.Authorization).toMatch(/^Basic /);

      const body = JSON.parse(options.body);
      expect(body).toEqual({ paymentKey, orderId, amount });
    });

    it("should use correct Basic Auth encoding", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - Base64 인코딩 검증
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const authHeader = options.headers.Authorization;
      const expectedEncoding = Buffer.from(`${MOCK_SECRET_KEY}:`).toString("base64");

      expect(authHeader).toBe(`Basic ${expectedEncoding}`);
    });

    it("should fail when Toss API returns error", async () => {
      // Given - Toss API 에러 응답
      const mockSupabase = createMockSupabase({});
      const tossErrorMessage = "카드 승인 거부";

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: tossErrorMessage }),
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(paymentsErrorCodes.TOSS_API_ERROR);
      expect(result.error?.message).toBe(tossErrorMessage);
    });

    it("should handle Toss API error without message", async () => {
      // Given - Toss API 에러 응답 (메시지 없음)
      const mockSupabase = createMockSupabase({});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(paymentsErrorCodes.TOSS_API_ERROR);
      expect(result.error?.message).toBe("결제 승인에 실패했습니다");
    });

    it("should handle network errors", async () => {
      // Given - 네트워크 에러
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error")
      );

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(paymentsErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("결제 처리 중 오류가 발생했습니다");
    });
  });

  describe("결제 내역 저장 (Payment Record Persistence)", () => {
    it("should save payment record to database", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      const userId = "user-456";
      const paymentKey = "payment_key_def";
      const orderId = "order_ghi";

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      await confirmPayment(mockSupabase as any, userId, paymentKey, orderId, 3900);

      // Then - payments 테이블에 insert 호출됨
      expect(mockSupabase.from).toHaveBeenCalledWith("payments");
      expect(mockSupabase._mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        payment_key: paymentKey,
        order_id: orderId,
        amount: 3900,
        status: MOCK_TOSS_RESPONSE.status,
        method: MOCK_TOSS_RESPONSE.method,
        approved_at: MOCK_TOSS_RESPONSE.approvedAt,
      });
    });

    it("should continue when payment record save fails (non-critical)", async () => {
      // Given - payment 저장 실패해도 구독은 계속 진행
      const mockSupabase = createMockSupabase({
        insertError: { message: "Database error" },
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 에러 로그 남기고 계속 진행
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save payment record:",
        expect.any(Object)
      );
      expect(result.ok).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("구독 활성화 (Subscription Activation)", () => {
    it("should activate pro subscription with correct data", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      const userId = "user-789";

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        userId,
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - subscriptions 테이블에 upsert 호출됨
      expect(result.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("subscriptions");

      const [upsertData] = mockSupabase._mockUpsert.mock.calls[0];

      expect(upsertData.user_id).toBe(userId);
      expect(upsertData.plan).toBe("pro");
      expect(upsertData.status).toBe("active");
      expect(upsertData.remaining_tests).toBe(10);
      expect(upsertData.cancel_at_period_end).toBe(false);
      expect(upsertData.next_billing_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(upsertData.current_period_start).toBeTruthy();
      expect(upsertData.current_period_end).toBeTruthy();
      expect(upsertData.updated_at).toBeTruthy();
    });

    it("should set billing date to +1 month from now", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 다음 결제일 검증
      const [upsertData] = mockSupabase._mockUpsert.mock.calls[0];

      const nextBillingDate = new Date(upsertData.next_billing_date);
      const now = new Date();
      const expectedMonth = (now.getMonth() + 1) % 12;

      expect(nextBillingDate.getMonth()).toBe(expectedMonth);
    });

    it("should fail when subscription update fails", async () => {
      // Given - 구독 업데이트 실패
      const mockSupabase = createMockSupabase({
        upsertError: { message: "Database constraint violation" },
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 결제는 성공했지만 구독 활성화 실패
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(paymentsErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("구독 활성화에 실패했습니다");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to update subscription:",
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should use onConflict: user_id for upsert", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - upsert 옵션 검증
      const [, options] = mockSupabase._mockUpsert.mock.calls[0];

      expect(options).toEqual({ onConflict: "user_id" });
    });
  });

  describe("성공 시나리오 (Success Scenarios)", () => {
    it("should return success response with payment data", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({
        success: true,
        paymentKey: MOCK_TOSS_RESPONSE.paymentKey,
        orderId: MOCK_TOSS_RESPONSE.orderId,
        status: MOCK_TOSS_RESPONSE.status,
      });
    });

    it("should complete full payment flow successfully", async () => {
      // Given - 전체 플로우 성공 시나리오
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 모든 단계가 순차적으로 실행됨
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith("payments");
      expect(mockSupabase.from).toHaveBeenCalledWith("subscriptions");
      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(true);
    });
  });

  describe("에지 케이스 (Edge Cases)", () => {
    it("should handle zero amount", async () => {
      // Given
      const mockSupabase = createMockSupabase({});

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        0
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(paymentsErrorCodes.AMOUNT_MISMATCH);
    });

    it("should handle negative amount", async () => {
      // Given
      const mockSupabase = createMockSupabase({});

      // When
      const result = await confirmPayment(
        mockSupabase as any,
        "user-123",
        "payment_key_123",
        "order_123",
        -1000
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(paymentsErrorCodes.AMOUNT_MISMATCH);
    });

    it("should handle empty user ID", async () => {
      // Given
      const mockSupabase = createMockSupabase({});
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TOSS_RESPONSE,
      } as Response);

      // When - 빈 userId도 DB 에러는 나지만 처리는 됨
      const result = await confirmPayment(
        mockSupabase as any,
        "",
        "payment_key_123",
        "order_123",
        3900
      );

      // Then - 서비스는 성공 (DB 제약조건은 DB 레벨에서 처리)
      expect(result.ok).toBe(true);
    });
  });
});
