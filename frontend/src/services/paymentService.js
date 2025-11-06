import apiClient from "./apiClient";

export const createCourseOrder = ({ slug, token }) =>
  apiClient.post("/payments/course-order", { courseSlug: slug }, { token });

export const verifyPayment = ({ token, data }) =>
  apiClient.post("/payments/verify", data, { token });

export const recordFailure = ({ token, orderId }) =>
  apiClient.post("/payments/fail", { razorpay_order_id: orderId }, { token });

export default { createCourseOrder, verifyPayment, recordFailure };

