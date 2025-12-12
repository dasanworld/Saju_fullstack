"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type { CreateTestRequest, CreateTestResponse } from "../lib/dto";

export const useCreateTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTestRequest) => {
      const response = await apiClient.post<CreateTestResponse>(
        "/api/test/create",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test", "list"] });
    },
  });
};
