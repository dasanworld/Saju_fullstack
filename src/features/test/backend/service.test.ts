import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  createTest,
  getTestList,
  getTestDetail,
  deleteTest,
  initTest,
  getTestForStream,
  updateTestAnalysis,
} from "./service";
import { testErrorCodes } from "./error";
import { generateSajuAnalysis } from "@/lib/gemini/client";

vi.mock("@/lib/gemini/client", () => ({
  generateSajuAnalysis: vi.fn(),
}));

const createMockSupabase = (overrides: {
  selectData?: unknown;
  selectError?: unknown;
  insertData?: unknown;
  insertError?: unknown;
  updateError?: unknown;
  deleteError?: unknown;
  count?: number;
}) => {
  const {
    selectData = null,
    selectError = null,
    insertData = null,
    insertError = null,
    updateError = null,
    deleteError = null,
    count = 0,
  } = overrides;

  const eqChain = {
    single: vi.fn().mockResolvedValue({
      data: selectData,
      error: selectError,
    }),
    order: vi.fn().mockReturnValue({
      range: vi.fn().mockResolvedValue({
        data: selectData,
        error: selectError,
        count,
      }),
    }),
  };

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(eqChain),
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: selectData,
            error: selectError,
            count,
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(eqChain),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: insertData,
            error: insertError,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: updateError,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: deleteError,
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

describe("Test Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTest", () => {
    const mockInput = {
      name: "홍길동",
      birth_date: "1990-01-15",
      birth_time: "14:30",
      gender: "male" as const,
    };

    it("should return 404 when subscription not found", async () => {
      // Given - 구독 정보가 없는 경우
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await createTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(testErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("구독 정보를 찾을 수 없습니다");
    });

    it("should return 403 when remaining tests is 0", async () => {
      // Given - 검사 횟수가 0인 경우
      const mockSupabase = createMockSupabase({
        selectData: { plan: "free", remaining_tests: 0 },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await createTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error?.code).toBe(testErrorCodes.INSUFFICIENT_TESTS);
      expect(result.error?.message).toBe("검사 횟수를 모두 사용했습니다");
    });

    it("should return 500 when test creation fails", async () => {
      // Given - 테스트 생성 실패
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { plan: "free", remaining_tests: 5 },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Insert failed" },
              }),
            }),
          }),
        }),
      };
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await createTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(testErrorCodes.TEST_CREATE_FAILED);
    });

    it("should return 500 and rollback when AI analysis fails", async () => {
      // Given - AI 분석 실패 (테스트 롤백 필요)
      const mockTestId = "test-uuid-123";
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { plan: "free", remaining_tests: 5 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "tests") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockTestId },
                    error: null,
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {};
        }),
      };
      const mockContext = createMockContext(mockSupabase);
      (generateSajuAnalysis as Mock).mockResolvedValue(null);

      // When
      const result = await createTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(testErrorCodes.GEMINI_API_FAILED);
      expect(mockSupabase.from).toHaveBeenCalledWith("tests");
    });

    it("should create test successfully with AI analysis", async () => {
      // Given - 정상적인 테스트 생성 및 AI 분석
      const mockTestId = "test-uuid-123";
      const mockAnalysis = "사주 분석 결과입니다.";
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { plan: "free", remaining_tests: 5 },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "tests") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockTestId },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {};
        }),
      };
      const mockContext = createMockContext(mockSupabase);
      (generateSajuAnalysis as Mock).mockResolvedValue(mockAnalysis);

      // When
      const result = await createTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.test_id).toBe(mockTestId);
      expect(result.data?.analysis_result).toBe(mockAnalysis);
      expect(generateSajuAnalysis).toHaveBeenCalledWith(mockInput, "gemini-2.0-flash");
    });
  });

  describe("getTestList", () => {
    it("should return empty list when no tests found", async () => {
      // Given - 검사 목록이 비어있는 경우
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0,
                }),
              }),
            }),
          }),
        }),
      };

      // When
      const result = await getTestList(mockSupabase as any, "user-123", {
        limit: 20,
        offset: 0,
      });

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.tests).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it("should return 500 when query fails", async () => {
      // Given - 쿼리 실패
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Query failed" },
                  count: null,
                }),
              }),
            }),
          }),
        }),
      };

      // When
      const result = await getTestList(mockSupabase as any, "user-123", {
        limit: 20,
        offset: 0,
      });

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(testErrorCodes.TEST_LIST_FAILED);
    });

    it("should return test list with pagination", async () => {
      // Given - 정상적인 검사 목록 조회
      const mockTests = [
        {
          id: "test-1",
          name: "홍길동",
          birth_date: "1990-01-15",
          birth_time: "14:30",
          gender: "male",
          created_at: "2025-01-01T00:00:00Z",
          analysis_result: "분석 결과",
        },
        {
          id: "test-2",
          name: "김철수",
          birth_date: "1985-05-20",
          birth_time: null,
          gender: "male",
          created_at: "2025-01-02T00:00:00Z",
          analysis_result: null,
        },
      ];
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockTests,
                  error: null,
                  count: 2,
                }),
              }),
            }),
          }),
        }),
      };

      // When
      const result = await getTestList(mockSupabase as any, "user-123", {
        limit: 20,
        offset: 0,
      });

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.tests).toHaveLength(2);
      expect(result.data?.tests[0].has_analysis).toBe(true);
      expect(result.data?.tests[1].has_analysis).toBe(false);
      expect(result.data?.total).toBe(2);
    });

    it("should filter tests by name", async () => {
      // Given - 이름으로 필터링
      const mockTests = [
        {
          id: "test-1",
          name: "홍길동",
          birth_date: "1990-01-15",
          birth_time: "14:30",
          gender: "male",
          created_at: "2025-01-01T00:00:00Z",
          analysis_result: "분석 결과",
        },
      ];
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                ilike: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockTests,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // When
      const result = await getTestList(mockSupabase as any, "user-123", {
        name: "홍길동",
        limit: 20,
        offset: 0,
      });

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.tests).toHaveLength(1);
      expect(result.data?.tests[0].name).toBe("홍길동");
    });
  });

  describe("getTestDetail", () => {
    it("should return 404 when test not found", async () => {
      // Given - 검사를 찾을 수 없는 경우
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });

      // When
      const result = await getTestDetail(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(testErrorCodes.TEST_NOT_FOUND);
    });

    it("should return test detail successfully", async () => {
      // Given - 정상적인 검사 상세 조회
      const mockTest = {
        id: "test-123",
        name: "홍길동",
        birth_date: "1990-01-15",
        birth_time: "14:30",
        gender: "male",
        analysis_result: "사주 분석 결과입니다.",
        created_at: "2025-01-01T00:00:00Z",
      };
      const mockSupabase = createMockSupabase({
        selectData: mockTest,
      });

      // When
      const result = await getTestDetail(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe("test-123");
      expect(result.data?.name).toBe("홍길동");
      expect(result.data?.analysis_result).toBe("사주 분석 결과입니다.");
    });

    it("should handle test without analysis result", async () => {
      // Given - 분석 결과가 없는 검사
      const mockTest = {
        id: "test-123",
        name: "홍길동",
        birth_date: "1990-01-15",
        birth_time: "14:30",
        gender: "male",
        analysis_result: null,
        created_at: "2025-01-01T00:00:00Z",
      };
      const mockSupabase = createMockSupabase({
        selectData: mockTest,
      });

      // When
      const result = await getTestDetail(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.analysis_result).toBeNull();
    });
  });

  describe("deleteTest", () => {
    it("should return 404 when test not found", async () => {
      // Given - 삭제할 검사가 없는 경우
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });

      // When
      const result = await deleteTest(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(testErrorCodes.TEST_NOT_FOUND);
    });

    it("should return 500 when delete operation fails", async () => {
      // Given - 삭제 작업 실패
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-123", user_id: "user-123" },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { message: "Delete failed" },
            }),
          }),
        }),
      };

      // When
      const result = await deleteTest(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(testErrorCodes.INTERNAL_ERROR);
    });

    it("should delete test successfully", async () => {
      // Given - 정상적인 삭제
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-123", user_id: "user-123" },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      };

      // When
      const result = await deleteTest(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
    });
  });

  describe("initTest", () => {
    const mockInput = {
      name: "홍길동",
      birth_date: "1990-01-15",
      birth_time: "14:30",
      gender: "male" as const,
    };

    it("should return 404 when subscription not found", async () => {
      // Given - 구독 정보가 없는 경우
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await initTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(testErrorCodes.INTERNAL_ERROR);
    });

    it("should return 403 when remaining tests is 0", async () => {
      // Given - 검사 횟수가 0인 경우
      const mockSupabase = createMockSupabase({
        selectData: { plan: "free", remaining_tests: 0 },
      });
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await initTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error?.code).toBe(testErrorCodes.INSUFFICIENT_TESTS);
    });

    it("should initialize test successfully", async () => {
      // Given - 정상적인 테스트 초기화
      const mockTestId = "test-uuid-123";
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { plan: "free", remaining_tests: 5 },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "tests") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockTestId },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      const mockContext = createMockContext(mockSupabase);

      // When
      const result = await initTest(mockContext as any, "user-123", mockInput);

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.test_id).toBe(mockTestId);
      expect(result.data?.model).toBe("gemini-2.0-flash");
    });
  });

  describe("getTestForStream", () => {
    it("should return 404 when test not found", async () => {
      // Given - 검사를 찾을 수 없는 경우
      const mockSupabase = createMockSupabase({
        selectData: null,
        selectError: { message: "Not found" },
      });

      // When
      const result = await getTestForStream(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe(testErrorCodes.TEST_NOT_FOUND);
    });

    it("should return 400 when analysis already exists", async () => {
      // Given - 이미 분석이 완료된 검사
      const mockTest = {
        id: "test-123",
        name: "홍길동",
        birth_date: "1990-01-15",
        birth_time: "14:30",
        gender: "male",
        analysis_result: "이미 완료된 분석",
      };
      const mockSupabase = createMockSupabase({
        selectData: mockTest,
      });

      // When
      const result = await getTestForStream(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe(testErrorCodes.ANALYSIS_ALREADY_EXISTS);
    });

    it("should return test data for streaming", async () => {
      // Given - 스트리밍 가능한 검사
      const mockTest = {
        id: "test-123",
        name: "홍길동",
        birth_date: "1990-01-15",
        birth_time: "14:30",
        gender: "male",
        analysis_result: null,
      };
      const mockSupabase = createMockSupabase({
        selectData: mockTest,
      });

      // When
      const result = await getTestForStream(mockSupabase as any, "user-123", "test-123");

      // Then
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockTest);
    });
  });

  describe("updateTestAnalysis", () => {
    it("should return 500 when update fails", async () => {
      // Given - 업데이트 실패
      const mockSupabase = createMockSupabase({
        updateError: { message: "Update failed" },
      });

      // When
      const result = await updateTestAnalysis(
        mockSupabase as any,
        "test-123",
        "분석 결과"
      );

      // Then
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(testErrorCodes.INTERNAL_ERROR);
    });

    it("should update test analysis successfully", async () => {
      // Given - 정상적인 분석 결과 업데이트
      const mockSupabase = createMockSupabase({
        updateError: null,
      });

      // When
      const result = await updateTestAnalysis(
        mockSupabase as any,
        "test-123",
        "사주 분석 결과입니다."
      );

      // Then
      expect(result.ok).toBe(true);
      expect(result.data?.updated).toBe(true);
    });
  });
});
