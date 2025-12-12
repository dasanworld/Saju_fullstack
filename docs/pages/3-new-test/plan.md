# 새 검사 페이지 (`/new-test`) 구현 계획

**페이지 번호**: 3
**페이지명**: 새 검사 (새 분석하기)
**경로**: `/new-test`
**우선순위**: P0 (필수)
**작성일**: 2025-12-12

---

## 1. 개요

사용자가 사주팔자 분석을 위한 개인 정보를 입력하고 AI 분석을 요청하는 페이지입니다. React Hook Form을 사용하여 폼 상태를 관리하고, Gemini API를 통해 분석을 수행합니다.

### 1.1 페이지 목적
- 사주 검사를 위한 정보 입력 (이름, 생년월일, 출생시간, 성별)
- 잔여 횟수 확인 및 검증
- Gemini API 호출 후 분석 결과 페이지로 리다이렉트

### 1.2 주요 기능
- 폼 입력 및 유효성 검증 (React Hook Form + Zod)
- 캘린더 컴포넌트를 통한 생년월일 선택
- 시간 선택 컴포넌트를 통한 출생시간 입력
- "출생시간 모름" 체크박스로 시간 입력 스킵
- 성별 선택 (라디오 버튼)
- 검사 시작 버튼 클릭 시 API 호출 및 로딩 상태 표시

---

## 2. 기존 코드베이스 분석

### 2.1 이미 구현된 모듈
✅ **Backend API (완료)**
- `src/features/test/backend/route.ts`: `POST /api/test/create` 라우트
- `src/features/test/backend/service.ts`: `createTest` 서비스 로직
- `src/features/test/backend/schema.ts`: 요청/응답 스키마 정의
- `src/lib/gemini/client.ts`: Gemini API 클라이언트

✅ **공통 UI 컴포넌트 (설치됨)**
- `src/components/ui/form.tsx`: React Hook Form 래퍼
- `src/components/ui/input.tsx`: 텍스트 입력
- `src/components/ui/button.tsx`: 버튼
- `src/components/ui/label.tsx`: 라벨
- `src/components/ui/checkbox.tsx`: 체크박스
- `src/components/ui/select.tsx`: 셀렉트 박스

### 2.2 추가 필요 컴포넌트
❌ **Calendar 컴포넌트** (추가 필요)
```bash
npx shadcn@latest add calendar
npx shadcn@latest add popover  # Calendar가 의존
```

❌ **Radio Group 컴포넌트** (추가 필요)
```bash
npx shadcn@latest add radio-group
```

❌ **시간 선택 컴포넌트** (커스텀 구현 필요)
- shadcn-ui에는 기본 시간 선택 컴포넌트가 없음
- `react-datepicker` 또는 커스텀 Select 기반 구현

### 2.3 Backend API 상세

#### 엔드포인트
```typescript
POST /api/test/create
```

#### 요청 스키마 (이미 구현됨)
```typescript
{
  name: string;           // 1-50자
  birth_date: string;     // YYYY-MM-DD 형식
  birth_time: string | null;  // HH:MM 또는 null
  gender: "male" | "female";
}
```

#### 응답 스키마 (이미 구현됨)
```typescript
// Success
{
  test_id: string;         // UUID
  analysis_result: string; // 마크다운 분석 결과
}

// Error (403 - 잔여 횟수 0)
{
  error: "INSUFFICIENT_TESTS",
  message: "검사 횟수를 모두 사용했습니다"
}
```

#### 처리 플로우 (이미 구현됨)
1. 인증 확인 (Clerk 세션)
2. 구독 정보 조회 → `remaining_tests > 0` 확인
3. `tests` 테이블에 레코드 생성
4. Gemini API 호출 (Free: flash, Pro: pro)
5. `analysis_result` 업데이트
6. `remaining_tests` 차감
7. 응답 반환

---

## 3. 구현 계획

### 3.1 디렉토리 구조

```
src/app/(protected)/new-test/
└── page.tsx                 # 새 검사 페이지 (Client Component)

src/features/test/
├── components/
│   ├── new-test-form.tsx    # 검사 폼 메인 컴포넌트
│   ├── birth-date-picker.tsx  # 생년월일 캘린더 선택
│   ├── birth-time-picker.tsx  # 출생시간 선택 (커스텀)
│   └── gender-selector.tsx   # 성별 라디오 버튼
├── hooks/
│   └── useCreateTest.ts      # 검사 생성 훅 (React Query)
└── lib/
    └── dto.ts                # 클라이언트용 DTO 재노출
```

### 3.2 구현 단계

#### 단계 1: shadcn-ui 컴포넌트 설치
```bash
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add radio-group
```

#### 단계 2: React Query 훅 구현
**파일**: `src/features/test/hooks/useCreateTest.ts`

```typescript
'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CreateTestRequest, CreateTestResponse } from '../lib/dto';

export const useCreateTest = () => {
  return useMutation({
    mutationFn: async (input: CreateTestRequest) => {
      const response = await apiClient.post<CreateTestResponse>(
        '/api/test/create',
        input
      );
      return response.data;
    },
  });
};
```

#### 단계 3: DTO 재노출
**파일**: `src/features/test/lib/dto.ts`

```typescript
export type {
  CreateTestRequest,
  CreateTestResponse,
  TestListResponse,
  TestDetailResponse,
} from '../backend/schema';
```

#### 단계 4: 생년월일 선택 컴포넌트
**파일**: `src/features/test/components/birth-date-picker.tsx`

```typescript
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BirthDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

export const BirthDatePicker = ({ value, onChange }: BirthDatePickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, 'yyyy년 MM월 dd일', { locale: ko })
          ) : (
            <span>날짜를 선택하세요</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
```

#### 단계 5: 출생시간 선택 컴포넌트
**파일**: `src/features/test/components/birth-time-picker.tsx`

```typescript
'use client';

import { Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BirthTimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

export const BirthTimePicker = ({ value, onChange, disabled }: BirthTimePickerProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const [hour, minute] = value ? value.split(':').map(Number) : [12, 0];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour.padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${String(hour).padStart(2, '0')}:${newMinute.padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select value={String(hour)} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select value={String(minute)} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.filter((m) => m % 5 === 0).map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, '0')}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
```

#### 단계 6: 성별 선택 컴포넌트
**파일**: `src/features/test/components/gender-selector.tsx`

```typescript
'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface GenderSelectorProps {
  value?: string;
  onChange: (gender: 'male' | 'female') => void;
}

export const GenderSelector = ({ value, onChange }: GenderSelectorProps) => {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="male" id="male" />
        <Label htmlFor="male" className="cursor-pointer">
          남성
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="female" id="female" />
        <Label htmlFor="female" className="cursor-pointer">
          여성
        </Label>
      </div>
    </RadioGroup>
  );
};
```

#### 단계 7: 메인 폼 컴포넌트
**파일**: `src/features/test/components/new-test-form.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { BirthDatePicker } from './birth-date-picker';
import { BirthTimePicker } from './birth-time-picker';
import { GenderSelector } from './gender-selector';
import { useCreateTest } from '../hooks/useCreateTest';

const formSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름은 50자 이내로 입력해주세요'),
  birth_date: z.date({ required_error: '생년월일을 선택해주세요' }),
  birth_time: z.string().nullable(),
  birth_time_unknown: z.boolean().default(false),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택해주세요' }),
});

type FormData = z.infer<typeof formSchema>;

export const NewTestForm = () => {
  const router = useRouter();
  const { mutate: createTest, isPending } = useCreateTest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      birth_date: undefined,
      birth_time: '12:00',
      birth_time_unknown: false,
      gender: undefined,
    },
  });

  const birthTimeUnknown = form.watch('birth_time_unknown');

  const onSubmit = (data: FormData) => {
    const requestData = {
      name: data.name,
      birth_date: format(data.birth_date, 'yyyy-MM-dd'),
      birth_time: data.birth_time_unknown ? null : data.birth_time,
      gender: data.gender,
    };

    createTest(requestData, {
      onSuccess: (response) => {
        toast({
          title: '분석이 완료되었습니다!',
          description: '결과 페이지로 이동합니다.',
        });
        router.push(`/analysis/${response.test_id}`);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || '검사 생성에 실패했습니다';

        if (error.response?.status === 403) {
          toast({
            title: '검사 횟수를 모두 사용했습니다',
            description: 'Pro 플랜으로 업그레이드하면 월 10회 검사를 이용하실 수 있습니다.',
            action: (
              <Button
                variant="outline"
                onClick={() => router.push('/subscription')}
              >
                Pro로 업그레이드
              </Button>
            ),
          });
        } else {
          toast({
            title: '오류가 발생했습니다',
            description: message,
            variant: 'destructive',
          });
        }
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 이름 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="예) 홍길동" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 생년월일 */}
        <FormField
          control={form.control}
          name="birth_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>생년월일</FormLabel>
              <FormControl>
                <BirthDatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 출생시간 */}
        <FormField
          control={form.control}
          name="birth_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>출생시간</FormLabel>
              <FormControl>
                <BirthTimePicker
                  value={field.value || '12:00'}
                  onChange={field.onChange}
                  disabled={birthTimeUnknown}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 출생시간 모름 */}
        <FormField
          control={form.control}
          name="birth_time_unknown"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>출생시간 모름</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* 성별 */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>성별</FormLabel>
              <FormControl>
                <GenderSelector value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 제출 버튼 */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI가 분석하고 있습니다...
            </>
          ) : (
            '검사 시작'
          )}
        </Button>
      </form>
    </Form>
  );
};
```

#### 단계 8: 페이지 컴포넌트
**파일**: `src/app/(protected)/new-test/page.tsx`

```typescript
'use client';

import { NewTestForm } from '@/features/test/components/new-test-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewTestPage() {
  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">새 사주 검사</CardTitle>
          <CardDescription>
            사주팔자 분석을 위한 정보를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTestForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 4. 엣지케이스 처리

### 4.1 잔여 횟수 0일 때
**시나리오**: Free 플랜 사용자가 3회를 모두 소진한 후 검사 시도

**처리**:
1. API 응답: 403 Forbidden + `"INSUFFICIENT_TESTS"` 에러 코드
2. Toast 메시지 표시:
   - 제목: "검사 횟수를 모두 사용했습니다"
   - 내용: "Pro 플랜으로 업그레이드하면 월 10회 검사를 이용하실 수 있습니다."
   - 액션 버튼: "Pro로 업그레이드" (→ `/subscription` 이동)

**구현**: `onError` 콜백에서 `error.response.status === 403` 체크

### 4.2 Gemini API 타임아웃/실패
**시나리오**: AI 서버 과부하로 응답 지연 또는 실패

**처리**:
1. Backend에서 에러 반환 (500 + `"GEMINI_API_FAILED"`)
2. 잔여 횟수 차감 없음 (롤백)
3. Toast 에러 메시지: "AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요."

**구현**: Backend 이미 구현됨 (`service.ts`에서 롤백 처리)

### 4.3 출생시간 모름 체크 시
**시나리오**: 출생시간을 모르는 경우

**처리**:
1. 체크박스 선택 시 시간 선택 컴포넌트 비활성화 (`disabled={birthTimeUnknown}`)
2. API 요청 시 `birth_time: null` 전송
3. Gemini 프롬프트에 "출생시간: 미상" 포함

**구현**:
- 폼에서 `birth_time_unknown` 필드로 제어
- `onSubmit`에서 조건부로 `null` 전송

### 4.4 생년월일 미래 날짜 입력
**시나리오**: 사용자가 오늘 이후 날짜를 입력 시도

**처리**:
1. Calendar 컴포넌트의 `disabled` prop으로 오늘 이후 날짜 비활성화
2. `disabled={(date) => date > new Date()}`

**구현**: `BirthDatePicker` 컴포넌트에 이미 포함

### 4.5 중복 요청 방지
**시나리오**: 사용자가 검사 시작 버튼을 연타

**처리**:
1. `isPending` 상태로 버튼 비활성화
2. `<Button disabled={isPending}>`

**구현**: React Query `useMutation`의 `isPending` 사용

---

## 5. UI/UX 상세

### 5.1 레이아웃
- Protected Layout 사용 (Global Nav + Main Content)
- 중앙 정렬 카드 형태 (`max-w-2xl`)
- Notion 스타일 간결한 디자인

### 5.2 폼 필드 순서
1. 이름 (텍스트 입력)
2. 생년월일 (캘린더 팝오버)
3. 출생시간 (시간 선택 드롭다운)
4. 출생시간 모름 (체크박스)
5. 성별 (라디오 버튼)
6. 검사 시작 (버튼)

### 5.3 로딩 상태
- 버튼 텍스트: "AI가 분석하고 있습니다..."
- 스피너 아이콘 표시 (`Loader2` from lucide-react)
- 버튼 비활성화

### 5.4 에러 표시
- 필드별 에러 메시지 (FormMessage로 표시)
- API 에러는 Toast로 표시 (우측 상단)

---

## 6. 의존성 및 충돌 확인

### 6.1 기존 모듈 재사용
✅ **Backend API**: 모두 구현 완료, 수정 불필요
✅ **Gemini Client**: 구현 완료
✅ **Supabase Client**: 구현 완료
✅ **API Client**: 구현 완료

### 6.2 새로운 의존성
- `date-fns`: 날짜 포맷팅 (이미 설치됨 - 확인 필요)
- `@hookform/resolvers`: Zod resolver (이미 설치됨 - 확인 필요)
- shadcn-ui 컴포넌트: calendar, popover, radio-group (추가 필요)

### 6.3 충돌 가능성
❌ **없음**: 모든 새 파일은 `src/features/test/components/`, `src/app/(protected)/new-test/` 하위에 생성
❌ **라우트 충돌 없음**: `/new-test` 경로는 신규

---

## 7. 테스트 체크리스트

### 7.1 정상 플로우
- [ ] Free 플랜 사용자로 로그인
- [ ] 모든 필드 입력 후 검사 시작
- [ ] 로딩 상태 확인
- [ ] 분석 완료 후 `/analysis/[id]` 리다이렉트
- [ ] Global Nav 잔여 횟수 차감 확인

### 7.2 출생시간 없이 검사
- [ ] "출생시간 모름" 체크
- [ ] 시간 선택 비활성화 확인
- [ ] 검사 시작
- [ ] 분석 결과에 시간 미상 반영 확인

### 7.3 잔여 횟수 0 시나리오
- [ ] 잔여 횟수 0인 계정으로 로그인
- [ ] 검사 시도
- [ ] Toast 에러 메시지 확인
- [ ] "Pro로 업그레이드" 버튼 동작 확인

### 7.4 유효성 검증
- [ ] 이름 미입력 시 에러 메시지
- [ ] 생년월일 미선택 시 에러 메시지
- [ ] 성별 미선택 시 에러 메시지
- [ ] 미래 날짜 선택 불가 확인

---

## 8. 개발 순서

### 8.1 Phase 1: 기본 설정
1. shadcn-ui 컴포넌트 설치 (calendar, popover, radio-group)
2. 필요한 라이브러리 설치 확인 (date-fns, @hookform/resolvers)

### 8.2 Phase 2: 컴포넌트 구현
1. `birth-date-picker.tsx` (생년월일 선택)
2. `birth-time-picker.tsx` (출생시간 선택)
3. `gender-selector.tsx` (성별 선택)

### 8.3 Phase 3: 훅 및 DTO
1. `useCreateTest.ts` (React Query 훅)
2. `lib/dto.ts` (스키마 재노출)

### 8.4 Phase 4: 메인 폼 및 페이지
1. `new-test-form.tsx` (메인 폼)
2. `page.tsx` (페이지)

### 8.5 Phase 5: 테스트
1. 정상 플로우 테스트
2. 엣지케이스 테스트
3. UI/UX 검증

---

## 9. 예상 작업 시간

| 단계 | 작업 내용 | 예상 시간 |
|------|-----------|-----------|
| Phase 1 | 설정 | 30분 |
| Phase 2 | 컴포넌트 구현 | 2시간 |
| Phase 3 | 훅 및 DTO | 30분 |
| Phase 4 | 메인 폼 및 페이지 | 2시간 |
| Phase 5 | 테스트 | 1시간 |
| **총계** | | **6시간** |

---

## 10. 완료 조건

✅ **기능 구현**
- [ ] 모든 폼 필드가 정상 작동
- [ ] API 호출 및 응답 처리 완료
- [ ] 에러 핸들링 완료
- [ ] 로딩 상태 표시

✅ **UI/UX**
- [ ] Notion 스타일 적용
- [ ] 반응형 레이아웃
- [ ] 접근성 (키보드 네비게이션, ARIA 레이블)

✅ **테스트**
- [ ] 정상 플로우 통과
- [ ] 모든 엣지케이스 통과
- [ ] Cross-browser 테스트

✅ **문서**
- [ ] 코드 주석 작성
- [ ] README 업데이트 (필요 시)

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**최종 검증**: DRY 원칙 준수, 기존 코드베이스 충돌 없음
