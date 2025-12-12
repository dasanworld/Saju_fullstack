# 분석 상세보기 페이지 구현 계획

**페이지**: `/analysis/[id]`
**작성일**: 2025-12-12
**버전**: 1.0

---

## 1. 프로젝트 현황 파악

### 1.1 요구사항 분석 (PRD + requirement.md 기준)

**기능 요구사항:**
- 특정 사주 검사의 상세 분석 결과를 표시
- 검사 대상자의 기본 정보 표시 (이름, 생년월일, 출생시간, 성별)
- AI 분석 결과를 마크다운 형식으로 렌더링
- 사주 카페 분위기의 UI 디자인 (따뜻한 베이지/브라운 톤)
- 하단에 "대시보드로 돌아가기", "새 검사 시작" 액션 버튼

**접근 제한:**
- 인증된 사용자만 접근 가능
- 자신의 검사 결과만 조회 가능 (Supabase RLS)

**접근 경로:**
- 대시보드에서 검사 카드 클릭
- 새 검사 완료 후 자동 리다이렉트
- URL 직접 입력

### 1.2 데이터베이스 스키마 (database.md 기준)

**tests 테이블:**
```sql
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  gender gender_type NOT NULL,
  analysis_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**API 응답 구조:**
```typescript
interface Test {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;      // YYYY-MM-DD
  birth_time: string | null; // HH:MM:SS or null
  gender: 'male' | 'female';
  analysis_result: string | null; // 마크다운
  created_at: string;      // ISO 8601
}
```

### 1.3 상태관리 설계 (state.md 기준)

**서버 상태 (React Query):**
- 쿼리 키: `['test', testId]`
- Endpoint: `GET /api/test/:id`
- Stale Time: 5분
- Cache Time: 10분

**클라이언트 상태 (useState):**
- `markdownError: boolean` - 마크다운 렌더링 오류 처리용

**Derived Data (useMemo):**
- 포맷팅된 날짜 (date-fns)
- 출생시간 표시 (null → "시간 미상", "14:30:00" → "오후 2시 30분")
- 성별 라벨 ('male' → "남성", 'female' → "여성")
- 검사 일시 포맷팅

### 1.4 공통 모듈 의존성 (common-modules.md 기준)

**필수 의존 모듈:**
- `Protected Layout` - 인증 보호 레이아웃
- `Test Module` - 검사 상세 조회 API 훅 (`useTestDetail`)
- `date-fns` - 날짜/시간 포맷팅
- `react-markdown` + `remark-gfm` - 마크다운 렌더링
- `lucide-react` - 아이콘

**재사용 가능한 기존 모듈:**
- `src/features/test/hooks/useTestDetail.ts` (생성 예정)
- `src/components/layout/protected-layout.tsx` (기존)
- `src/components/ui/*` - shadcn-ui 컴포넌트 (기존 18개)

### 1.5 기존 코드베이스 충돌 확인

**확인 결과:**
- ✅ `/analysis/[id]` 라우트 미생성 (충돌 없음)
- ✅ `src/features/test/` 모듈 존재 (backend 구현 예정)
- ✅ `useTestDetail` 훅 미생성 (신규 작성 필요)
- ✅ Protected Layout 존재 (재사용 가능)
- ✅ API 라우트 `/api/test/:id` 미구현 (Test Module에서 추가 예정)

**충돌 가능성:** 없음

---

## 2. 단계별 구현 계획

### Phase 1: Backend API 구현 (Test Module)

#### 2.1.1 API Route 추가

**파일:** `src/features/test/backend/route.ts`

**구현 내용:**
```typescript
// GET /api/test/:id
app.get("/api/test/:id", async (c) => {
  const testId = c.req.param("id");
  const user = c.get("user"); // withAuth 미들웨어에서 주입

  return respond(c, await getTestDetail(c, testId, user.id));
});
```

**QA Checklist:**
- [ ] 인증되지 않은 요청 시 401 반환
- [ ] 존재하지 않는 ID 접근 시 404 반환
- [ ] 다른 사용자의 검사 접근 시 403 반환
- [ ] 정상 요청 시 200 + Test 객체 반환
- [ ] analysis_result가 null인 경우 정상 응답 (200)

#### 2.1.2 Service Layer 구현

**파일:** `src/features/test/backend/service.ts`

**구현 내용:**
```typescript
export const getTestDetail = async (
  c: AppContext,
  testId: string,
  userId: string
): Promise<HandlerResult<Test>> => {
  const supabase = c.get("supabase");
  const logger = c.get("logger");

  // 1. 검사 조회 (user_id로 권한 검증 포함)
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .eq("id", testId)
    .eq("user_id", userId) // RLS 대신 명시적 검증
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return failure(404, testErrorCodes.TEST_NOT_FOUND, "검사를 찾을 수 없습니다.");
    }
    logger.error("Test detail fetch failed", error);
    return failure(500, testErrorCodes.INTERNAL_ERROR, "서버 오류");
  }

  return success(data);
};
```

**QA Checklist:**
- [ ] user_id 불일치 시 404 반환 (권한 없음 숨김)
- [ ] DB 오류 시 500 반환
- [ ] 정상 조회 시 Test 객체 반환
- [ ] analysis_result가 null인 경우도 정상 반환

#### 2.1.3 Error Codes 추가

**파일:** `src/features/test/backend/error.ts`

```typescript
export const testErrorCodes = {
  TEST_NOT_FOUND: "TEST_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  // ... 기존 코드
} as const;
```

---

### Phase 2: Frontend Hooks 구현

#### 2.2.1 useTestDetail 훅 생성

**파일:** `src/features/test/hooks/useTestDetail.ts`

**구현 내용:**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { Test } from '../lib/dto';

export const useTestDetail = (testId: string) => {
  return useQuery({
    queryKey: ['test', testId],
    queryFn: async () => {
      const response = await apiClient.get<Test>(`/api/test/${testId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    retry: 3,
    enabled: !!testId, // testId가 있을 때만 쿼리 실행
  });
};
```

**QA Checklist:**
- [ ] testId가 없을 때 쿼리 실행 안 함
- [ ] API 호출 실패 시 3회 재시도
- [ ] 5분간 캐시 유지
- [ ] 에러 발생 시 error 객체 반환
- [ ] 로딩 상태 `isLoading` 제공

---

### Phase 3: UI 컴포넌트 구현

#### 2.3.1 컴포넌트 구조

```
src/app/(protected)/analysis/[id]/
├── page.tsx                          # Server Component (params 처리)
└── _components/
    ├── analysis-detail-client.tsx    # Client Component (메인)
    ├── test-info-card.tsx            # 검사 정보 카드
    ├── analysis-result-section.tsx   # AI 분석 결과 섹션
    ├── action-buttons.tsx            # 하단 액션 버튼
    ├── analysis-skeleton.tsx         # 로딩 스켈레톤
    └── error-page.tsx                # 에러 페이지 (404/403/500)
```

#### 2.3.2 Server Component (page.tsx)

**파일:** `src/app/(protected)/analysis/[id]/page.tsx`

**구현 내용:**
```typescript
import { AnalysisDetailClient } from './_components/analysis-detail-client';

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AnalysisDetailClient testId={id} />;
}
```

**QA Checklist:**
- [ ] params를 Promise로 처리 (Next.js 15 규칙)
- [ ] testId를 Client Component로 전달

#### 2.3.3 Client Component (analysis-detail-client.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/analysis-detail-client.tsx`

**구현 내용:**
```typescript
'use client';

import { useState } from 'react';
import { useTestDetail } from '@/features/test/hooks/useTestDetail';
import { AnalysisSkeleton } from './analysis-skeleton';
import { ErrorPage } from './error-page';
import { TestInfoCard } from './test-info-card';
import { AnalysisResultSection } from './analysis-result-section';
import { ActionButtons } from './action-buttons';

interface Props {
  testId: string;
}

export function AnalysisDetailClient({ testId }: Props) {
  const { data: test, isLoading, error } = useTestDetail(testId);
  const [markdownError, setMarkdownError] = useState(false);

  if (isLoading) return <AnalysisSkeleton />;
  if (error) return <ErrorPage error={error} />;
  if (!test) return <ErrorPage error={{ status: 404 }} />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <TestInfoCard test={test} />
      <AnalysisResultSection
        result={test.analysis_result}
        onError={() => setMarkdownError(true)}
        hasError={markdownError}
      />
      <ActionButtons />
    </div>
  );
}
```

**QA Checklist:**
- [ ] 로딩 중 스켈레톤 표시
- [ ] 에러 발생 시 에러 페이지 표시
- [ ] 데이터 없음 시 404 페이지 표시
- [ ] 마크다운 에러 발생 시 `markdownError` 상태 업데이트

#### 2.3.4 검사 정보 카드 (test-info-card.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/test-info-card.tsx`

**구현 내용:**
```typescript
'use client';

import { useMemo } from 'react';
import { format, parseISO, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, ClockIcon, UserIcon } from 'lucide-react';
import type { Test } from '@/features/test/lib/dto';

interface Props {
  test: Test;
}

export function TestInfoCard({ test }: Props) {
  // Derived Data
  const formattedBirthDate = useMemo(
    () => format(parseISO(test.birth_date), 'yyyy년 MM월 dd일', { locale: ko }),
    [test.birth_date]
  );

  const formattedBirthTime = useMemo(() => {
    if (!test.birth_time) return '시간 미상';
    const time = parse(test.birth_time, 'HH:mm:ss', new Date());
    return format(time, 'a h시 mm분', { locale: ko });
  }, [test.birth_time]);

  const genderLabel = test.gender === 'male' ? '남성' : '여성';

  const formattedCreatedAt = useMemo(
    () => format(parseISO(test.created_at), 'yyyy년 MM월 dd일 HH시 mm분', { locale: ko }),
    [test.created_at]
  );

  return (
    <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-amber-900">
          {test.name}님의 사주팔자 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">생년월일:</span>
          <span>{formattedBirthDate}</span>
        </div>

        <div className="flex items-center gap-2 text-amber-800">
          <ClockIcon className="w-5 h-5" />
          <span className="font-medium">출생시간:</span>
          <span>{formattedBirthTime}</span>
        </div>

        <div className="flex items-center gap-2 text-amber-800">
          <UserIcon className="w-5 h-5" />
          <span className="font-medium">성별:</span>
          <span>{genderLabel}</span>
        </div>

        <div className="text-sm text-amber-600 mt-4">
          분석 일시: {formattedCreatedAt}
        </div>
      </CardContent>
    </Card>
  );
}
```

**디자인 체크리스트:**
- [ ] 사주 카페 분위기 (베이지/오렌지 그라데이션)
- [ ] lucide-react 아이콘 사용
- [ ] 날짜/시간 한글 포맷팅 (date-fns)
- [ ] 출생시간 null 시 "시간 미상" 표시
- [ ] 성별 한글 변환

#### 2.3.5 분석 결과 섹션 (analysis-result-section.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/analysis-result-section.tsx`

**구현 내용:**
```typescript
'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  result: string | null;
  onError: () => void;
  hasError: boolean;
}

export function AnalysisResultSection({ result, onError, hasError }: Props) {
  // analysis_result가 null인 경우
  if (!result) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>분석 결과 없음</AlertTitle>
        <AlertDescription>
          분석 결과가 아직 준비되지 않았습니다. 잠시 후 다시 확인해주세요.
        </AlertDescription>
      </Alert>
    );
  }

  // 마크다운 파싱 에러 발생 시 플레인 텍스트 폴백
  if (hasError) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>형식 변환 오류</AlertTitle>
            <AlertDescription>
              형식 변환 중 오류가 발생했습니다. 원본 텍스트를 표시합니다.
            </AlertDescription>
          </Alert>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 prose prose-amber max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-bold text-amber-900 mt-6 mb-3" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-semibold text-amber-800 mt-4 mb-2" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc ml-6 text-gray-700" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-amber-500 pl-4 italic text-gray-600" {...props} />
            ),
          }}
        >
          {result}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}
```

**기능 체크리스트:**
- [ ] analysis_result가 null이면 "분석 결과 없음" Alert 표시
- [ ] 마크다운 파싱 성공 시 HTML 렌더링
- [ ] 마크다운 파싱 에러 발생 시:
  - [ ] 에러 Alert 표시
  - [ ] 원본 텍스트 플레인 텍스트로 표시
- [ ] prose-amber 스타일 적용
- [ ] 커스텀 h2/h3/ul/blockquote 스타일

#### 2.3.6 액션 버튼 (action-buttons.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/action-buttons.tsx`

**구현 내용:**
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

export function ActionButtons() {
  const router = useRouter();

  return (
    <div className="flex gap-3 justify-center">
      <Button
        variant="outline"
        onClick={() => router.push('/dashboard')}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        대시보드로 돌아가기
      </Button>

      <Button
        onClick={() => router.push('/new-test')}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        새 검사 시작
      </Button>
    </div>
  );
}
```

**QA Checklist:**
- [ ] "대시보드로 돌아가기" 클릭 시 `/dashboard` 이동
- [ ] "새 검사 시작" 클릭 시 `/new-test` 이동
- [ ] 아이콘 표시 (ArrowLeft, Plus)
- [ ] Primary/Secondary 버튼 variant

#### 2.3.7 로딩 스켈레톤 (analysis-skeleton.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/analysis-skeleton.tsx`

**구현 내용:**
```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function AnalysisSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 정보 카드 스켈레톤 */}
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-10 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3 mt-4" />
        </CardContent>
      </Card>

      {/* 분석 결과 스켈레톤 */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2 mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>

      {/* 버튼 스켈레톤 */}
      <div className="flex gap-3 justify-center">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
```

#### 2.3.8 에러 페이지 (error-page.tsx)

**파일:** `src/app/(protected)/analysis/[id]/_components/error-page.tsx`

**구현 내용:**
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';

interface Props {
  error: {
    status?: number;
    message?: string;
  };
}

export function ErrorPage({ error }: Props) {
  const router = useRouter();

  const getErrorMessage = () => {
    switch (error.status) {
      case 404:
        return {
          title: '검사를 찾을 수 없습니다',
          description: '요청하신 검사 결과가 존재하지 않습니다.',
        };
      case 403:
        return {
          title: '접근 권한이 없습니다',
          description: '이 검사 결과를 볼 수 있는 권한이 없습니다.',
        };
      case 500:
        return {
          title: '서버 오류가 발생했습니다',
          description: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        };
      default:
        return {
          title: '오류가 발생했습니다',
          description: error.message || '알 수 없는 오류가 발생했습니다.',
        };
    }
  };

  const { title, description } = getErrorMessage();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <Button onClick={() => router.push('/dashboard')} className="gap-2">
            <Home className="w-4 h-4" />
            대시보드로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**QA Checklist:**
- [ ] 404 에러: "검사를 찾을 수 없습니다" 메시지
- [ ] 403 에러: "접근 권한이 없습니다" 메시지
- [ ] 500 에러: "서버 오류가 발생했습니다" 메시지
- [ ] 대시보드로 돌아가기 버튼

---

### Phase 4: 라우팅 및 접근 제어

#### 2.4.1 Protected Layout 적용

**파일:** `src/app/(protected)/analysis/[id]/page.tsx`

```typescript
// (protected) 그룹에 포함되므로 자동으로 Protected Layout 적용
// layout.tsx는 이미 존재
```

**QA Checklist:**
- [ ] 미인증 사용자 접근 시 로그인 페이지로 리다이렉트
- [ ] Global Nav 표시
- [ ] 좌측 네비게이션 + 우측 메인 컨텐츠 레이아웃

---

## 3. 종합 QA 체크리스트

### 3.1 기능 테스트

#### 정상 흐름
- [ ] 대시보드에서 검사 카드 클릭 → 분석 상세보기 페이지 진입
- [ ] 새 검사 완료 후 자동 리다이렉트 → 분석 상세보기 표시
- [ ] 검사 정보 카드 정상 표시 (이름, 생년월일, 출생시간, 성별)
- [ ] AI 분석 결과 마크다운 렌더링 정상 작동
- [ ] "대시보드로 돌아가기" 버튼 클릭 → `/dashboard` 이동
- [ ] "새 검사 시작" 버튼 클릭 → `/new-test` 이동

#### 엣지케이스
- [ ] 존재하지 않는 검사 ID 접근 시 404 에러 페이지 표시
- [ ] 다른 사용자의 검사 접근 시 404 에러 페이지 표시 (권한 숨김)
- [ ] analysis_result가 null인 경우 "분석 결과 없음" Alert 표시
- [ ] 마크다운 파싱 에러 발생 시 플레인 텍스트 폴백
- [ ] 출생시간이 null인 경우 "시간 미상" 표시
- [ ] 네트워크 오류 발생 시 에러 페이지 표시
- [ ] 미인증 사용자 접근 시 로그인 페이지로 리다이렉트

### 3.2 UI/UX 테스트

- [ ] 사주 카페 분위기 UI (베이지/브라운 톤) 적용
- [ ] 로딩 중 스켈레톤 UI 표시
- [ ] 반응형 디자인 (모바일, 태블릿, 데스크탑)
- [ ] 아이콘 정상 표시 (lucide-react)
- [ ] 버튼 호버 효과
- [ ] 카드 그림자 효과

### 3.3 접근성 테스트

- [ ] 정보 카드에 `role="region"`, `aria-label="검사 대상자 정보"` 적용
- [ ] 분석 결과에 `role="article"`, `aria-label="사주팔자 분석 결과"` 적용
- [ ] 버튼 Tab 키 포커스 이동 가능
- [ ] Enter/Space 키로 버튼 클릭 가능
- [ ] 이미지에 `alt` 텍스트 (해당 시)
- [ ] 로딩 상태 `aria-live="polite"` 적용
- [ ] 에러 메시지 `role="alert"` 적용

### 3.4 성능 테스트

- [ ] React Query 캐싱 작동 확인 (5분 stale time)
- [ ] 중복 API 호출 방지
- [ ] 마크다운 렌더링 useMemo 최적화
- [ ] 날짜 포맷팅 useMemo 최적화
- [ ] 대시보드에서 prefetch 동작 확인 (향후 개선)

---

## 4. 충돌 방지 확인 (3회 검증)

### 검증 1차: 모듈 의존성
- ✅ `useTestDetail` 훅은 `apiClient`만 의존 (다른 Feature 모듈과 독립)
- ✅ 컴포넌트는 `Test` 타입만 의존 (DTO로 재노출)
- ✅ `date-fns`, `react-markdown` 외부 라이브러리 사용 (프로젝트 표준)

### 검증 2차: 라우트 충돌
- ✅ `/analysis/[id]` 라우트 미생성 (신규)
- ✅ `GET /api/test/:id` API 엔드포인트 미사용 (신규)
- ✅ `(protected)` 그룹 내 위치 (인증 보호 자동 적용)

### 검증 3차: 기존 코드베이스 변경사항
- ✅ `src/features/test/backend/route.ts` - GET 라우트 1개 추가
- ✅ `src/features/test/backend/service.ts` - `getTestDetail` 함수 1개 추가
- ✅ `src/features/test/backend/error.ts` - 에러 코드 1개 추가
- ✅ `src/features/test/hooks/useTestDetail.ts` - 신규 파일 생성
- ✅ 기존 코드 수정 없음 (추가만)

**충돌 가능성:** 없음

---

## 5. 패키지 의존성

### 5.1 필수 패키지 (package.json 확인 필요)

```bash
# 이미 설치되어 있어야 할 패키지
npm install react-markdown remark-gfm
npm install date-fns
npm install lucide-react
npm install @tanstack/react-query
```

### 5.2 shadcn-ui 컴포넌트 (이미 설치됨)

```bash
# 이미 설치된 컴포넌트 (18개)
- card
- button
- skeleton
- alert
```

---

## 6. 구현 순서 및 예상 소요 시간

### 6.1 구현 순서

1. **Backend API 구현** ⏱️ 1.5h
   - `src/features/test/backend/route.ts` 수정 (30분)
   - `src/features/test/backend/service.ts` 수정 (45분)
   - `src/features/test/backend/error.ts` 수정 (15분)

2. **Frontend Hooks 구현** ⏱️ 0.5h
   - `src/features/test/hooks/useTestDetail.ts` 생성 (30분)

3. **UI 컴포넌트 구현** ⏱️ 2.5h
   - `page.tsx` 생성 (15분)
   - `analysis-detail-client.tsx` 생성 (30분)
   - `test-info-card.tsx` 생성 (45분)
   - `analysis-result-section.tsx` 생성 (45분)
   - `action-buttons.tsx` 생성 (15분)
   - `analysis-skeleton.tsx` 생성 (15분)
   - `error-page.tsx` 생성 (15분)

4. **테스트 및 QA** ⏱️ 1.5h
   - 기능 테스트 (45분)
   - UI/UX 테스트 (30분)
   - 접근성 테스트 (15분)

**총 예상 소요 시간: 6시간**

### 6.2 병렬 작업 가능 구간

- Backend API 구현 + Frontend Hooks 구현 (병렬 가능)
- UI 컴포넌트 각각 독립적으로 구현 가능

---

## 7. 향후 개선 사항

### 7.1 단기 개선 (v1.1)

- [ ] **인쇄 기능** - "결과 인쇄" 버튼 추가, `@media print` CSS 정의
- [ ] **공유 기능** - 링크 복사 버튼 (Clipboard API)
- [ ] **Prefetching** - 대시보드에서 카드 호버 시 prefetch

### 7.2 중기 개선 (v1.2)

- [ ] **재분석 요청** - analysis_result가 null일 때 "재분석 요청" 버튼
- [ ] **PDF 다운로드** - 분석 결과를 PDF로 변환 (jsPDF 또는 서버사이드 렌더링)
- [ ] **소셜 공유** - 이미지 생성 후 소셜 미디어 공유

### 7.3 장기 개선 (v2.0)

- [ ] **분석 비교** - 여러 검사 결과 비교 기능
- [ ] **커스텀 템플릿** - 분석 결과 레이아웃 커스터마이징
- [ ] **음성 읽기** - Web Speech API로 분석 결과 읽어주기

---

## 8. 문서 체크리스트

### 8.1 참조한 문서

- ✅ `/docs/prd.md` - 페이지 요구사항 확인
- ✅ `/docs/requirement.md` - 기본 요구사항 확인
- ✅ `/docs/userflow.md` - 사용자 플로우 확인
- ✅ `/docs/database.md` - 데이터베이스 스키마 확인
- ✅ `/docs/common-modules.md` - 공통 모듈 의존성 확인
- ✅ `/docs/pages/4-analysis-detail/state.md` - 상태관리 설계 확인

### 8.2 검증한 항목

- ✅ 기존 코드베이스 충돌 확인 (3회)
- ✅ 모듈 의존성 확인
- ✅ API 라우트 충돌 확인
- ✅ UI 컴포넌트 재사용 가능성 확인
- ✅ 패키지 의존성 확인

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**충돌 검증**: 3회 완료
**예상 소요 시간**: 6시간
**준비 완료**: ✅
