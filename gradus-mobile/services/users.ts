import { edgeRequest } from "@/lib/edgeClient";

export type UserProfile = {
  id: string;
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  personalDetails?: Record<string, unknown>;
};

export type EnrollmentItem = {
  id: string;
  status?: string;
  payment_status?: string;
  paymentStatus?: string;
  price_total?: number;
  priceTotal?: number;
  course_slug?: string;
  course?: {
    id?: string;
    slug?: string;
    name?: string;
    image?: { url?: string };
    imageUrl?: string;
    hero?: { priceINR?: number };
    price?: string | number;
  };
};

type UserResponse = {
  user: UserProfile;
};

export const fetchUserProfile = async (token: string) => {
  const response = await edgeRequest<UserResponse>("/users-api/me", { token });
  return response.user;
};

export const updateUserProfile = async (
  token: string,
  updates: Pick<UserProfile, "firstName" | "lastName" | "mobile" | "personalDetails">
) => {
  return edgeRequest<UserProfile>("/users-api/me", {
    method: "PUT",
    token,
    body: updates,
  });
};

export const fetchUserEnrollments = async (token: string) => {
  return edgeRequest<EnrollmentItem[]>("/users-api/enrollments", { token });
};
