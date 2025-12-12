"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
} from "../lib/dto";

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubscriptionRequest) => {
      const response = await apiClient.post<CreateSubscriptionResponse>(
        "/api/subscription/create",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
    },
  });
};
