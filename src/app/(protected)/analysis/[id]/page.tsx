"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTestDetail } from "@/features/test/hooks/useTestDetail";
import { useStreamAnalysis } from "@/features/test/hooks/useStreamAnalysis";
import { TestInfoCard } from "@/features/test/components/test-info-card";
import { AnalysisResultSection } from "@/features/test/components/analysis-result-section";
import { StreamingAnalysisResult } from "@/features/test/components/streaming-analysis-result";
import { AnalysisActionButtons } from "@/features/test/components/analysis-action-buttons";
import { AnalysisSkeleton } from "@/features/test/components/analysis-skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalysisDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStreamMode = searchParams.get("stream") === "true";
  const model = searchParams.get("model") || "gemini-2.0-flash";

  const { data: test, isLoading, error, refetch } = useTestDetail(id);
  const { streamedText, status, error: streamError, startStream } = useStreamAnalysis();
  const [hasStartedStream, setHasStartedStream] = useState(false);

  useEffect(() => {
    if (isStreamMode && !hasStartedStream && test && !test.analysis_result) {
      setHasStartedStream(true);
      startStream(id, model);
    }
  }, [isStreamMode, hasStartedStream, test, id, model, startStream]);

  useEffect(() => {
    if (status === "completed") {
      refetch();
    }
  }, [status, refetch]);

  if (isLoading && !isStreamMode) {
    return <AnalysisSkeleton />;
  }

  if (error && !isStreamMode) {
    const errorStatus = (error as { response?: { status?: number } })?.response
      ?.status;
    const errorMessage =
      errorStatus === 404
        ? "검사를 찾을 수 없습니다"
        : errorStatus === 403
          ? "접근 권한이 없습니다"
          : "오류가 발생했습니다. 다시 시도해주세요.";

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{errorMessage}</h1>
          <p className="text-gray-600 mb-6">
            {errorStatus === 404 || errorStatus === 403
              ? "요청하신 검사 결과를 찾을 수 없거나 권한이 없습니다."
              : "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."}
          </p>
          <Button onClick={() => router.push("/dashboard")} className="gap-2">
            <Home className="w-4 h-4" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (streamError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">분석 오류</h1>
          <p className="text-gray-600 mb-6">{streamError}</p>
          <Button onClick={() => router.push("/dashboard")} className="gap-2">
            <Home className="w-4 h-4" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isStreaming = status === "streaming" || status === "idle";
  const isCompleted = status === "completed" || status === "error";
  const showStreamingResult = isStreamMode && (isStreaming || !test?.analysis_result);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {test && <TestInfoCard test={test} />}

      {showStreamingResult ? (
        <StreamingAnalysisResult
          streamedText={streamedText}
          isStreaming={isStreaming}
        />
      ) : (
        test && <AnalysisResultSection result={test.analysis_result || ""} />
      )}

      {(isCompleted || !isStreamMode) && <AnalysisActionButtons />}
    </div>
  );
}
