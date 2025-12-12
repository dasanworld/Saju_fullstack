import axios from "axios";
import type { ChargeTossPaymentParams, ChargeTossPaymentResult } from "./types";

const TOSS_API_BASE_URL = "https://api.tosspayments.com/v1";

const getTossClient = () => {
  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY is not defined");
  }

  return axios.create({
    baseURL: TOSS_API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
  });
};

export const chargeTossPayment = async (
  params: ChargeTossPaymentParams
): Promise<ChargeTossPaymentResult> => {
  try {
    const tossClient = getTossClient();

    await tossClient.post("/billing", {
      billingKey: params.billing_key,
      customerEmail: params.customer_email,
      amount: params.amount,
      orderId: `order_${Date.now()}`,
      orderName: "Saju피아 Pro 구독",
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "결제 실패";

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const deleteTossBillingKey = async (
  billing_key: string
): Promise<boolean> => {
  try {
    const tossClient = getTossClient();
    await tossClient.delete(`/billing/${billing_key}`);
    return true;
  } catch (error) {
    console.error("Failed to delete billing key", error);
    return false;
  }
};
