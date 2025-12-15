import type { Hono } from "hono";
import { stream } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import type { AppEnv } from "@/backend/hono/context";
import { respond, failure } from "@/backend/http/response";
import {
  createTestRequestSchema,
  testListQuerySchema,
  testParamsSchema,
} from "./schema";
import {
  createTest,
  getTestList,
  getTestDetail,
  initTest,
  getTestForStream,
  updateTestAnalysis,
  deleteTest,
} from "./service";
import { testErrorCodes } from "./error";
import { getOrCreateUser } from "@/features/auth/backend/helpers";
import { streamSajuAnalysis } from "@/lib/gemini/client";
import { streamOpenAIAnalysis } from "@/lib/openai/client";
import type { GeminiModel } from "@/lib/gemini/types";

export const registerTestRoutes = (app: Hono<AppEnv>) => {
  app.post(
    "/api/test/create",
    zValidator("json", createTestRequestSchema) as never,
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return respond(
          c,
          failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
        );
      }

      const supabase = c.get("supabase");
      const logger = c.get("logger");
      const userResult = await getOrCreateUser(supabase, logger, auth.userId);

      if (!userResult.success) {
        return respond(
          c,
          failure(404, testErrorCodes.INTERNAL_ERROR, userResult.error)
        );
      }

      const body = await c.req.json();
      const parsed = createTestRequestSchema.parse(body);

      return respond(c, await createTest(c, userResult.user.id, parsed));
    }
  );

  app.get("/api/test/list", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, testErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    const query = testListQuerySchema.parse({
      name: c.req.query("name"),
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    });

    return respond(c, await getTestList(supabase, userResult.user.id, query));
  });

  app.get("/api/test/:id", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, testErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    const params = testParamsSchema.parse({ id: c.req.param("id") });

    return respond(c, await getTestDetail(supabase, userResult.user.id, params.id));
  });

  app.post(
    "/api/test/init",
    zValidator("json", createTestRequestSchema) as never,
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return respond(
          c,
          failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
        );
      }

      const supabase = c.get("supabase");
      const logger = c.get("logger");
      const userResult = await getOrCreateUser(supabase, logger, auth.userId);

      if (!userResult.success) {
        return respond(
          c,
          failure(404, testErrorCodes.INTERNAL_ERROR, userResult.error)
        );
      }

      const body = await c.req.json();
      const parsed = createTestRequestSchema.parse(body);

      return respond(c, await initTest(c, userResult.user.id, parsed));
    }
  );

  app.post("/api/test/stream/:id", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ success: false, message: "인증이 필요합니다" }, 401);
    }

    const supabase = c.get("supabase");
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return c.json({ success: false, message: userResult.error }, 404);
    }

    const testId = c.req.param("id");
    const params = testParamsSchema.parse({ id: testId });

    const testResult = await getTestForStream(supabase, userResult.user.id, params.id);

    if (!testResult.ok) {
      const errorResult = testResult as { ok: false; status: number; error: { message: string } };
      return c.json(
        { success: false, message: errorResult.error.message },
        errorResult.status as any
      );
    }

    const testData = testResult.data;
    const body = await c.req.json().catch(() => ({}));
    const model = (body.model || "gemini-2.0-flash") as GeminiModel;

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    return stream(c, async (streamWriter) => {
      let fullText = "";
      const sajuInput = {
        name: testData.name,
        birth_date: testData.birth_date,
        birth_time: testData.birth_time,
        gender: testData.gender,
      };

      const runGeminiStream = async (): Promise<{ success: boolean; error?: any }> => {
        try {
          logger.info("Starting Gemini stream", { test_id: params.id });
          const geminiResult = await streamSajuAnalysis(sajuInput, model);

          for await (const chunk of geminiResult.textStream) {
            fullText += chunk;
            await streamWriter.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }

          await geminiResult.response;

          if (fullText.length === 0) {
            return { success: false, error: { message: "No content generated" } };
          }

          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      };

      const geminiStreamResult = await runGeminiStream();

      if (geminiStreamResult.success) {
        await updateTestAnalysis(supabase, params.id, fullText);
        await streamWriter.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        logger.info("Stream completed with Gemini", { test_id: params.id });
      } else {
        const geminiError = geminiStreamResult.error;
        const errorMessage = geminiError?.message || "";
        const errorBody = geminiError?.responseBody || geminiError?.lastError?.responseBody || "";
        const statusCode = geminiError?.statusCode || geminiError?.lastError?.statusCode;

        const isQuotaError =
          statusCode === 429 ||
          errorMessage.includes("quota") ||
          errorMessage.includes("rate") ||
          errorMessage.includes("RESOURCE_EXHAUSTED") ||
          errorBody.includes("RESOURCE_EXHAUSTED");

        if (isQuotaError) {
          logger.warn("Gemini quota exceeded, falling back to OpenAI", {
            test_id: params.id,
            error: errorMessage,
          });

          try {
            fullText = "";
            await streamWriter.write(
              `data: ${JSON.stringify({ fallback: "openai", message: "Gemini 쿼터 초과로 GPT-4.1-mini로 전환합니다..." })}\n\n`
            );

            const openaiResult = await streamOpenAIAnalysis(sajuInput);

            for await (const chunk of openaiResult.textStream) {
              fullText += chunk;
              await streamWriter.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }

            await updateTestAnalysis(supabase, params.id, fullText);
            await streamWriter.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            logger.info("Stream completed with OpenAI fallback", { test_id: params.id });
          } catch (openaiError) {
            logger.error("OpenAI fallback also failed", openaiError);
            await streamWriter.write(
              `data: ${JSON.stringify({ error: "AI 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요." })}\n\n`
            );
          }
        } else {
          logger.error("Gemini stream error (non-quota)", geminiError);
          await streamWriter.write(
            `data: ${JSON.stringify({ error: "스트리밍 중 오류가 발생했습니다" })}\n\n`
          );
        }
      }
    });
  });

  app.delete("/api/test/:id", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const logger = c.get("logger");
    const userResult = await getOrCreateUser(supabase, logger, auth.userId);

    if (!userResult.success) {
      return respond(
        c,
        failure(404, testErrorCodes.INTERNAL_ERROR, userResult.error)
      );
    }

    const params = testParamsSchema.parse({ id: c.req.param("id") });

    return respond(c, await deleteTest(supabase, userResult.user.id, params.id));
  });
};
