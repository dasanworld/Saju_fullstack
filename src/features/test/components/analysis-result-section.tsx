"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Props {
  result: string;
}

export function AnalysisResultSection({ result }: Props) {
  const [hasError, setHasError] = useState(false);

  if (!result) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>분석 결과 없음</AlertTitle>
        <AlertDescription>
          분석 결과가 아직 준비되지 않았습니다. 잠시 후 다시 확인해주세요.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasError) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>형식 변환 오류</AlertTitle>
            <AlertDescription>
              형식 변환 중 오류가 발생했습니다. 원본 텍스트를 표시합니다.
            </AlertDescription>
          </Alert>
          <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-lg">
            {result}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6" role="article" aria-label="사주팔자 분석 결과">
      <CardContent className="pt-6">
        <div className="prose prose-amber max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1
                  className="text-3xl font-bold text-amber-900 mt-8 mb-4"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="text-2xl font-bold text-amber-900 mt-6 mb-3"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="text-xl font-semibold text-amber-800 mt-4 mb-2"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul
                  className="list-disc ml-6 text-gray-700 space-y-1 mb-4"
                  {...props}
                />
              ),
              ol: ({ node, ...props }) => (
                <ol
                  className="list-decimal ml-6 text-gray-700 space-y-1 mb-4"
                  {...props}
                />
              ),
              li: ({ node, ...props }) => (
                <li className="text-gray-700" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-amber-500 pl-4 italic text-gray-600 my-4 bg-amber-50 py-2"
                  {...props}
                />
              ),
              code: ({ node, inline, ...props }: { node?: any; inline?: boolean }) => {
                return inline ? (
                  <code
                    className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                  />
                ) : (
                  <code
                    className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono"
                    {...props}
                  />
                );
              },
              pre: ({ node, ...props }) => (
                <pre className="mb-4 overflow-x-auto" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-amber-900" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="italic text-amber-800" {...props} />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-8 border-amber-200" {...props} />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-4">
                  <table
                    className="min-w-full border-collapse border border-amber-200"
                    {...props}
                  />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border border-amber-200 bg-amber-50 px-4 py-2 text-left font-semibold text-amber-900"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="border border-amber-200 px-4 py-2 text-gray-700"
                  {...props}
                />
              ),
            }}
          >
            {result}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
