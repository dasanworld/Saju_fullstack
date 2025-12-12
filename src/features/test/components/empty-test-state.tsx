"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export const EmptyTestState = () => {
  const router = useRouter();

  return (
    <div className="mt-12 flex flex-col items-center justify-center space-y-4">
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <p className="text-lg text-muted-foreground text-center">
        아직 검사 내역이 없습니다. 새 검사를 시작해보세요!
      </p>
      <Button onClick={() => router.push("/new-test")}>새 검사 시작</Button>
    </div>
  );
};
