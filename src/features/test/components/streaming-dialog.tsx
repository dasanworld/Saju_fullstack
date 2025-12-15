"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StreamingDialogProps {
  open: boolean;
  streamedText: string;
  isStreaming: boolean;
  fallbackMessage: string | null;
  error: string | null;
}

export const StreamingDialog = ({
  open,
  streamedText,
  isStreaming,
  fallbackMessage,
  error,
}: StreamingDialogProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (shouldAutoScrollRef.current && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamedText]);

  const handleScroll = () => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScrollRef.current = isNearBottom;
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isStreaming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <span>AI가 사주팔자를 분석하고 있습니다...</span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span>분석 오류</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span>분석 완료!</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {fallbackMessage && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              {fallbackMessage}
            </AlertDescription>
          </Alert>
        )}

        {error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : (
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[60vh]"
          >
            {streamedText ? (
              <div className="prose prose-amber max-w-none prose-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-2xl font-bold text-amber-900 mt-6 mb-3"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-xl font-bold text-amber-900 mt-5 mb-2"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-lg font-semibold text-amber-800 mt-3 mb-2"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-gray-700 mb-3 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc ml-5 text-gray-700 space-y-1 mb-3"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal ml-5 text-gray-700 space-y-1 mb-3"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-gray-700" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-amber-500 pl-3 italic text-gray-600 my-3 bg-amber-50 py-2"
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold text-amber-900" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic text-amber-800" {...props} />
                    ),
                  }}
                >
                  {streamedText}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-amber-600 animate-pulse ml-1" />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
                  <p className="text-gray-500">분석을 시작하고 있습니다...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
