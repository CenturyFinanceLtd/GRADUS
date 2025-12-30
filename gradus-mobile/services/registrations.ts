import { edgeRequest } from "@/lib/edgeClient";

export type EventRegistrationPayload = {
  eventSlug: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  city?: string;
  occupation?: string;
};

export const registerForEvent = async (payload: EventRegistrationPayload) => {
  return edgeRequest<{ success: boolean; item?: Record<string, unknown> }>(
    "/event-registrations-api",
    {
      method: "POST",
      body: payload,
    }
  );
};
