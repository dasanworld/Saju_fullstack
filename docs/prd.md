# Product Requirements Document (PRD)
# Saju피아 - AI 기반 사주팔자 분석 SaaS

---

## 1. 제품 개요

### 1.1 제품명
**Saju피아** (Saju-pia)

### 1.2 제품 설명
Google Gemini AI를 활용하여 사용자의 생년월일, 출생시간 정보를 기반으로 천간·지지를 계산하고 사주팔자를 자연어로 분석해주는 구독형 SaaS 서비스입니다.

### 1.3 핵심 가치 제안
- **AI 기반 정확한 분석**: Google Gemini 2.5 모델을 활용한 전문적인 사주팔자 해석
- **합리적인 가격**: 무료 체험 제공 및 월 3,900원의 저렴한 구독료
- **영구 보관**: 검사 내역을 영구적으로 저장하여 언제든지 재확인 가능
- **간편한 사용성**: Google 로그인을 통한 쉬운 가입 및 이용

### 1.4 기술 스택
- **Frontend**: Next.js (React)
- **Backend**: Next.js API Routes
- **Authentication**: Clerk (Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Payment**: 토스페이먼츠 (정기결제/빌링키)
- **AI**: Google Gemini API (2.5-flash, 2.5-pro)
- **Scheduling**: Supabase Cron

---

## 2. Stakeholders

### 2.1 Primary Stakeholders
| 역할 | 설명 | 책임 |
|------|------|------|
| **Product Owner** | 제품 비전 및 방향성 결정 | 요구사항 정의, 우선순위 결정 |
| **개발팀** | 기술 구현 및 운영 | 프론트엔드/백엔드 개발, API 연동, 인프라 관리 |
| **디자이너** | UI/UX 디자인 | Notion 스타일 디자인, 반응형 레이아웃 설계 |

### 2.2 Secondary Stakeholders
| 역할 | 설명 | 관심사항 |
|------|------|----------|
| **최종 사용자 (Free)** | 무료 플랜 이용자 | 3회 무료 검사, 간편한 사용성 |
| **최종 사용자 (Pro)** | 유료 구독자 | 월 10회 고품질 검사, 안정적인 결제 |
| **외부 서비스 제공자** | Clerk, Supabase, 토스페이먼츠, Google | API 안정성, 보안, 비용 |

---

## 3. 포함 페이지

### 3.1 페이지 목록
1. **메인 페이지 (랜딩페이지)** - `/`
2. **대시보드 (분석 목록)** - `/dashboard`
3. **새 검사 (새 분석하기)** - `/new-test`
4. **분석 상세보기** - `/analysis/[id]`
5. **구독 관리** - `/subscription`

### 3.2 인증 페이지 (Clerk 제공)
- **로그인** - Clerk SDK 기본 제공
- **회원가입** - Clerk SDK 기본 제공
- **프로필 관리** - Clerk SDK 기본 제공

### 3.3 페이지별 접근 권한
| 페이지 | 인증 필요 | 비고 |
|--------|-----------|------|
| 메인 페이지 | ❌ | 누구나 접근 가능 |
| 대시보드 | ✅ | 로그인 필수 |
| 새 검사 | ✅ | 로그인 필수 |
| 분석 상세보기 | ✅ | 로그인 필수 |
| 구독 관리 | ✅ | 로그인 필수 |

---

## 4. 사용자 여정 (User Journey)

### 4.1 타겟 유저 Segment

#### Segment 1: 호기심형 신규 가입자
- **특징**: 사주팔자에 관심이 있지만 비용 부담을 느끼는 사용자
- **니즈**: 무료로 체험해보고 싶음
- **행동**: 무료 3회 사용 후 서비스 품질 평가

#### Segment 2: 적극적 구독자
- **특징**: 정기적으로 사주팔자를 확인하고 싶은 사용자
- **니즈**: 더 정확한 분석, 여러 사람의 사주 확인
- **행동**: Pro 구독 후 월 10회 활용

---

### 4.2 Journey Map 1: 무료 가입자 (Free User)

```
[메인 페이지] → [회원가입] → [새 검사] → [분석 상세보기] → [대시보드] → [구독 관리]
```

| 단계 | 페이지 | 행동 | 감정 | 페인포인트 | 솔루션 |
|------|--------|------|------|------------|--------|
| 1. 발견 | 메인 페이지 (`/`) | 랜딩페이지 방문, "무료 시작하기" 클릭 | 호기심 | 서비스 이해 부족 | 히어로 섹션에서 명확한 가치 전달 |
| 2. 가입 | Clerk 회원가입 | Google 로그인으로 간편 가입 | 편리함 | 복잡한 가입 절차 | Google OAuth로 원클릭 가입 |
| 3. 첫 검사 | 새 검사 (`/new-test`) | 생년월일, 출생시간, 성별 입력 | 기대감 | 출생시간을 모를 수 있음 | "출생시간 모름" 체크박스 제공 |
| 4. 결과 확인 | 분석 상세보기 (`/analysis/[id]`) | AI 분석 결과 읽기 | 만족/실망 | 분석 품질이 기대 이하 | Gemini 2.5 Flash로 적절한 품질 보장 |
| 5. 재방문 | 대시보드 (`/dashboard`) | 과거 검사 내역 확인 | 편리함 | 검색 기능 부재 | 이름 기반 검색 기능 제공 |
| 6. 업그레이드 고려 | 구독 관리 (`/subscription`) | 무료 횟수 소진, Pro 플랜 확인 | 고민 | 가격 부담 | 3,900원 합리적 가격 제시 |

---

### 4.3 Journey Map 2: Pro 구독자 (Pro User)

```
[메인 페이지] → [회원가입] → [구독 관리] → [새 검사] → [분석 상세보기] → [대시보드]
```

| 단계 | 페이지 | 행동 | 감정 | 페인포인트 | 솔루션 |
|------|--------|------|------|------------|--------|
| 1. 전환 결정 | 구독 관리 (`/subscription`) | "Pro 시작하기" 클릭 | 결단 | 결제 복잡성 | 토스페이먼츠 SDK로 간편 결제 |
| 2. 결제 | 토스페이먼츠 | 빌링키 발급 및 첫 결제 | 불안 | 자동결제 우려 | 취소 정책 명시 (다음 결제일까지 유지) |
| 3. Pro 검사 | 새 검사 (`/new-test`) | Gemini 2.5 Pro 모델로 분석 | 만족 | Free와 차이 체감 부족 | Pro 모델의 상세한 분석 제공 |
| 4. 정기 이용 | 대시보드 (`/dashboard`) | 월 10회 검사 활용 | 일상화 | 횟수 제한 | 월 10회로 적정 횟수 제공 |
| 5. 구독 관리 | 구독 관리 (`/subscription`) | 잔여 횟수 확인, 취소 고려 | 평가 | 해지 절차 복잡 | 원클릭 취소 기능 제공 |
| 6. 자동 갱신 | (백그라운드) | Supabase Cron → 결제 API | 신뢰 | 결제 실패 시 처리 | 실패 시 즉시 구독 해지 |

---

### 4.4 Journey Map 3: 구독 취소 후 재구독자

```
[구독 관리] → [취소] → [대시보드] → [구독 관리] → [재구독]
```

| 단계 | 페이지 | 행동 | 감정 | 페인포인트 | 솔루션 |
|------|--------|------|------|------------|--------|
| 1. 구독 취소 | 구독 관리 (`/subscription`) | "구독 취소" 클릭 | 아쉬움 | 즉시 사용 불가 우려 | 다음 결제일까지 서비스 유지 |
| 2. 취소 유예 | 구독 관리 (`/subscription`) | 취소 상태 확인 | 안심 | 재구독 방법 모름 | "취소 철회" 버튼 제공 (결제일 전) |
| 3. 완전 해지 | (백그라운드) | 결제일 도래 → 빌링키 삭제 | 해방감 | - | - |
| 4. 재구독 필요 | 구독 관리 (`/subscription`) | 다시 사용하고 싶음 | 불편함 | 빌링키 재발급 필요 | 토스페이먼츠 SDK로 재구독 안내 |
| 5. 재구독 완료 | 토스페이먼츠 | 새 빌링키 발급 및 결제 | 재시작 | - | - |

---

## 5. Information Architecture (IA)

### 5.1 사이트 구조 (Tree 형태 시각화)

```
Saju피아 (Root)
│
├─ 📄 메인 페이지 (/)
│   ├─ 히어로 섹션
│   │   ├─ "무료 시작하기" → [Clerk 회원가입]
│   │   └─ "자세히 알아보기" → [서비스 섹션으로 스크롤]
│   ├─ 서비스 섹션 ("Saju피아가 특별한 이유")
│   ├─ 요금제 섹션
│   │   ├─ Free 플랜 카드 → "시작하기" → [Clerk 회원가입]
│   │   └─ Pro 플랜 카드 → "Pro 시작하기" → [구독 관리]
│   └─ FAQ 섹션
│
├─ 🔐 인증 (Clerk)
│   ├─ 로그인 (Clerk SDK)
│   ├─ 회원가입 (Google OAuth)
│   └─ 프로필 관리 (Clerk SDK)
│
├─ 📊 대시보드 (/dashboard) [인증 필요]
│   ├─ 검색 기능 (이름 기반)
│   ├─ 검사 내역 카드 리스트
│   │   └─ 각 카드 클릭 → [분석 상세보기]
│   └─ 좌측 Global Nav
│       ├─ 대시보드 (현재 페이지)
│       ├─ 새 검사 → [새 검사]
│       └─ 하단: 이메일, 잔여 횟수, 구독 정보
│
├─ ➕ 새 검사 (/new-test) [인증 필요]
│   ├─ 입력 폼
│   │   ├─ 이름 (텍스트)
│   │   ├─ 생년월일 (캘린더 선택)
│   │   ├─ 출생시간 (시간 선택)
│   │   ├─ "출생시간 모름" (체크박스)
│   │   ├─ 성별 (라디오 버튼)
│   │   └─ "검사 시작" 버튼
│   │       ├─ DB 저장 (Supabase)
│   │       └─ Gemini API 호출 → [분석 상세보기]
│   └─ 좌측 Global Nav
│
├─ 📝 분석 상세보기 (/analysis/[id]) [인증 필요]
│   ├─ 사주 카페 분위기 UI
│   ├─ 검사 정보 표시
│   │   ├─ 이름
│   │   ├─ 생년월일
│   │   ├─ 출생시간
│   │   └─ 성별
│   ├─ AI 분석 결과 (마크다운)
│   │   ├─ 천간·지지 계산
│   │   ├─ 오행 분석
│   │   ├─ 대운·세운 해석
│   │   └─ 성격/재운/건강운/연애운
│   └─ 좌측 Global Nav
│
└─ 💳 구독 관리 (/subscription) [인증 필요]
    ├─ 현재 구독 정보 카드
    │   ├─ Free 플랜
    │   │   ├─ 잔여 횟수: X/3
    │   │   ├─ 사용 모델: Gemini 2.5 Flash
    │   │   └─ "Pro로 업그레이드" → [토스페이먼츠 결제]
    │   └─ Pro 플랜
    │       ├─ 잔여 횟수: X/10
    │       ├─ 다음 결제일: YYYY-MM-DD
    │       ├─ 사용 모델: Gemini 2.5 Pro
    │       ├─ "구독 취소" → [취소 처리]
    │       └─ "취소 철회" (취소 상태일 때만 표시)
    ├─ 업그레이드 유도 카드
    │   └─ Pro 플랜 혜택 강조
    ├─ 토스페이먼츠 연동
    │   ├─ 빌링키 발급 (SDK)
    │   ├─ 첫 결제 실행
    │   └─ Supabase에 구독 정보 저장
    └─ 좌측 Global Nav
```

---

### 5.2 Global Navigation 구조 (랜딩 페이지 제외)

```
┌─────────────────────────────────────────────────┐
│ 🔮 Saju피아 (좌측 상단 로고 + 아이콘)            │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📊 대시보드                                      │
│ ➕ 새 검사                                       │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│ ─────────────────────────── (하단 고정)          │
│ 📧 user@example.com                             │
│ 🎫 잔여 횟수: X/Y                                │
│ 💎 구독: Free / Pro                             │
└─────────────────────────────────────────────────┘
```

---

### 5.3 데이터 모델 (Supabase)

#### 5.3.1 Users 테이블
```sql
users
├─ id (UUID, PK)
├─ clerk_user_id (String, Unique) -- Clerk와 연동
├─ email (String)
├─ created_at (Timestamp)
└─ updated_at (Timestamp)
```

#### 5.3.2 Subscriptions 테이블
```sql
subscriptions
├─ id (UUID, PK)
├─ user_id (UUID, FK → users.id)
├─ plan (Enum: 'free' | 'pro')
├─ status (Enum: 'active' | 'cancelled' | 'expired')
├─ billing_key (String, Nullable) -- 토스페이먼츠 빌링키
├─ current_period_start (Date)
├─ current_period_end (Date) -- 다음 결제일
├─ cancel_at_period_end (Boolean) -- 취소 예약 여부
├─ remaining_tests (Integer) -- 잔여 횟수
├─ max_tests (Integer) -- 최대 횟수 (free: 3, pro: 10)
├─ created_at (Timestamp)
└─ updated_at (Timestamp)
```

#### 5.3.3 Tests (분석 내역) 테이블
```sql
tests
├─ id (UUID, PK)
├─ user_id (UUID, FK → users.id)
├─ name (String) -- 검사 대상자 이름
├─ birth_date (Date)
├─ birth_time (Time, Nullable)
├─ gender (Enum: 'male' | 'female')
├─ model_used (Enum: 'flash' | 'pro') -- 사용된 Gemini 모델
├─ analysis_result (Text) -- 마크다운 형식 분석 결과
├─ created_at (Timestamp)
└─ updated_at (Timestamp)
```

#### 5.3.4 Payments 테이블
```sql
payments
├─ id (UUID, PK)
├─ user_id (UUID, FK → users.id)
├─ subscription_id (UUID, FK → subscriptions.id)
├─ amount (Integer) -- 3900
├─ status (Enum: 'success' | 'failed')
├─ toss_payment_key (String) -- 토스페이먼츠 결제 키
├─ error_message (String, Nullable)
├─ created_at (Timestamp)
└─ updated_at (Timestamp)
```

---

### 5.4 API Routes 구조

```
/api
├─ /auth
│   └─ /webhook (POST) -- Clerk Webhook (user.created, user.deleted)
│
├─ /subscription
│   ├─ /create (POST) -- Pro 구독 시작 (빌링키 발급 + 첫 결제)
│   ├─ /cancel (POST) -- 구독 취소 (cancel_at_period_end = true)
│   ├─ /reactivate (POST) -- 취소 철회
│   └─ /status (GET) -- 현재 구독 상태 조회
│
├─ /payment
│   └─ /charge (POST) -- 정기결제 실행 (Supabase Cron에서 호출)
│
├─ /test
│   ├─ /create (POST) -- 새 검사 생성 + Gemini API 호출
│   ├─ /list (GET) -- 대시보드 검사 내역 조회
│   └─ /[id] (GET) -- 특정 분석 상세 조회
│
└─ /cron
    └─ /daily-billing (POST) -- Supabase Cron에서 매일 02:00 호출
```

---

## 6. 기능 요구사항 (Functional Requirements)

### 6.1 인증 기능 (Clerk)

#### FR-1.1: Google 로그인
- **설명**: Google OAuth를 통한 원클릭 로그인
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] Clerk SDK 설치 및 환경변수 설정
  - [ ] Google OAuth Provider 활성화
  - [ ] 로그인 후 `/dashboard`로 리다이렉트
  - [ ] Clerk Webhook으로 Supabase에 유저 정보 동기화

#### FR-1.2: 회원가입 시 Free 플랜 자동 부여
- **설명**: 신규 가입자에게 자동으로 Free 플랜 (3회) 부여
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] `user.created` Webhook 수신 시 Supabase에 유저 생성
  - [ ] `subscriptions` 테이블에 Free 플랜 레코드 생성
  - [ ] `remaining_tests = 3`, `max_tests = 3` 설정

#### FR-1.3: 인증된 사용자만 보호된 페이지 접근
- **설명**: `/dashboard`, `/new-test`, `/analysis/[id]`, `/subscription` 접근 제어
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] Clerk Middleware로 보호된 라우트 설정
  - [ ] 미인증 사용자는 로그인 페이지로 리다이렉트

---

### 6.2 구독 관리 기능

#### FR-2.1: Pro 구독 시작
- **설명**: 토스페이먼츠 SDK를 통한 빌링키 발급 및 첫 결제
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] "Pro 시작하기" 버튼 클릭 시 토스페이먼츠 SDK 호출
  - [ ] 빌링키 발급 성공 시 `/api/subscription/create` 호출
  - [ ] 첫 결제 (3,900원) 실행
  - [ ] Supabase `subscriptions` 테이블 업데이트
    - `plan = 'pro'`
    - `status = 'active'`
    - `billing_key` 저장
    - `current_period_end = 오늘 + 1개월`
    - `remaining_tests = 10`
  - [ ] 결제 내역 `payments` 테이블에 저장

#### FR-2.2: 구독 취소
- **설명**: 구독 취소 시 다음 결제일까지 서비스 유지
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] "구독 취소" 버튼 클릭 시 확인 모달 표시
  - [ ] 확인 시 `cancel_at_period_end = true` 업데이트
  - [ ] `status`는 `active` 유지 (다음 결제일까지)
  - [ ] 구독 카드에 "취소 예정" 표시
  - [ ] "취소 철회" 버튼 표시

#### FR-2.3: 구독 취소 철회
- **설명**: 다음 결제일 전에 취소 상태를 철회
- **우선순위**: P1 (중요)
- **Acceptance Criteria**:
  - [ ] "취소 철회" 버튼 클릭 시 `cancel_at_period_end = false` 업데이트
  - [ ] 정상 구독 상태로 복원
  - [ ] 다음 결제일에 자동 갱신 재개

#### FR-2.4: 구독 완전 해지
- **설명**: 다음 결제일 도래 시 빌링키 삭제 및 Free 플랜 전환
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] `current_period_end` 도래 시 `status = 'expired'` 업데이트
  - [ ] 토스페이먼츠 빌링키 삭제 API 호출
  - [ ] `billing_key = NULL` 업데이트
  - [ ] `plan = 'free'`, `remaining_tests = 0` 업데이트

---

### 6.3 사주 검사 기능

#### FR-3.1: 새 검사 폼 입력
- **설명**: 사주 분석을 위한 정보 입력 폼
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] 이름 입력 필드 (필수)
  - [ ] 생년월일 캘린더 선택 (필수, 기본값: 오늘)
  - [ ] 출생시간 선택 (12시간 형식, AM/PM)
  - [ ] "출생시간 모름" 체크박스 (선택 시 출생시간 null)
  - [ ] 성별 라디오 버튼 (남성/여성, 필수)
  - [ ] "검사 시작" 버튼 (모든 필수 필드 입력 시 활성화)

#### FR-3.2: 검사 시작 및 Gemini API 호출
- **설명**: 폼 제출 시 DB 저장 및 AI 분석 실행
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] "검사 시작" 클릭 시 `/api/test/create` 호출
  - [ ] 잔여 횟수 확인 (`remaining_tests > 0`)
  - [ ] 잔여 횟수 0이면 에러 메시지 표시 + 구독 페이지로 안내
  - [ ] Supabase `tests` 테이블에 레코드 생성
  - [ ] Gemini API 호출 (Free: `gemini-2.5-flash`, Pro: `gemini-2.5-pro`)
  - [ ] 시스템 프롬프트와 사용자 정보 전송
  - [ ] AI 응답을 `analysis_result`에 저장
  - [ ] `remaining_tests -= 1` 업데이트
  - [ ] 완료 후 `/analysis/[id]`로 리다이렉트

#### FR-3.3: 대시보드 검사 내역 조회
- **설명**: 과거 검사 내역을 카드 형태로 표시
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] 사용자별 검사 내역 조회 (`/api/test/list`)
  - [ ] 최신순 정렬
  - [ ] 각 카드에 표시:
    - 이름
    - 생년월일
    - 검사 일시
    - 사용 모델 (Flash/Pro)
  - [ ] 카드 클릭 시 `/analysis/[id]`로 이동
  - [ ] "총 N건의 검사 내역" 표시

#### FR-3.4: 이름 기반 검색
- **설명**: 검색창에서 이름으로 검사 내역 필터링
- **우선순위**: P1 (중요)
- **Acceptance Criteria**:
  - [ ] 검색창에 텍스트 입력 시 실시간 필터링
  - [ ] 이름에 검색어 포함된 결과만 표시
  - [ ] 검색어 없으면 전체 내역 표시
  - [ ] "검색 결과 없음" 메시지 표시 (해당 시)

#### FR-3.5: 분석 상세보기
- **설명**: AI 분석 결과를 마크다운 형태로 표시
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] 사주 카페 분위기 UI 디자인
  - [ ] 검사 정보 표시 (이름, 생년월일, 출생시간, 성별)
  - [ ] AI 분석 결과 렌더링 (마크다운 → HTML)
  - [ ] 섹션 구분:
    - 천간·지지 계산
    - 오행 분석
    - 대운·세운 해석
    - 성격/재운/건강운/연애운

---

### 6.4 정기결제 기능 (Supabase Cron)

#### FR-4.1: Supabase Cron 설정
- **설명**: 매일 02:00에 `/api/cron/daily-billing` 호출
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] Supabase Cron Job 생성 (`0 2 * * *`)
  - [ ] `/api/cron/daily-billing` POST 요청 전송
  - [ ] 환경변수로 비밀 토큰 검증 (보안)

#### FR-4.2: 오늘 결제일인 구독 탐색
- **설명**: `current_period_end = 오늘` 인 구독 필터링
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] Supabase에서 `current_period_end = CURRENT_DATE` 쿼리
  - [ ] `status = 'active'` 및 `cancel_at_period_end = false` 조건 추가
  - [ ] 각 구독에 대해 결제 API 호출

#### FR-4.3: 결제 성공 시 처리
- **설명**: 횟수 초기화 및 구독 기간 연장
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] 토스페이먼츠 빌링키로 결제 실행 (3,900원)
  - [ ] 결제 성공 시:
    - `remaining_tests = 10` 초기화
    - `current_period_end += 1개월` 업데이트
    - `payments` 테이블에 성공 레코드 저장
  - [ ] 사용자에게 이메일 알림 (선택적)

#### FR-4.4: 결제 실패 시 처리
- **설명**: 즉시 구독 해지 및 빌링키 삭제
- **우선순위**: P0 (필수)
- **Acceptance Criteria**:
  - [ ] 결제 실패 시:
    - `status = 'expired'` 업데이트
    - `plan = 'free'` 전환
    - `remaining_tests = 0`
    - 토스페이먼츠 빌링키 삭제
    - `billing_key = NULL`
    - `payments` 테이블에 실패 레코드 저장 (에러 메시지 포함)
  - [ ] 사용자에게 이메일 알림 (선택적)

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

### 7.1 성능
- **NFR-1.1**: 페이지 로드 시간 3초 이내 (First Contentful Paint)
- **NFR-1.2**: Gemini API 응답 시간 10초 이내 (평균)
- **NFR-1.3**: 대시보드 검사 내역 로딩 1초 이내 (100개 기준)

### 7.2 보안
- **NFR-2.1**: Clerk Webhook은 서명 검증 필수
- **NFR-2.2**: Supabase Row Level Security (RLS) 적용
  - 사용자는 자신의 데이터만 조회/수정 가능
- **NFR-2.3**: 토스페이먼츠 빌링키는 암호화 저장 (Supabase Vault 권장)
- **NFR-2.4**: API Routes는 환경변수로 비밀키 관리 (`.env.local`)

### 7.3 가용성
- **NFR-3.1**: Supabase Cron 실패 시 재시도 로직 필요
- **NFR-3.2**: Gemini API 실패 시 사용자에게 에러 메시지 표시 (잔여 횟수 차감 X)
- **NFR-3.3**: 토스페이먼츠 결제 실패 시 로그 저장 및 알림

### 7.4 확장성
- **NFR-4.1**: Vercel Edge Functions 활용 (지역별 지연시간 최소화)
- **NFR-4.2**: Supabase Connection Pooling 설정

### 7.5 사용성
- **NFR-5.1**: 모든 페이지 Notion 스타일 디자인 적용
- **NFR-5.2**: 반응형 웹 디자인 (모바일, 태블릿, 데스크탑)
- **NFR-5.3**: 접근성 (Accessibility) 준수 (ARIA 레이블, 키보드 네비게이션)

---

## 8. 외부 연동 명세

### 8.1 Clerk (인증)
- **연동 방식**: SDK + Webhook
- **환경변수**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
- **주요 기능**:
  - Google OAuth 로그인
  - Webhook: `user.created`, `user.deleted`
- **참고 문서**: [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)

### 8.2 Supabase (데이터베이스 + Cron)
- **연동 방식**: JavaScript Client + REST API
- **환경변수**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **주요 기능**:
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - Cron Job (매일 02:00)
- **참고 문서**: `/docs/external/fullstackIntegration.md`

### 8.3 토스페이먼츠 (결제)
- **연동 방식**: SDK + REST API
- **환경변수**:
  - `NEXT_PUBLIC_TOSS_CLIENT_KEY`
  - `TOSS_SECRET_KEY`
- **주요 기능**:
  - 빌링키 발급 (자동결제)
  - 정기결제 실행
  - 빌링키 삭제
- **참고 문서**: `/docs/external/fullstackIntegration.md`

### 8.4 Google Gemini API (AI 분석)
- **연동 방식**: REST API
- **환경변수**:
  - `GEMINI_API_KEY`
- **주요 기능**:
  - `gemini-2.5-flash` (Free 플랜)
  - `gemini-2.5-pro` (Pro 플랜)
  - 마크다운 형식 응답
- **참고 문서**: [Google AI Studio](https://ai.google.dev/)

---

## 9. 상세 페이지 명세

### 9.1 메인 페이지 (랜딩페이지) - `/`

#### 9.1.1 헤더
- **좌측**: 로고 아이콘 + "Saju피아"
- **중앙 메뉴**: 홈, 서비스, 가격, FAQ (앵커 링크)
- **우측**: "시작하기" 버튼 → Clerk 회원가입

#### 9.1.2 히어로 섹션
- **제목**: "AI가 풀어주는 당신의 사주팔자"
- **부제목**: "구글 Gemini AI가 천간·지지를 계산하고, 당신의 운세를 자연어로 풀어드립니다. 가입 즉시 무료 3회 체험, Pro 구독 시 월 10회 분석 제공"
- **CTA 버튼**:
  - "무료 시작하기" (Primary) → Clerk 회원가입
  - "자세히 알아보기" (Secondary) → 서비스 섹션으로 스크롤
- **이미지**: 대자연 이미지 (랜덤 로딩, 모서리 둥근 입체감)
  - 예시: Unsplash API 또는 Pexels API 활용

#### 9.1.3 서비스 섹션
- **제목**: "Saju피아가 특별한 이유"
- **카드 3개**:
  1. **AI 기반 정확한 분석**
     - Google Gemini 2.5 모델 활용
     - 천간·지지·오행 자동 계산
  2. **합리적인 가격**
     - 무료 3회 체험
     - Pro 월 3,900원 (업계 최저가)
  3. **검사 내역 영구 보관**
     - 과거 분석 내역 언제든지 재확인
     - 검색 기능으로 빠른 조회

#### 9.1.4 요금제 섹션
- **제목**: "간단하고 명확한 요금제"
- **카드 2개**:

  **Free 플랜**
  - **가격**: 0원
  - **혜택**:
    - 가입 즉시 3회 무료 검사
    - Gemini 2.5 Flash 모델 사용
    - 검사 내역 영구 보관
    - 마크다운 형식 분석 결과
  - **CTA**: "시작하기" → Clerk 회원가입

  **Pro 플랜**
  - **가격**: 3,900원/월
  - **혜택**:
    - 월 10회 고품질 검사
    - Gemini 2.5 Pro 모델 사용
    - 검사 내역 영구 보관
    - 마크다운 형식 분석 결과
    - 자동 결제 (결제일 기준 1개월)
  - **CTA**: "Pro 시작하기" → 구독 관리 페이지

- **하단 문구**:
  - "* 구독 취소 시 환불 불가, 다음 결제일까지 서비스 이용 가능"
  - "* 결제 실패 시 즉시 구독 해지 처리"

#### 9.1.5 FAQ 섹션
- **제목**: "자주 묻는 질문"
- **아코디언 형태 (6개)**:
  1. **무료 체험은 어떻게 사용하나요?**
     - Google 로그인 후 자동으로 3회 제공됩니다.
  2. **Pro 구독은 어떻게 결제되나요?**
     - 토스페이먼츠 자동결제로 매월 3,900원 청구됩니다.
  3. **출생시간을 모르면 사주를 볼 수 없나요?**
     - "출생시간 모름"을 체크하면 시간 없이도 분석 가능합니다.
  4. **구독을 취소하면 환불받을 수 있나요?**
     - 환불은 불가하지만 다음 결제일까지 서비스를 계속 이용할 수 있습니다.
  5. **검사 결과는 어디에서 확인하나요?**
     - 대시보드에서 과거 검사 내역을 모두 확인할 수 있습니다.
  6. **Gemini Flash와 Pro 모델의 차이는 무엇인가요?**
     - Pro 모델이 더 상세하고 심층적인 분석을 제공합니다.

---

### 9.2 대시보드 (분석 목록) - `/dashboard`

#### 9.2.1 레이아웃
- **좌측 Global Nav**: 공통 네비게이션 (상단 설명 참조)
- **메인 컨텐츠 영역**:

#### 9.2.2 상단 헤더
- **제목**: "과거에 수행한 사주 팔자 검사 내역을 확인할 수 있습니다."

#### 9.2.3 검색 영역
- **검색창**: "성함으로 검색하세요" (placeholder)
- **검색 아이콘**: 돋보기 아이콘

#### 9.2.4 검사 내역 통계
- **텍스트**: "총 N건의 검사 내역"

#### 9.2.5 검사 카드 리스트
- **카드 구성** (각 검사별):
  - 이름 (대상자)
  - 생년월일
  - 검사 일시 (YYYY-MM-DD HH:MM)
  - 사용 모델 배지 (Flash / Pro)
  - 호버 시 "상세보기" 버튼 표시
- **클릭 이벤트**: 카드 클릭 시 `/analysis/[id]`로 이동
- **정렬**: 최신순 (created_at DESC)
- **빈 상태**: 검사 내역 없을 때 "아직 검사 내역이 없습니다. 새 검사를 시작해보세요!" + "새 검사 시작" 버튼

---

### 9.3 새 검사 (새 분석하기) - `/new-test`

#### 9.3.1 레이아웃
- **좌측 Global Nav**: 공통 네비게이션
- **메인 컨텐츠 영역**: 중앙 정렬 폼

#### 9.3.2 폼 필드
1. **이름** (필수)
   - 텍스트 입력
   - Placeholder: "예) 홍길동"

2. **생년월일** (필수)
   - 캘린더 아이콘 클릭 → 날짜 선택 모달
   - 기본값: 오늘 날짜
   - 라이브러리: `react-datepicker` 또는 `@mui/x-date-pickers`

3. **출생시간** (선택)
   - 시간 아이콘 클릭 → 시간 선택 모달
   - 12시간 형식 (AM/PM)
   - 라이브러리: `react-time-picker`

4. **"출생시간 모름"** (체크박스)
   - 체크 시 출생시간 입력 비활성화
   - `birthTime = null`로 저장

5. **성별** (필수)
   - 라디오 버튼 (둥근 체크)
   - 옵션: 남성 / 여성

#### 9.3.3 제출 버튼
- **텍스트**: "검사 시작"
- **상태**:
  - 필수 필드 미입력 시 비활성화
  - 잔여 횟수 0일 때 비활성화 + "구독 업그레이드 필요" 메시지
  - 로딩 중: 스피너 + "분석 중..."
- **동작**:
  1. `/api/test/create` POST 요청
  2. Gemini API 응답 대기 (로딩 UI)
  3. 성공 시 `/analysis/[id]`로 리다이렉트
  4. 실패 시 에러 메시지 표시

---

### 9.4 분석 상세보기 - `/analysis/[id]`

#### 9.4.1 레이아웃
- **좌측 Global Nav**: 공통 네비게이션
- **메인 컨텐츠 영역**: 사주 카페 분위기 디자인

#### 9.4.2 상단 정보 카드
- **배경**: 따뜻한 색감 (베이지, 브라운 톤)
- **아이콘**: 점성술 관련 아이콘 (별, 달, 태극 등)
- **정보 표시**:
  - 이름
  - 생년월일 (YYYY년 MM월 DD일)
  - 출생시간 (오전/오후 HH:MM 또는 "시간 미상")
  - 성별 (남성/여성)
  - 사용 모델 (Gemini 2.5 Flash / Pro)
  - 분석 일시

#### 9.4.3 분석 결과 영역
- **렌더링**: 마크다운 → HTML 변환
  - 라이브러리: `react-markdown` + `remark-gfm`
- **스타일링**:
  - 제목 (H2, H3) 스타일링
  - 리스트 스타일
  - 인용구 스타일
  - 코드 블록 (해당 시)
- **섹션 구분** (AI 응답 기준):
  1. 천간·지지 계산
  2. 오행 분석 (목, 화, 토, 금, 수)
  3. 대운·세운 해석
  4. 성격/재운/건강운/연애운

#### 9.4.4 하단 액션
- **버튼**:
  - "대시보드로 돌아가기" (Secondary)
  - "새 검사 시작" (Primary)

---

### 9.5 구독 관리 - `/subscription`

#### 9.5.1 레이아웃
- **좌측 Global Nav**: 공통 네비게이션
- **메인 컨텐츠 영역**: 카드 그리드 (2개)

#### 9.5.2 현재 구독 정보 카드

**Free 플랜 상태**:
- **제목**: "Free 플랜"
- **정보**:
  - 잔여 횟수: X/3
  - 사용 모델: Gemini 2.5 Flash
  - 검사 내역 영구 보관
- **CTA**: "Pro로 업그레이드" (Primary 버튼)
  - 클릭 시 토스페이먼츠 SDK 호출

**Pro 플랜 상태**:
- **제목**: "Pro 플랜"
- **정보**:
  - 잔여 횟수: X/10
  - 다음 결제일: YYYY년 MM월 DD일
  - 사용 모델: Gemini 2.5 Pro
  - 월 3,900원 자동 결제
- **CTA** (상태별):
  - **정상 구독**: "구독 취소" (Danger 버튼)
  - **취소 예정**: "취소 철회" (Primary 버튼) + "다음 결제일에 구독 종료 예정" 경고 메시지

#### 9.5.3 업그레이드 유도 카드 (Free 플랜일 때만 표시)
- **제목**: "Pro 플랜으로 업그레이드하세요!"
- **혜택**:
  - 월 10회 고품질 검사
  - Gemini 2.5 Pro 모델
  - 더 상세한 분석 결과
- **CTA**: "지금 시작하기" (Primary 버튼)

#### 9.5.4 구독 취소 확인 모달
- **제목**: "구독을 취소하시겠습니까?"
- **내용**:
  - "다음 결제일(YYYY-MM-DD)까지 서비스를 계속 이용하실 수 있습니다."
  - "결제일 이전에는 언제든지 취소를 철회할 수 있습니다."
  - "환불은 불가합니다."
- **버튼**:
  - "취소하기" (Danger)
  - "돌아가기" (Secondary)

---

## 10. 시스템 프롬프트 (Gemini AI)

### 10.1 프롬프트 구조
```typescript
export const generateSajuPrompt = (input: TestInput): string => {
  return `당신은 20년 경력의 전문 사주팔자 상담사입니다.

**입력 정보**:
- 성함: ${input.name}
- 생년월일: ${input.birthDate}
- 출생시간: ${input.birthTime || '미상'}
- 성별: ${input.gender === 'male' ? '남성' : '여성'}

**분석 요구사항**:
1️⃣ 천간(天干)과 지지(地支) 계산
2️⃣ 오행(五行) 분석 (목, 화, 토, 금, 수)
3️⃣ 대운(大運)과 세운(歲運) 해석
4️⃣ 전반적인 성격, 재운, 건강운, 연애운 분석

**출력 형식**: 마크다운

**금지 사항**:
- 의료·법률 조언
- 확정적 미래 예측
- 부정적·공격적 표현`;
};
```

### 10.2 예상 응답 형식
```markdown
# 사주팔자 분석 결과

## 천간·지지
- 년주: 甲子
- 월주: 乙丑
- 일주: 丙寅
- 시주: 丁卯

## 오행 분석
- 목(木): 강함
- 화(火): 중간
- 토(土): 약함
- 금(金): 중간
- 수(水): 강함

## 대운·세운
현재 대운은...

## 성격
당신은...

## 재운
재물운은...

## 건강운
건강 측면에서...

## 연애운
인간관계와 연애에서...
```

---

## 11. 개발 로드맵

### Phase 1: 기본 인프라 구축 (Week 1-2)
- [ ] Next.js 프로젝트 초기화
- [ ] Clerk 연동 (Google OAuth)
- [ ] Supabase 프로젝트 생성 및 테이블 설계
- [ ] 환경변수 설정 (`.env.local`)
- [ ] 기본 레이아웃 및 Global Nav 구현

### Phase 2: 인증 및 사용자 관리 (Week 2-3)
- [ ] Clerk Webhook 설정 (`user.created`, `user.deleted`)
- [ ] Supabase와 유저 동기화
- [ ] Free 플랜 자동 부여 로직
- [ ] 보호된 라우트 설정 (Middleware)

### Phase 3: 사주 검사 기능 (Week 3-4)
- [ ] 새 검사 폼 UI (`/new-test`)
- [ ] 캘린더/시간 선택 컴포넌트
- [ ] Gemini API 연동
- [ ] `/api/test/create` 구현
- [ ] 잔여 횟수 차감 로직
- [ ] 분석 상세보기 페이지 (`/analysis/[id]`)

### Phase 4: 대시보드 (Week 4)
- [ ] 검사 내역 조회 API (`/api/test/list`)
- [ ] 카드 리스트 UI
- [ ] 이름 기반 검색 기능
- [ ] 빈 상태 (Empty State) UI

### Phase 5: 구독 관리 (Week 5-6)
- [ ] 토스페이먼츠 SDK 연동
- [ ] 빌링키 발급 플로우
- [ ] Pro 구독 시작 API (`/api/subscription/create`)
- [ ] 구독 취소/철회 API
- [ ] 구독 관리 페이지 UI (`/subscription`)

### Phase 6: 정기결제 (Week 6-7)
- [ ] Supabase Cron Job 설정
- [ ] `/api/cron/daily-billing` 구현
- [ ] 결제 성공/실패 처리 로직
- [ ] 결제 내역 저장 (`payments` 테이블)
- [ ] 에러 로깅 및 알림

### Phase 7: 랜딩 페이지 (Week 7-8)
- [ ] 히어로 섹션
- [ ] 서비스 섹션
- [ ] 요금제 섹션
- [ ] FAQ 섹션 (아코디언)
- [ ] 헤더 네비게이션

### Phase 8: 테스트 및 배포 (Week 8-9)
- [ ] 통합 테스트
- [ ] 보안 점검 (RLS, 환경변수)
- [ ] 성능 최적화
- [ ] Vercel 배포
- [ ] Clerk Webhook URL 설정 (Production)
- [ ] Supabase Cron 활성화

### Phase 9: 모니터링 및 개선 (Week 9+)
- [ ] 사용자 피드백 수집
- [ ] 버그 수정
- [ ] 기능 개선 (우선순위 재조정)

---

## 12. 성공 지표 (KPI)

### 12.1 비즈니스 지표
- **무료 가입 전환율**: 방문자 대비 회원가입 비율 (목표: 15%)
- **Pro 구독 전환율**: 무료 사용자 대비 Pro 구독 비율 (목표: 10%)
- **구독 유지율**: Pro 구독자의 월별 유지율 (목표: 80%)
- **평균 검사 횟수**: 사용자당 월평균 검사 횟수 (목표: 5회)

### 12.2 기술 지표
- **API 응답 시간**: Gemini API 평균 응답 시간 (목표: <10초)
- **결제 성공률**: 정기결제 성공 비율 (목표: 95%)
- **시스템 가용성**: 서버 Uptime (목표: 99.9%)

### 12.3 사용자 만족도
- **NPS (Net Promoter Score)**: 추천 의향 점수 (목표: 40+)
- **검사 재이용률**: 한 번 이상 재검사한 사용자 비율 (목표: 60%)

---

## 13. 리스크 및 완화 전략

| 리스크 | 발생 확률 | 영향도 | 완화 전략 |
|--------|----------|--------|----------|
| Gemini API 응답 지연/실패 | 중간 | 높음 | 타임아웃 설정, 재시도 로직, 에러 처리 |
| 토스페이먼츠 결제 실패 | 낮음 | 높음 | 실패 시 즉시 구독 해지 + 사용자 알림 |
| Clerk Webhook 누락 (배포 전) | 높음 | 중간 | 로컬 환경에서 Webhook 시뮬레이션 테스트 |
| Supabase Cron 실패 | 낮음 | 중간 | 로깅 + 수동 재실행 스크립트 준비 |
| 사용자 데이터 유출 | 낮음 | 매우 높음 | RLS 적용, 빌링키 암호화, 환경변수 보안 |
| 무료 횟수 악용 | 중간 | 낮음 | IP 기반 제한, 이메일 인증 강화 |

---

## 14. 참고 자료

### 14.1 내부 문서
- `/docs/requirement.md` - 초기 요구사항 정의
- `/docs/external/fullstackIntegration.md` - 외부 서비스 연동 가이드

### 14.2 외부 문서
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [토스페이먼츠 API](https://docs.tosspayments.com/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 15. 부록

### 15.1 용어 정리
- **빌링키**: 자동결제를 위한 고유 식별 키 (카드 정보 대신 사용)
- **천간·지지**: 사주팔자의 기본 구성 요소 (10천간, 12지지)
- **오행**: 목(木), 화(火), 토(土), 금(金), 수(水)
- **대운**: 10년 단위의 운세 변화
- **세운**: 1년 단위의 운세 변화

### 15.2 디자인 참고
- Notion 스타일: 심플한 인터페이스, 넓은 여백, 중성적인 색상
- 사주 카페 분위기: 따뜻한 베이지/브라운 톤, 전통적 아이콘

### 15.3 연락처
- **Product Owner**: [이메일 주소]
- **개발팀 리드**: [이메일 주소]
- **디자이너**: [이메일 주소]

---

**문서 버전**: 1.0
**작성일**: 2025-12-12
**최종 수정일**: 2025-12-12
**작성자**: Claude Code
**승인자**: [Product Owner 이름]
