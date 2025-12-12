import type { AppContext } from "@/backend/hono/context";
import { success, failure } from "@/backend/http/response";
import { generateSajuAnalysis } from "@/lib/gemini/client";
import type { GeminiModel } from "@/lib/gemini/types";
import type {
  CreateTestRequest,
  CreateTestResponse,
  TestListQuery,
  TestListResponse,
  TestDetailResponse,
} from "./schema";
import { testErrorCodes } from "./error";
import type { SupabaseClient } from "@supabase/supabase-js";

export const createTest = async (
  c: AppContext,
  userId: string,
  input: CreateTestRequest
) => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("plan, remaining_tests")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription) {
      logger.error("Subscription not found", subError);
      return failure(404, testErrorCodes.INTERNAL_ERROR, "구독 정보를 찾을 수 없습니다");
    }

    if (subscription.remaining_tests <= 0) {
      return failure(
        403,
        testErrorCodes.INSUFFICIENT_TESTS,
        "검사 횟수를 모두 사용했습니다"
      );
    }

    const { data: test, error: testError } = await supabase
      .from("tests")
      .insert({
        user_id: userId,
        name: input.name,
        birth_date: input.birth_date,
        birth_time: input.birth_time,
        gender: input.gender,
      })
      .select()
      .single();

    if (testError) {
      logger.error("Test creation failed", testError);
      return failure(500, testErrorCodes.TEST_CREATE_FAILED, "검사 생성 실패");
    }

    const model: GeminiModel =
      subscription.plan === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";

    const analysisResult = await generateSajuAnalysis(
      {
        name: input.name,
        birth_date: input.birth_date,
        birth_time: input.birth_time,
        gender: input.gender,
      },
      model
    );

    if (!analysisResult) {
      await supabase.from("tests").delete().eq("id", test.id);
      return failure(500, testErrorCodes.GEMINI_API_FAILED, "AI 분석 실패");
    }

    const { error: updateError } = await supabase
      .from("tests")
      .update({ analysis_result: analysisResult })
      .eq("id", test.id);

    if (updateError) {
      logger.error("Test update failed", updateError);
    }

    const { error: decrementError } = await supabase
      .from("subscriptions")
      .update({ remaining_tests: subscription.remaining_tests - 1 })
      .eq("user_id", userId);

    if (decrementError) {
      logger.error("Failed to decrement remaining_tests", decrementError);
    }

    logger.info("Test created successfully", { test_id: test.id });

    const response: CreateTestResponse = {
      test_id: test.id,
      analysis_result: analysisResult,
    };

    return success(response);
  } catch (error) {
    logger.error("Unexpected error", error);
    return failure(500, testErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const getTestList = async (
  supabase: SupabaseClient,
  userId: string,
  query: TestListQuery
) => {
  try {
    let queryBuilder = supabase
      .from("tests")
      .select("id, name, birth_date, birth_time, gender, created_at", {
        count: "exact",
      })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (query.name) {
      queryBuilder = queryBuilder.ilike("name", `%${query.name}%`);
    }

    queryBuilder = queryBuilder.range(query.offset, query.offset + query.limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      return failure(500, testErrorCodes.TEST_LIST_FAILED, "검사 목록 조회 실패");
    }

    const response: TestListResponse = {
      tests: data || [],
      total: count || 0,
    };

    return success(response);
  } catch (error) {
    return failure(500, testErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};

export const getTestDetail = async (
  supabase: SupabaseClient,
  userId: string,
  testId: string
) => {
  try {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return failure(404, testErrorCodes.TEST_NOT_FOUND, "검사를 찾을 수 없습니다");
    }

    const response: TestDetailResponse = {
      id: data.id,
      name: data.name,
      birth_date: data.birth_date,
      birth_time: data.birth_time,
      gender: data.gender,
      analysis_result: data.analysis_result || "",
      created_at: data.created_at,
    };

    return success(response);
  } catch (error) {
    return failure(500, testErrorCodes.INTERNAL_ERROR, "서버 오류");
  }
};
