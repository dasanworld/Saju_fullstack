export const serviceFeatures = [
  {
    icon: "Sparkles",
    title: "AI 기반 정확한 분석",
    description:
      "Google Gemini 2.5 모델이 천간·지지·오행을 자동 계산하고 전문적인 사주팔자 해석을 제공합니다.",
  },
  {
    icon: "Tag",
    title: "합리적인 가격",
    description:
      "무료 3회 체험으로 부담 없이 시작하고, Pro는 월 3,900원의 저렴한 가격으로 월 10회 고품질 분석을 이용하실 수 있습니다.",
  },
  {
    icon: "Archive",
    title: "검사 내역 영구 보관",
    description:
      "과거 분석 내역을 언제든지 재확인할 수 있으며, 이름 기반 검색으로 빠르게 조회할 수 있습니다.",
  },
];

export const pricingPlans = {
  free: {
    name: "Free",
    price: 0,
    badge: "무료",
    features: [
      "가입 즉시 3회 무료 검사",
      "Gemini 2.5 Flash 모델 사용",
      "검사 내역 영구 보관",
      "마크다운 형식 분석 결과",
    ],
    cta: "시작하기",
  },
  pro: {
    name: "Pro",
    price: 3900,
    badge: "인기",
    features: [
      "월 10회 고품질 검사",
      "Gemini 2.5 Pro 모델 사용",
      "검사 내역 영구 보관",
      "마크다운 형식 분석 결과",
      "자동 결제 (결제일 기준 1개월)",
    ],
    cta: "Pro 시작하기",
  },
};

export const faqItems = [
  {
    question: "무료 체험은 어떻게 사용하나요?",
    answer:
      "Google 로그인 후 자동으로 3회 무료 검사 횟수가 제공됩니다. 별도의 신청 절차 없이 바로 사용하실 수 있습니다.",
  },
  {
    question: "Pro 구독은 어떻게 결제되나요?",
    answer:
      "토스페이먼츠 자동결제로 매월 3,900원이 청구됩니다. 빌링키 발급 후 매달 같은 날짜에 자동으로 결제됩니다.",
  },
  {
    question: "출생시간을 모르면 사주를 볼 수 없나요?",
    answer:
      "'출생시간 모름'을 체크하면 시간 정보 없이도 분석이 가능합니다. AI가 가능한 범위에서 분석을 제공합니다.",
  },
  {
    question: "구독을 취소하면 환불받을 수 있나요?",
    answer:
      "환불은 불가하지만 다음 결제일까지 서비스를 계속 이용할 수 있습니다. 결제일 이전에는 언제든지 취소를 철회할 수 있습니다.",
  },
  {
    question: "검사 결과는 어디에서 확인하나요?",
    answer:
      "대시보드에서 과거 검사 내역을 모두 확인할 수 있습니다. 이름으로 검색하거나 최신순으로 정렬하여 조회 가능합니다.",
  },
  {
    question: "Gemini Flash와 Pro 모델의 차이는 무엇인가요?",
    answer:
      "Pro 모델이 더 상세하고 심층적인 분석을 제공합니다. Flash 모델은 빠른 분석에 적합하며, Pro 모델은 더 정교한 해석을 원하시는 분께 추천합니다.",
  },
];
