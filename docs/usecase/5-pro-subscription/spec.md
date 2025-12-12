# Usecase 5: Pro 구독 시작

**기능명**: Pro 구독 시작 (빌링키 발급 및 첫 결제)
**관련 유저플로우**: 5. Pro 구독 시작
**버전**: 1.0
**작성일**: 2025-12-12

---

## 1. 개요

사용자가 Free 플랜에서 Pro 플랜으로 업그레이드하는 기능입니다. 토스페이먼츠 SDK를 통해 빌링키를 발급받고, 첫 결제(3,900원)를 실행하여 Pro 구독을 시작합니다.

### 1.1 목적
- Free 플랜 사용자를 Pro 플랜으로 전환
- 자동결제를 위한 빌링키 발급
- 첫 결제 실행 및 구독 혜택 즉시 제공

### 1.2 범위
- 토스페이먼츠 SDK를 통한 결제 수단 등록
- 빌링키 발급 및 저장
- 첫 결제 실행 (3,900원)
- 구독 정보 업데이트 (잔여 횟수 10회, 다음 결제일 설정)
- 결제 성공/실패 처리

---

## 2. 액터 (Actors)

### 2.1 Primary Actor
- **Free 플랜 사용자**: Pro 구독을 시작하려는 사용자

### 2.2 Secondary Actors
- **토스페이먼츠 시스템**: 빌링키 발급 및 결제 처리
- **Supabase**: 구독 정보 저장 및 업데이트
- **Clerk**: 사용자 인증 및 세션 관리

---

## 3. 진입점 (Entry Points)

사용자는 다음 4가지 경로로 Pro 구독을 시작할 수 있습니다:

1. **랜딩 페이지** (`/`)
   - 요금제 섹션의 "Pro 시작하기" 버튼 클릭

2. **대시보드** (`/dashboard`)
   - Global Nav 하단 구독 정보의 "Pro로 업그레이드" 링크 클릭

3. **구독 관리 페이지** (`/subscription`)
   - Free 플랜 카드의 "Pro로 업그레이드" 버튼 클릭
   - 또는 업그레이드 유도 카드의 "지금 시작하기" 버튼 클릭

4. **검사 횟수 소진 시**
   - 잔여 횟수 0일 때 "Pro로 업그레이드" 안내 모달의 버튼 클릭

---

## 4. 사전 조건 (Preconditions)

1. 사용자가 Clerk를 통해 인증된 상태
2. 현재 사용자의 구독 플랜이 `free`
3. 사용자에게 유효한 결제 수단 (카드, 간편결제 등)
4. 토스페이먼츠 SDK가 정상적으로 로드됨
5. Supabase 연결 가능

---

## 5. 메인 플로우 (Main Flow)

### 5.1 사용자 액션
1. 사용자가 진입점 중 하나에서 "Pro 시작하기" 또는 "Pro로 업그레이드" 버튼 클릭
2. 토스페이먼츠 결제 위젯 화면이 모달로 표시됨
3. 사용자가 결제 수단 입력:
   - 카드번호, 유효기간, CVC, 비밀번호 앞 2자리
   - 또는 간편결제 (네이버페이, 카카오페이 등) 선택
4. 결제 정보 확인 및 "동의하고 결제하기" 버튼 클릭
5. 결제 처리 대기 (로딩 UI)

### 5.2 시스템 처리
1. **토스페이먼츠 SDK 초기화**
   - 클라이언트에서 `NEXT_PUBLIC_TOSS_CLIENT_KEY`로 SDK 초기화
   - 빌링키 발급 요청 실행

2. **빌링키 발급**
   - 토스페이먼츠 서버가 결제 수단 검증
   - 빌링키(customerKey + billingKey) 생성
   - 성공 시: `successUrl`로 리다이렉트 (빌링키 포함)
   - 실패 시: `failUrl`로 리다이렉트 (에러 정보 포함)

3. **서버 API 호출** (`/api/subscription/create`)
   - 클라이언트가 빌링키와 함께 POST 요청 전송
   - Clerk 세션으로 사용자 인증 확인
   - Supabase에서 현재 구독 정보 조회
   - 현재 플랜이 `free`인지 검증

4. **첫 결제 실행**
   - 서버에서 토스페이먼츠 결제 API 호출:
     - URL: `POST /v1/billing/{billingKey}`
     - 결제 금액: 3,900원
     - 주문명: "Saju피아 Pro 구독"
     - 고객 이메일: Clerk에서 가져옴
   - 토스페이먼츠가 결제 처리

5. **결제 성공 처리**
   - Supabase `subscriptions` 테이블 업데이트:
     ```sql
     UPDATE subscriptions
     SET
       plan = 'pro',
       billing_key = '{발급받은 빌링키}',
       next_billing_date = CURRENT_DATE + INTERVAL '1 month',
       remaining_tests = 10,
       cancel_at_period_end = false,
       updated_at = now()
     WHERE user_id = {사용자 ID};
     ```
   - API 응답: `{ success: true, subscription: {...} }`

6. **클라이언트 업데이트**
   - `/subscription` 페이지로 리다이렉트
   - Global Nav의 구독 정보 갱신
   - 성공 토스트 메시지 표시

### 5.3 출력 (Output)
- **구독 관리 페이지 업데이트**:
  - Pro 플랜 카드 표시
  - 잔여 횟수: 10/10
  - 다음 결제일: YYYY년 MM월 DD일 (오늘 + 1개월)
  - "구독 취소" 버튼 표시
- **Global Nav 업데이트**:
  - 구독: Pro
  - 잔여 횟수: 10/10
- **성공 메시지**: "Pro 구독이 시작되었습니다!"

---

## 6. 대안 플로우 (Alternative Flows)

### 6.1 첫 결제 실패
**트리거**: 토스페이먼츠 결제 API가 실패 응답 반환 (카드 한도 초과, 잔액 부족 등)

**처리**:
1. 서버에서 에러 감지
2. 토스페이먼츠 빌링키 삭제 API 호출:
   ```
   DELETE /v1/billing/{billingKey}
   ```
3. 구독 정보 변경 롤백 (Free 플랜 유지)
4. API 응답: `{ success: false, error: "결제에 실패했습니다" }`

**출력**:
- `/subscription` 페이지로 리다이렉트
- 에러 메시지: "결제에 실패했습니다. 결제 수단을 확인해주세요"
- 구독 상태: Free 플랜 유지
- "다시 시도" 버튼 표시

---

### 6.2 빌링키 발급 중 사용자 취소
**트리거**: 토스페이먼츠 결제 위젯에서 사용자가 "취소" 버튼 클릭

**처리**:
1. 토스페이먼츠 SDK에서 취소 감지
2. `failUrl`로 리다이렉트 (에러 코드: `USER_CANCEL`)
3. 서버 API 호출 없음

**출력**:
- `/subscription` 페이지로 리다이렉트
- 안내 메시지: "결제가 취소되었습니다"
- 구독 상태: Free 플랜 유지

---

### 6.3 이미 Pro 구독 중
**트리거**: Pro 플랜 사용자가 다시 "Pro 시작하기" 시도

**처리**:
1. 서버에서 현재 구독 정보 조회
2. `plan = 'pro'` 감지
3. API 응답: `{ success: false, error: "ALREADY_PRO" }`

**출력**:
- 에러 메시지: "이미 Pro 구독 중입니다"
- `/subscription` 페이지로 리다이렉트
- Pro 구독 정보 카드 표시

---

## 7. 예외 플로우 (Exception Flows)

### 7.1 토스페이먼츠 API 타임아웃
**시나리오**: 결제 API 호출 시 30초 이상 응답 없음

**처리**:
1. 서버 측 타임아웃 에러 발생
2. 빌링키 삭제 시도 (정리)
3. 에러 로그 기록
4. API 응답: `{ success: false, error: "TIMEOUT" }`

**출력**:
- 에러 메시지: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요"
- 고객센터 연락처 안내 (선택)

---

### 7.2 빌링키 발급 성공 후 페이지 이탈
**시나리오**: 빌링키 발급은 성공했으나, 서버 API 호출 전에 사용자가 브라우저 닫음

**처리**:
1. 빌링키는 토스페이먼츠에 생성됨
2. Supabase에는 구독 정보 미반영
3. 사용자가 다시 페이지 진입 시:
   - `successUrl`의 쿼리 파라미터에서 빌링키 확인
   - 서버 API 재호출 시도
   - 또는 "결제 처리가 완료되지 않았습니다" 안내

**출력**:
- 안내 메시지: "결제 처리가 완료되지 않았습니다. 다시 시도해주세요"
- 고객센터 안내 (수동 처리 필요 시)

---

### 7.3 Supabase 연결 실패
**시나리오**: 구독 정보 업데이트 중 DB 연결 오류

**처리**:
1. 서버에서 DB 에러 캐치
2. 빌링키 삭제 시도 (정리)
3. 에러 로그 기록
4. API 응답: `{ success: false, error: "DATABASE_ERROR" }`

**출력**:
- 에러 메시지: "일시적인 오류가 발생했습니다. 다시 시도해주세요"
- 구독 상태: Free 플랜 유지

---

### 7.4 비인증 사용자 접근
**시나리오**: Clerk 세션이 만료된 상태에서 API 호출

**처리**:
1. 서버에서 인증 실패 감지
2. API 응답: `401 Unauthorized`

**출력**:
- 자동으로 Clerk 로그인 페이지로 리다이렉트
- 로그인 완료 후 `/subscription`으로 복귀

---

## 8. 사후 조건 (Postconditions)

### 8.1 성공 시
1. Supabase `subscriptions` 테이블에 Pro 구독 정보 저장
2. 빌링키가 안전하게 저장됨 (암호화 권장)
3. 사용자 잔여 횟수: 10회
4. 다음 결제일: 오늘 + 1개월
5. 사용자가 즉시 Pro 혜택 이용 가능 (Gemini 2.5 Pro 모델 사용)

### 8.2 실패 시
1. 빌링키 삭제 (토스페이먼츠)
2. 구독 정보 변경 없음 (Free 플랜 유지)
3. 사용자에게 실패 사유 안내
4. 에러 로그 기록 (관리자 모니터링)

---

## 9. UI 요구사항

### 9.1 토스페이먼츠 결제 위젯
- 모달 형태로 표시
- 결제 수단 선택 UI (카드, 간편결제)
- 결제 금액 명시: "3,900원"
- 자동결제 동의 체크박스
- 개인정보 처리방침 및 약관 동의
- "동의하고 결제하기" 버튼

### 9.2 로딩 UI
- 결제 처리 중: "결제를 처리하고 있습니다..."
- 프로그레스 바 또는 스피너
- 배경 오버레이 (사용자 액션 차단)

### 9.3 성공 피드백
- 토스트 메시지: "Pro 구독이 시작되었습니다!"
- 구독 정보 카드 애니메이션 (Free → Pro 전환)
- Confetti 효과 (선택)

### 9.4 에러 피드백
- 에러 모달 또는 토스트
- 명확한 에러 메시지
- "다시 시도" 버튼
- 고객센터 연락처 (필요 시)

---

## 10. 기술 명세

### 10.1 API Endpoint
```
POST /api/subscription/create
```

**Request Body**:
```json
{
  "billingKey": "string",
  "customerKey": "string"
}
```

**Response (성공)**:
```json
{
  "success": true,
  "subscription": {
    "plan": "pro",
    "remaining_tests": 10,
    "next_billing_date": "2025-01-12",
    "cancel_at_period_end": false
  }
}
```

**Response (실패)**:
```json
{
  "success": false,
  "error": "PAYMENT_FAILED",
  "message": "결제에 실패했습니다. 결제 수단을 확인해주세요"
}
```

### 10.2 토스페이먼츠 API 호출
**빌링키로 결제 실행**:
```
POST https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {TOSS_SECRET_KEY (Base64)}
Content-Type: application/json

{
  "amount": 3900,
  "orderName": "Saju피아 Pro 구독",
  "customerEmail": "user@example.com",
  "customerName": "홍길동"
}
```

**빌링키 삭제**:
```
DELETE https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {TOSS_SECRET_KEY (Base64)}
```

### 10.3 데이터베이스 쿼리
**구독 정보 업데이트**:
```sql
UPDATE subscriptions
SET
  plan = 'pro',
  billing_key = $2,
  next_billing_date = CURRENT_DATE + INTERVAL '1 month',
  remaining_tests = 10,
  cancel_at_period_end = false,
  updated_at = now()
WHERE user_id = $1
  AND plan = 'free'
RETURNING *;
```

---

## 11. 보안 고려사항

### 11.1 빌링키 보안
- Supabase Vault를 사용한 암호화 저장 권장
- 클라이언트에 빌링키 노출 금지
- HTTPS 통신 필수

### 11.2 인증 검증
- 모든 API 호출에 Clerk 세션 검증
- Row Level Security (RLS)로 사용자별 데이터 격리

### 11.3 결제 금액 검증
- 클라이언트에서 전달받은 금액이 아닌, 서버 측에서 하드코딩된 금액 사용
- 금액 변조 방지

---

## 12. 테스트 시나리오

### 12.1 정상 케이스
1. Free 플랜 사용자가 "Pro 시작하기" 클릭
2. 유효한 카드 정보 입력
3. 결제 성공
4. Pro 플랜으로 전환 확인
5. 잔여 횟수 10회 확인
6. 다음 결제일 확인

### 12.2 에러 케이스
1. 잔액 부족 카드로 결제 시도 → 실패 메시지 확인
2. 결제 위젯에서 취소 → Free 플랜 유지 확인
3. 이미 Pro 플랜인 상태에서 재시도 → 에러 메시지 확인
4. 비인증 상태에서 API 호출 → 로그인 페이지로 리다이렉트 확인

### 12.3 엣지 케이스
1. 토스페이먼츠 API 타임아웃 → 에러 처리 확인
2. 빌링키 발급 후 페이지 이탈 → 재진입 시 안내 확인
3. Supabase 연결 실패 → 에러 처리 및 빌링키 삭제 확인

---

## 13. 비기능 요구사항

### 13.1 성능
- 토스페이먼츠 결제 API 응답 시간: 평균 3초 이내
- 전체 프로세스 완료: 10초 이내

### 13.2 가용성
- 토스페이먼츠 API 장애 시 재시도 로직 (최대 3회)
- 에러 발생 시 빌링키 정리 (리소스 누수 방지)

### 13.3 사용성
- 명확한 결제 금액 표시
- 자동결제 동의 명시
- 실패 시 명확한 에러 메시지 및 해결 방법 안내

---

## 14. 의존성

### 14.1 외부 서비스
- **토스페이먼츠**: 빌링키 발급 및 결제 처리
- **Clerk**: 사용자 인증 및 이메일 정보
- **Supabase**: 구독 정보 저장

### 14.2 환경변수
```bash
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxx
TOSS_SECRET_KEY=test_sk_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
```

---

## 15. 향후 개선 사항

1. **결제 수단 관리**
   - 등록된 카드 정보 표시 (마스킹)
   - 결제 수단 변경 기능

2. **이메일 알림**
   - 구독 시작 확인 이메일
   - 첫 결제 영수증 자동 발송

3. **쿠폰 시스템**
   - 첫 달 할인 쿠폰 적용

4. **결제 내역 보관**
   - `payments` 테이블 추가 (법적 요구사항)
   - 결제 이력 조회 기능

---

## 16. 참고 자료

### 16.1 내부 문서
- `/docs/requirement.md` - 구독 정책
- `/docs/prd.md` - Pro 구독 시작 (FR-2.1)
- `/docs/userflow.md` - 5. Pro 구독 시작
- `/docs/database.md` - subscriptions 테이블 스키마

### 16.2 외부 문서
- [토스페이먼츠 빌링키 API](https://docs.tosspayments.com/reference/billing-key)
- [토스페이먼츠 결제 위젯](https://docs.tosspayments.com/reference/widget-sdk)
- [Clerk Next.js 가이드](https://clerk.com/docs/quickstarts/nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-12-12
**작성자**: Product Team
**검토자**: CTO, 개발팀 리드
