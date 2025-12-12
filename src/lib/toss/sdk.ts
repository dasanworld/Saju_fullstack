"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { RequestBillingKeyParams } from "./types";

export const initTossPayments = async () => {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not defined");
  }

  return await loadTossPayments(clientKey);
};

export const requestBillingKey = async (params: RequestBillingKeyParams) => {
  const tossPayments = await initTossPayments();

  return await (tossPayments as any).requestBillingAuth("카드", {
    customerKey: params.customerKey,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
};
