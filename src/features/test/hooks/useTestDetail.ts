"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type { TestDetailResponse } from "../lib/dto";

export const useTestDetail = (testId: string) => {
  return useQuery({
    queryKey: ["test", "detail", testId],
    queryFn: async () => {
      const response = await apiClient.get<TestDetailResponse>(
        `/api/test/${testId}`
      );
      return response.data;
    },
    enabled: !!testId,
  });
};
