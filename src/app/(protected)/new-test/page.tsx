"use client";

import { NewTestForm } from "@/features/test/components/new-test-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
