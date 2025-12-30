import { edgeRequest } from "@/lib/edgeClient";

export type TicketItem = {
  id: string;
  subject: string;
  status: string;
  lastMessageAt?: string;
  messageCount?: number;
  createdAt?: string;
};

export type TicketMessage = {
  id: string;
  authorType: "user" | "admin";
  body: string;
  createdAt: string;
};

export const fetchTickets = async (token: string, status?: string) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return edgeRequest<{ items: TicketItem[]; total: number }>(
    `/site-services-api/tickets${query}`,
    { token }
  );
};

export const createTicket = async (
  token: string,
  subject: string,
  description: string
) => {
  return edgeRequest<{ message: string; item: TicketItem }>(
    "/site-services-api/tickets",
    {
      method: "POST",
      token,
      body: { subject, description },
    }
  );
};

export const fetchTicketDetail = async (token: string, id: string) => {
  return edgeRequest<{ item: TicketItem; messages: TicketMessage[] }>(
    `/site-services-api/tickets/${id}`,
    { token }
  );
};

export const addTicketMessage = async (
  token: string,
  id: string,
  body: string
) => {
  return edgeRequest<{ message: string; item: TicketMessage }>(
    `/site-services-api/tickets/${id}/messages`,
    {
      method: "POST",
      token,
      body: { body },
    }
  );
};

export const closeTicket = async (token: string, id: string) => {
  return edgeRequest<{ message: string }>(
    `/site-services-api/tickets/${id}/close`,
    {
      method: "PUT",
      token,
    }
  );
};
