"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, CreditCard } from "lucide-react";

type TestResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    type: "success" | "error" | "quota_exceeded";
    testId?: string;
    errorMessage?: string;
    errorCode?: string;
  } | null;
};

export const TestResultDialog = ({
  open,
  onOpenChange,
  result,
}: TestResultDialogProps) => {
  const router = useRouter();

  if (!result) return null;

  const handleViewResult = () => {
    if (result.testId) {
      router.push(`/analysis/${result.testId}`);
    }
    onOpenChange(false);
  };

  const handleUpgrade = () => {
    router.push("/subscription");
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (result.type === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl">분석이 완료되었습니다!</DialogTitle>
            <DialogDescription className="text-base">
              사주 분석이 성공적으로 완료되었습니다.
              <br />
              결과 페이지에서 상세 분석을 확인하세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={handleViewResult} className="w-full">
              결과 보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (result.type === "quota_exceeded") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">검사 횟수를 모두 사용했습니다</DialogTitle>
            <DialogDescription className="text-base">
              무료 검사 횟수를 모두 사용하셨습니다.
              <br />
              Pro 플랜으로 업그레이드하시면 월 10회의 고품질 검사를 이용하실 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4" />
              Pro 플랜 혜택
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 월 10회 고품질 검사</li>
              <li>• Gemini 1.5 Pro 모델 사용</li>
              <li>• 더 상세한 분석 결과</li>
            </ul>
          </div>
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button onClick={handleUpgrade} className="w-full">
              Pro로 업그레이드 (월 3,900원)
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full">
              나중에 하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <DialogTitle className="text-xl">검사에 실패했습니다</DialogTitle>
          <DialogDescription className="text-base">
            사주 분석 중 오류가 발생했습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg bg-red-50 p-4 border border-red-100">
          <h4 className="font-semibold text-red-900 mb-2">오류 상세</h4>
          <p className="text-sm text-red-700">
            {result.errorMessage || "알 수 없는 오류가 발생했습니다."}
          </p>
          {result.errorCode && (
            <p className="text-xs text-red-500 mt-2">
              오류 코드: {result.errorCode}
            </p>
          )}
        </div>

        <div className="mt-2 text-sm text-gray-500">
          <p>문제가 계속되면 잠시 후 다시 시도하거나, 고객센터로 문의해 주세요.</p>
        </div>

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
          <Button onClick={handleClose} className="w-full">
            다시 시도
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
