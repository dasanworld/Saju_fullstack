

# 📝 Master Instruction: Robust Test Environment Setup

**To:** AI Coding Agent
**From:** Senior CTO
**Context:** Next.js 14 (App Router), Hono, Supabase, 1-Person Dev Team
**Goal:** 구축된 기능의 회귀(Regression)를 방지하고, 외부 의존성(Payment, AI, Auth)을 격리한 견고한 테스트 환경 구축.

---

## 1. 기술 스택 및 원칙 (Tech Stack & Principles)

1.  **Unit/Integration:** `Vitest` + `React Testing Library`
    *   **원칙:** 비즈니스 로직(`services/`)과 유틸리티(`lib/`)는 철저히 격리(Mocking)하여 테스트한다.
2.  **E2E:** `Playwright`
    *   **원칙:** 실제 외부 API 호출 금지. Network Interception(`page.route`)과 Auth Bypass(`storageState`)를 필수 적용한다.
3.  **Pattern:** `Given-When-Then` 구조 준수.

---

## 2. 상세 구현 지침 (Step-by-Step Implementation)

### Step 1: 환경 설정 (Environment Setup)

1.  **패키지 설치:**
    ```bash
    npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @playwright/test
    npx playwright install chromium --with-deps
    ```
2.  **Vitest 설정 (`vitest.config.ts`):**
    *   Next.js 절대 경로 Alias(`@/*`) 인식 설정 필수.
    *   `environment: 'jsdom'` 설정.
    *   `setupFiles`: `src/test/setup.ts` (전역 Mocking 및 Cleanup 설정).

### Step 2: 백엔드 로직 통합 테스트 (Backend Service Tests)

*UI 없이* Hono 서비스 로직(`src/features/**/service.ts`)을 검증한다. **가장 중요함.**

*   **타겟:** `src/features/subscription/backend/service.ts` 등.
*   **전략:** `vi.mock`을 사용하여 `SupabaseClient`와 `TossClient`를 모킹(Mocking)한다.
*   **필수 시나리오:**
    1.  이미 Pro 플랜인 유저가 구독 시도 시 `409 Conflict` 반환.
    2.  결제 실패 시 DB 업데이트 롤백 확인.

**Code Example (Vitest):**
```typescript
// src/features/subscription/backend/service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProSubscription } from './service';

// Mock Dependencies
vi.mock('@/lib/toss/client', () => ({
  chargeTossPayment: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Subscription Service', () => {
  it('should prevent double subscription', async () => {
    const mockSupabase = { /* Mock setup for existing pro user */ };
    const result = await createProSubscription({ get: () => mockSupabase } as any, ...);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('ALREADY_PRO');
  });
});
```

### Step 3: E2E 테스트 및 네트워크 제어 (Playwright)

브라우저 환경에서의 사용자 시나리오를 검증하되, **외부 요인에 의해 테스트가 깨지지 않도록** 한다.

*   **설정 (`playwright.config.ts`):** `globalSetup`을 사용하여 로그인 상태를 `playwright/.auth/user.json`에 저장하고 재사용한다.
*   **타겟:** 랜딩 페이지, 대시보드 진입, 사주 검사 폼 제출.
*   **전략:** `page.route`를 사용하여 AI 스트리밍 API와 결제 승인 API를 가로채고(Intercept), 더미 데이터를 반환한다.

**Code Example (Playwright):**
```typescript
// e2e/analysis.spec.ts
test('should display AI analysis result via mock stream', async ({ page }) => {
  // 1. API Mocking (돈 나가는 AI API 호출 차단)
  await page.route('/api/test/stream/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"text": "AI 분석 결과입니다."}\n\ndata: {"done": true}\n\n',
    });
  });

  // 2. Action
  await page.goto('/new-test');
  await page.getByRole('button', { name: '검사 시작' }).click();

  // 3. Assert
  await expect(page.getByText('AI 분석 결과입니다.')).toBeVisible();
});
```

### Step 4: CI/CD 통합 (GitHub Actions)

*   **파일:** `.github/workflows/test.yml`
*   **트리거:** `Pull Request` 및 `Push (main)`
*   **Job 구성:**
    1.  `Lint & Type Check`
    2.  `Unit Tests` (Vitest)
    3.  `E2E Tests` (Playwright) - *Artifacts에 리포트 저장 필수*

---

## 3. 파일 디렉터리 구조 (Directory Structure)

테스트 코드는 소스 코드와 최대한 가깝게 위치시킨다 (Colocation).

```text
src/
  features/
    subscription/
      backend/
        service.ts
        service.test.ts      <-- Backend Unit/Integration Tests (Vitest)
  lib/
    utils.ts
    utils.test.ts            <-- Utility Unit Tests (Vitest)
e2e/
  auth.setup.ts              <-- Global Auth Setup
  landing.spec.ts            <-- E2E Tests (Playwright)
  analysis.spec.ts
vitest.config.ts
playwright.config.ts
```

---

**[명령]** 위 지침을 바탕으로 `vitest.config.ts`, `playwright.config.ts`, 그리고 핵심 비즈니스 로직인 `subscription/backend/service.test.ts` 파일을 우선적으로 작성하십시오.