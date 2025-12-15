"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";

export const useDeleteTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testId: string) => {
      const response = await apiClient.delete(`/api/test/${testId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test", "list"] });
    },
  });
};
