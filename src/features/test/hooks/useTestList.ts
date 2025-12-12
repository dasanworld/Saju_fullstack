"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type { TestListResponse } from "../lib/dto";

type UseTestListParams = {
  name?: string;
  limit?: number;
  offset?: number;
};

export const useTestList = (params?: UseTestListParams) => {
  return useQuery({
    queryKey: ["test", "list", params],
    queryFn: async () => {
      const response = await apiClient.get<TestListResponse>("/api/test/list", {
        params,
      });
      return response.data;
    },
  });
};
