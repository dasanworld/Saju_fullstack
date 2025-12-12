"use client";

import { useMemo } from "react";
import { format, parseISO, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";
import type { TestDetailResponse } from "../lib/dto";

interface Props {
  test: TestDetailResponse;
}

export function TestInfoCard({ test }: Props) {
  const formattedBirthDate = useMemo(
    () => format(parseISO(test.birth_date), "yyyy년 MM월 dd일", { locale: ko }),
    [test.birth_date]
  );

  const formattedBirthTime = useMemo(() => {
    if (!test.birth_time) return "시간 미상";
    try {
      const time = parse(test.birth_time, "HH:mm:ss", new Date());
      return format(time, "a h시 mm분", { locale: ko });
    } catch {
      return test.birth_time;
    }
  }, [test.birth_time]);

  const genderLabel = test.gender === "male" ? "남성" : "여성";

  const formattedCreatedAt = useMemo(
    () =>
      format(parseISO(test.created_at), "yyyy년 MM월 dd일 HH시 mm분", {
        locale: ko,
      }),
    [test.created_at]
  );

  return (
    <Card
      className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
      role="region"
      aria-label="검사 대상자 정보"
    >
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-amber-900">
          {test.name}님의 사주팔자 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarIcon className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">생년월일:</span>
          <span>{formattedBirthDate}</span>
        </div>

        <div className="flex items-center gap-2 text-amber-800">
          <ClockIcon className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">출생시간:</span>
          <span>{formattedBirthTime}</span>
        </div>

        <div className="flex items-center gap-2 text-amber-800">
          <UserIcon className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">성별:</span>
          <span>{genderLabel}</span>
        </div>

        <div className="text-sm text-amber-600 mt-4 pt-3 border-t border-amber-200">
          분석 일시: {formattedCreatedAt}
        </div>
      </CardContent>
    </Card>
  );
}
