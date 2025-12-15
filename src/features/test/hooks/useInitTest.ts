"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type { CreateTestRequest, InitTestResponse } from "../lib/dto";

export const useInitTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTestRequest) => {
      const response = await apiClient.post<InitTestResponse>(
        "/api/test/init",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test", "list"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
};
