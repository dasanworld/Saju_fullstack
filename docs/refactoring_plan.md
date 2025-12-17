---

### 📅 리팩토링 계획

1.  **목표:** `route.ts`에 있는 Gemini/OpenAI 스트리밍 및 Fallback 로직을 `service.ts`로 추출.
2.  **원칙:** Route는 HTTP 통신만 담당, Service는 데이터 생성만 담당 (SRP 준수).
3.  **방어적 설계:** 스트림 끊김, DB 업데이트 실패 시 예외 처리 강화.

---

### 1. 파일 경로: `src/features/test/backend/service.test.ts` (신규 생성)

가장 먼저, 우리가 만들 로직이 어떻게 동작해야 하는지 정의하는 **테스트 코드**부터 작성합니다. (Red 단계)

#### [TDD 1단계] Red (Test)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAnalysisStream } from './service';
import * as geminiClient from '@/lib/gemini/client';
import * as openaiClient from '@/lib/openai/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mocking dependencies
vi.mock('@/lib/gemini/client');
vi.mock('@/lib/openai/client');

describe('processAnalysisStream', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as SupabaseClient;

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const testInput = {
    name: 'TestUser',
    birth_date: '2000-01-01',
    birth_time: '12:00',
    gender: 'male' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stream data from Gemini successfully', async () => {
    // Given: Gemini returns a valid stream
    const mockGeminiStream = {
      textStream: (async function* () {
        yield 'Hello';
        yield ' World';
      })(),
      response: Promise.resolve(),
    };
    vi.spyOn(geminiClient, 'streamSajuAnalysis').mockResolvedValue(mockGeminiStream as any);

    // When: Service is called
    const generator = processAnalysisStream({
      supabase: mockSupabase,
      logger: mockLogger,
      testId: 'test-uuid',
      input: testInput,
      model: 'gemini-2.0-flash',
    });

    // Then: It should yield formatted chunks
    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(JSON.parse(chunk.replace('data: ', '')));
    }

    expect(chunks).toEqual([
      { text: 'Hello' },
      { text: ' World' },
      { done: true },
    ]);
    expect(mockSupabase.from).toHaveBeenCalledWith('tests'); // DB update verification
  });

  it('should fallback to OpenAI when Gemini quota exceeds', async () => {
    // Given: Gemini throws Quota Error
    vi.spyOn(geminiClient, 'streamSajuAnalysis').mockRejectedValue({
      statusCode: 429,
      message: 'RESOURCE_EXHAUSTED',
    });

    // Given: OpenAI works
    const mockOpenAIStream = {
      textStream: (async function* () {
        yield 'OpenAI';
        yield ' Fallback';
      })(),
    };
    vi.spyOn(openaiClient, 'streamOpenAIAnalysis').mockResolvedValue(mockOpenAIStream as any);

    // When: Service is called
    const generator = processAnalysisStream({
      supabase: mockSupabase,
      logger: mockLogger,
      testId: 'test-uuid',
      input: testInput,
      model: 'gemini-2.0-flash',
    });

    // Then: It should yield fallback message then OpenAI content
    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(JSON.parse(chunk.replace('data: ', '')));
    }

    // Verify Fallback message exists
    expect(chunks[0]).toHaveProperty('fallback', 'openai');
    expect(chunks[1]).toEqual({ text: 'OpenAI' });
  });
});
```

---

### 2. 파일 경로: `src/features/test/backend/service.ts`

테스트를 통과하기 위한 구현 코드입니다. Route에 있던 복잡한 로직을 이곳으로 옮겨와 정리합니다. 제너레이터 패턴을 사용하여 스트림 제어를 명확히 합니다.

#### [TDD 2, 3단계] Green (Impl) & Refactor

```typescript
import { streamSajuAnalysis } from "@/lib/gemini/client";
import { streamOpenAIAnalysis } from "@/lib/openai/client";
import type { SajuInput, GeminiModel } from "@/lib/gemini/types";
import type { AppLogger } from "@/backend/hono/context";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTestAnalysis } from "./service"; // 기존 함수 재사용

// ... (기존 import 및 함수들 유지) ...

type ProcessStreamParams = {
  supabase: SupabaseClient;
  logger: any; // AppLogger 타입 호환
  testId: string;
  input: SajuInput;
  model: GeminiModel;
};

/**
 * AI 분석 스트림을 처리하고 DB를 업데이트하는 핵심 비즈니스 로직입니다.
 * Route Layer에서 HTTP 응답에만 집중할 수 있도록 Generator를 반환합니다.
 *
 * @param params ProcessStreamParams
 * @returns AsyncGenerator<string> (SSE 포맷 문자열)
 */
export async function* processAnalysisStream({
  supabase,
  logger,
  testId,
  input,
  model,
}: ProcessStreamParams): AsyncGenerator<string> {
  let fullText = "";

  try {
    logger.info("Starting Gemini stream", { test_id: testId });

    // 1. Gemini 스트림 시도
    const geminiResult = await streamSajuAnalysis(input, model);

    for await (const chunk of geminiResult.textStream) {
      fullText += chunk;
      // SSE Format: data: {json}\n\n
      yield `data: ${JSON.stringify({ text: chunk })}\n\n`;
    }

    // 스트림 완료 대기 (에러 포착용)
    await geminiResult.response;

    if (fullText.length === 0) {
        throw new Error("No content generated from Gemini");
    }

    // 성공 시 DB 업데이트 및 종료 신호
    await updateTestAnalysis(supabase, testId, fullText);
    yield `data: ${JSON.stringify({ done: true })}\n\n`;
    logger.info("Stream completed with Gemini", { test_id: testId });

  } catch (error: any) {
    // 2. 에러 핸들링 및 Fallback 로직
    const errorMessage = error?.message || "";
    const errorBody = error?.responseBody || error?.lastError?.responseBody || "";
    const statusCode = error?.statusCode || error?.lastError?.statusCode;

    const isQuotaError =
      statusCode === 429 ||
      errorMessage.includes("quota") ||
      errorMessage.includes("rate") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorBody.includes("RESOURCE_EXHAUSTED");

    if (isQuotaError) {
      logger.warn("Gemini quota exceeded, falling back to OpenAI", {
        test_id: testId,
        error: errorMessage,
      });

      try {
        // Fallback 알림 전송
        yield `data: ${JSON.stringify({
          fallback: "openai",
          message: "Gemini 쿼터 초과로 GPT-4.1-mini로 전환합니다...",
        })}\n\n`;

        fullText = ""; // 텍스트 초기화 후 OpenAI 재시도
        const openaiResult = await streamOpenAIAnalysis(input);

        for await (const chunk of openaiResult.textStream) {
          fullText += chunk;
          yield `data: ${JSON.stringify({ text: chunk })}\n\n`;
        }

        await updateTestAnalysis(supabase, testId, fullText);
        yield `data: ${JSON.stringify({ done: true })}\n\n`;
        logger.info("Stream completed with OpenAI fallback", { test_id: testId });

      } catch (openaiError) {
        logger.error("OpenAI fallback also failed", openaiError);
        yield `data: ${JSON.stringify({
          error: "AI 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.",
        })}\n\n`;
      }
    } else {
      // 일반 에러 처리
      logger.error("Gemini stream error (non-quota)", error);
      yield `data: ${JSON.stringify({
        error: "스트리밍 중 오류가 발생했습니다",
      })}\n\n`;
    }
  }
}
```

---

### 3. 파일 경로: `src/features/test/backend/route.ts`

이제 Route Handler는 매우 얇아집니다(Slim Controller). 단순히 입력을 파싱하고 Service를 호출하여 파이프라인만 연결합니다.

#### [TDD 3단계] Refactor (Client Code Update)

```typescript
// ... imports
import {
  // ... 기존 imports
  getTestForStream,
  processAnalysisStream, // 새로 만든 서비스 함수 import
} from "./service";

// ... (다른 라우트들 유지)

  app.post("/api/test/stream/:id", async (c) => {
    // 1. 인증 및 권한 확인 (기존 유지)
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

    // 2. 입력값 파싱 (기존 유지)
    const testId = c.req.param("id");
    const params = testParamsSchema.parse({ id: testId });

    // 3. 테스트 데이터 조회 (기존 유지)
    const testResult = await getTestForStream(supabase, userResult.user.id, params.id);

    if (!testResult.ok) {
        // ... 에러 처리
         const errorResult = testResult as { ok: false; status: number; error: { message: string } };
         return c.json(
            { success: false, message: errorResult.error.message },
            errorResult.status as any
         );
    }

    const testData = testResult.data;
    const body = await c.req.json().catch(() => ({}));
    const model = (body.model || "gemini-2.0-flash") as GeminiModel;

    // 4. HTTP 헤더 설정
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    // 5. 스트리밍 응답 (Refactored: 서비스 함수 호출)
    return stream(c, async (streamWriter) => {
      const sajuInput = {
        name: testData.name,
        birth_date: testData.birth_date,
        birth_time: testData.birth_time,
        gender: testData.gender,
      };

      // Service에서 생성된 Generator를 순회하며 클라이언트로 전송
      const generator = processAnalysisStream({
        supabase,
        logger,
        testId: params.id,
        input: sajuInput,
        model,
      });

      for await (const sseMessage of generator) {
        await streamWriter.write(sseMessage);
      }
    });
  });
```

---

### 🐞 디버깅 가이드 (Debugging Guide)

창업자님, 코드를 수정하고 나면 반드시 다음 사항들을 확인해야 합니다.

1.  **스트림 중단 테스트:**
    *   **증상:** 분석 중에 로딩이 멈추거나 "Network Error" 발생.
    *   **해결:** Hono의 `stream` 핸들러 내부에서 `streamWriter.write` 실패 시 `try-catch`로 잡아서 로거에 남기세요. 클라이언트와의 연결이 끊겼을 수 있습니다.

2.  **Fallback 동작 확인 (강제 에러 발생):**
    *   **테스트 방법:** `service.ts`의 `streamSajuAnalysis` 호출 직전에 `throw { statusCode: 429, message: 'RESOURCE_EXHAUSTED' }`를 임시로 넣어보세요.
    *   **기대 결과:** 프론트엔드 다이얼로그에 "Gemini 쿼터 초과..." 메시지가 잠깐 뜨고 GPT 모델로 분석이 계속되어야 합니다.

3.  **실행 명령어:**
    ```bash
    # 1. 패키지 설치 (vitest가 없다면)
    npm install -D vitest

    # 2. 테스트 실행
    npx vitest run src/features/test/backend/service.test.ts

    # 3. 개발 서버 실행
    npm run dev
    ```

코드는 명확하게 분리되었고, 핵심 비즈니스 로직(AI 분석 흐름)은 이제 테스트 가능합니다. 이것이 바로 "확장 가능한 구조"입니다. 수고하십시오.