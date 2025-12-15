import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";

export const sendMessage = async (message: string, history: Array<{ role: string; content: string }> = [], pageContext?: string) => {
  const { token } = await getAuthSession();
  
  const payload = {
    message,
    history: history.map((h) => ({ role: h.role, content: h.content })),
    page: pageContext || "Mobile App - Chat Support",
    systemPrompt: "You are a helpful assistant for Gradus, an educational platform.",
  };

  const res = await fetch(`${API_BASE_URL}/api/chatbot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    // Try to parse JSON error if possible
    try {
        const jsonError = JSON.parse(text);
        throw new Error(jsonError.message || "Failed to send message");
    } catch (e) {
        throw new Error(text || "Failed to send message");
    }
  }

  return res.json();
};
