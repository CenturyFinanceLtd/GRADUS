import { edgeRequest } from "@/lib/edgeClient";

export type EventItem = {
  id: string;
  slug: string;
  name: string;
  eventType: string;
  heroImage?: { url?: string };
  schedule?: { start?: string; end?: string };
  location?: { address?: string; venue?: string; city?: string };
  status?: string;
  speakers?: Array<{ name?: string; title?: string }>;
  registration?: { url?: string; joinUrl?: string; formUrl?: string };
  description?: string;
};

type EventsResponse = {
  items: EventItem[];
};

export const fetchMasterclasses = async (
  timeframe: "upcoming" | "past" | "all" = "upcoming",
  limit = 10
) => {
  const query =
    timeframe === "all"
      ? `?isMasterclass=true&limit=${limit}`
      : `?isMasterclass=true&timeframe=${timeframe}&limit=${limit}`;

  const response = await edgeRequest<EventsResponse>(`/events-api${query}`);
  return response.items || [];
};

export const fetchEvents = async (
  timeframe: "upcoming" | "past" | "all" = "upcoming",
  limit = 10
) => {
  const query =
    timeframe === "all"
      ? `?limit=${limit}`
      : `?timeframe=${timeframe}&limit=${limit}`;

  const response = await edgeRequest<EventsResponse>(`/events-api${query}`);
  return response.items || [];
};

export const fetchEventBySlug = async (slug: string) => {
  return edgeRequest<EventItem>(`/events-api/${encodeURIComponent(slug)}`);
};
