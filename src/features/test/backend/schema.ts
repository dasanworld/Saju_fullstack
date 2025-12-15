import { z } from "zod";

export const createTestRequestSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  birth_time: z.string().nullable(),
  gender: z.enum(["male", "female"]),
});

export const testListQuerySchema = z.object({
  name: z.string().optional(),
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const testParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTestResponseSchema = z.object({
  test_id: z.string().uuid(),
  analysis_result: z.string(),
});

export const initTestResponseSchema = z.object({
  test_id: z.string().uuid(),
  model: z.enum(["gemini-2.0-flash", "gemini-1.5-pro"]),
});

export const testListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(["male", "female"]),
  created_at: z.string(),
});

export const testListResponseSchema = z.object({
  tests: z.array(testListItemSchema),
  total: z.number(),
});

export const testDetailResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(["male", "female"]),
  analysis_result: z.string().nullable(),
  created_at: z.string(),
});

export type CreateTestRequest = z.infer<typeof createTestRequestSchema>;
export type TestListQuery = z.infer<typeof testListQuerySchema>;
export type CreateTestResponse = z.infer<typeof createTestResponseSchema>;
export type InitTestResponse = z.infer<typeof initTestResponseSchema>;
export type TestListResponse = z.infer<typeof testListResponseSchema>;
export type TestDetailResponse = z.infer<typeof testDetailResponseSchema>;
