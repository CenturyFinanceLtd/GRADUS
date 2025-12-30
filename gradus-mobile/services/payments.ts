import { edgeRequest } from "@/lib/edgeClient";

export type PaymentOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  course?: { slug?: string; name?: string };
};

export type PaymentVerifyPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export const createCourseOrder = async (token: string, courseSlug: string) => {
  return edgeRequest<PaymentOrder>("/payment-processing/course-order", {
    method: "POST",
    token,
    body: { courseSlug },
  });
};

export const verifyCoursePayment = async (
  token: string,
  payload: PaymentVerifyPayload
) => {
  return edgeRequest<{ status: string }>("/payment-processing/verify", {
    method: "POST",
    token,
    body: payload,
  });
};
