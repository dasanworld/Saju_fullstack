"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/remote/api-client";
import type { SubscriptionStatusResponse } from "../lib/dto";

export const useSubscription = () => {
  return useQuery({
    queryKey: ["subscription", "status"],
    queryFn: async () => {
      const response = await apiClient.get<SubscriptionStatusResponse>(
        "/api/subscription/status"
      );
      return response.data;
    },
  });
};
