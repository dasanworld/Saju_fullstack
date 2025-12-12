"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

export function AnalysisActionButtons() {
  const router = useRouter();

  return (
    <div className="flex gap-3 justify-center">
      <Button
        variant="outline"
        onClick={() => router.push("/dashboard")}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        대시보드로 돌아가기
      </Button>

      <Button onClick={() => router.push("/new-test")} className="gap-2">
        <Plus className="w-4 h-4" aria-hidden="true" />
        새 검사 시작
      </Button>
    </div>
  );
}
