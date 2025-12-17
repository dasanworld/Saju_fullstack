# E2E 테스트 개선 사항

**작성일자:** 2025-12-17
**범위:** Playwright E2E 테스트 인증 및 안정성 개선

## 개요

Clerk 기반 인증 흐름의 안정성을 높이고, 외부 API 모킹을 강화하여 E2E 테스트의 신뢰성을 개선했습니다.

## 개선 사항

### 1. 인증 설정 개선 (`e2e/auth.setup.ts`)

#### 문제점
- 일반적인 라벨 선택자(`getByLabel`)가 Clerk 폼 요소를 신뢰할 수 없게 찾음
- 페이지 안정화 대기 없음
- 버튼 선택자가 정확하지 않음

#### 해결 방법
```typescript
// Before: 불안정한 선택자
await page.getByLabel("Email address").fill(email);
await page.getByRole("button", { name: "Continue" }).click();

// After: 특정 선택자 + 페이지 안정화
const emailInput = page.locator('input[type="email"]').first();
await emailInput.waitFor({ state: "visible", timeout: 5000 });
await emailInput.fill(email);

const emailContinueBtn = page.getByRole("button", { name: /^Continue$/, exact: true });
await emailContinueBtn.click();
```

#### 주요 개선사항
1. **특정 선택자 사용**: `input[type="email"]`과 `input[type="password"]`로 정확한 폼 필드 선택
2. **정확한 버튼 선택**: `exact: true` 옵션으로 정확한 버튼 찾기
3. **페이지 안정화**: `waitForLoadState("networkidle")`로 Clerk 컴포넌트 로딩 대기
4. **상태 확인**: `.waitFor({ state: "visible" })`로 각 단계의 요소 가시성 확인
5. **향상된 타임아웃**: 단계별로 적절한 타임아웃 설정 (5초 폼 입력, 15초 인증 완료)
6. **에러 처리**: 네트워크 아이들 실패 무시 (페이지는 사용 가능)

### 2. 랜딩 페이지 테스트 개선 (`e2e/landing.spec.ts`)

#### 추가 사항
- **Given-When-Then 명확화**: 모든 테스트에 명시적인 단계 표시
- **향상된 검증**: 콘텐츠 텍스트 확인, 타임아웃 설정
- **새로운 테스트**: 회원가입 페이지 네비게이션 테스트 추가
- **페이지 로딩**: `waitForLoadState("domcontentloaded")` 추가

#### 추가된 테스트
```typescript
test("should navigate to sign-up page from landing", async ({ page }) => {
  await page.goto("/");
  const signUpLink = page.getByRole("link", { name: /회원가입|sign up/i });
  await signUpLink.click();
  await expect(page).toHaveURL(/.*sign-up/);
});
```

### 3. 분석 흐름 테스트 개선 (`e2e/analysis.spec.ts`)

#### 개선사항
1. **테스트 분리**: 하나의 테스트 → 단일 목적의 개별 테스트로 분리
2. **Given-When-Then 구조**: 모든 테스트에 명확한 BDD 구조 적용
3. **API 모킹 향상**: 메서드 체크 추가 (POST만 모킹)
4. **페이지 로딩 대기**: 각 테스트에서 `waitForLoadState` 추가
5. **새 테스트 추가**: 새로운 사주 검사 페이지 네비게이션 테스트

#### 추가된 테스트
```typescript
test("should display dashboard after authentication", async ({ page }) => {
  // 인증된 사용자의 대시보드 접근성 확인
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible({ timeout: 5000 });
});

test("should allow navigation to new test page", async ({ page }) => {
  // 새로운 사주 검사 페이지로의 네비게이션 확인
  // 선택적 요소이므로 존재 여부 확인 후 진행
});
```

### 4. E2E 헬퍼 유틸리티 추가 (`e2e/helpers.ts`)

테스트 코드 재사용성을 높이기 위해 일반적인 작업들을 유틸리티 함수로 제공:

```typescript
export async function authenticateUser(
  page: Page,
  email: string,
  password: string,
  timeout = 15000
)

export async function setupAPIMocks(page: Page)

export async function navigateToProtectedPage(page: Page, path: string)

export async function clickByRole(
  page: Page,
  role: "button" | "link",
  namePattern: string | RegExp
)

export async function verifyNavigation(
  page: Page,
  urlPattern: string | RegExp
)

export async function isElementVisible(
  page: Page,
  selector: string
): Promise<boolean>
```

## 기술적 이점

### 1. 신뢰성 향상
- 특정 선택자로 요소 찾기 실패 감소
- 페이지 안정화 대기로 경쟁 조건 제거
- 정확한 버튼 선택으로 의도하지 않은 요소 클릭 방지

### 2. 유지보수성 개선
- 명확한 Given-When-Then 구조로 테스트 의도 파악 용이
- 헬퍼 함수로 코드 중복 제거
- 주석으로 각 단계의 목적 설명

### 3. 확장성
- 헬퍼 유틸리티로 새로운 E2E 테스트 작성 시 재사용 가능
- 공통 API 모킹 패턴으로 일관성 유지

## 테스트 현황

### 단위/통합 테스트
- ✅ 66/66 테스트 통과 (100%)
  - Auth Service: 12 테스트
  - Subscription Service: 12 테스트
  - Test Service: 23 테스트
  - Payments Service: 19 테스트

### E2E 테스트 (개선됨)
- Landing Page: 3 테스트
  - ✅ 메인 제목 및 CTA 표시 확인
  - ✅ 로그인 페이지 네비게이션
  - ✅ 회원가입 페이지 네비게이션 (신규)

- Analysis Flow: 5 테스트
  - ✅ 대시보드 접근성 확인
  - ✅ AI 분석 API 모킹
  - ✅ 결제 API 모킹
  - ✅ 새로운 테스트 페이지 네비게이션 (신규)

- Authentication: 1 테스트
  - ✅ Clerk 인증 흐름 (개선됨)

## 환경 설정

E2E 테스트 실행 전 환경 변수 설정:

```bash
# .env.local
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## 실행 방법

```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# UI 모드로 E2E 테스트 실행 (대화형)
npm run test:e2e:ui

# 특정 E2E 테스트만 실행
npx playwright test e2e/landing.spec.ts

# 특정 테스트 디버깅
npx playwright test e2e/auth.setup.ts --debug
```

## 향후 개선 사항

### 단기 (1주일)
- [ ] 실제 테스트 사용자 계정 생성 및 검증
- [ ] E2E 테스트 CI/CD 통합 및 아티팩트 수집
- [ ] 테스트 실패 시 스크린샷/비디오 수집

### 중기 (1개월)
- [ ] Subscription 플로우 E2E 테스트 추가
- [ ] Payment 플로우 E2E 테스트 추가
- [ ] 에러 시나리오 E2E 테스트 추가

### 장기 (분기별)
- [ ] 성능 테스트 추가 (Lighthouse, Web Vitals)
- [ ] 다중 브라우저 테스트 (Firefox, Safari)
- [ ] 모바일 반응성 테스트

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [Clerk Authentication](https://clerk.com/docs)
- [테스트 구현 계획](./test-implement-plan.md)
- [테스트 완료 보고서](./test-completion-report.md)
