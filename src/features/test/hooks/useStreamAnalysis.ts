"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

type StreamStatus = "idle" | "streaming" | "completed" | "error";

interface UseStreamAnalysisReturn {
  streamedText: string;
  status: StreamStatus;
  error: string | null;
  startStream: (testId: string, model: string) => Promise<void>;
}

export const useStreamAnalysis = (): UseStreamAnalysisReturn => {
  const { getToken } = useAuth();
  const [streamedText, setStreamedText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStream = useCallback(
    async (testId: string, model: string) => {
      if (status === "streaming") return;

      setStreamedText("");
      setError(null);
      setStatus("streaming");

      abortControllerRef.current = new AbortController();

      try {
        const token = await getToken();

        const response = await fetch(`/api/test/stream/${testId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ model }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "스트리밍 시작 실패");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("스트림을 읽을 수 없습니다");
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                try {
                  const data = JSON.parse(jsonStr);

                  if (data.text) {
                    setStreamedText((prev) => prev + data.text);
                  }

                  if (data.done) {
                    setStatus("completed");
                  }

                  if (data.error) {
                    setError(data.error);
                    setStatus("error");
                  }
                } catch (e) {
                  console.error("JSON parse error:", e);
                }
              }
            }
          }
        }

        if (status !== "error") {
          setStatus("completed");
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        console.error("Stream error:", err);
        setError(err.message || "스트리밍 중 오류가 발생했습니다");
        setStatus("error");
      }
    },
    [getToken, status]
  );

  return {
    streamedText,
    status,
    error,
    startStream,
  };
};
