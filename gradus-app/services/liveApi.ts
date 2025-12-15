import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";

export const fetchLiveSession = async (sessionId: string) => {
  const { token } = await getAuthSession();
  const res = await fetch(`${API_BASE_URL}/api/live/sessions/${encodeURIComponent(sessionId)}/public`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
     const text = await res.text();
     throw new Error(text || "Failed to fetch session");
  }
  return res.json();
};

export const joinLiveSession = async (sessionId: string, data: { displayName?: string; passcode?: string; meetingToken?: string }) => {
  const { token } = await getAuthSession();
  const res = await fetch(`${API_BASE_URL}/api/live/sessions/${encodeURIComponent(sessionId)}/join`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
   if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to join session");
   }
  return res.json();
};

export const fetchLiveChatMessages = async (sessionId: string, limit = 200) => {
  const { token } = await getAuthSession();
    const res = await fetch(`${API_BASE_URL}/api/live/sessions/${encodeURIComponent(sessionId)}/chat?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
     if (!res.ok) {
        // ignore error for chat
        return { messages: [] };
     }
  return res.json();
};
