export type ChargeTossPaymentParams = {
  billing_key: string;
  amount: number;
  customer_email: string;
};

export type ChargeTossPaymentResult = {
  success: boolean;
  error?: string;
};

export type RequestBillingKeyParams = {
  customerKey: string;
  successUrl: string;
  failUrl: string;
};
