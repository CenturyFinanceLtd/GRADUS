import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient";

const WELCOME_MESSAGE = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Hi there! I'm GradusAI. Ask me anything about our programs, placements, mentors, or how to get started.",
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const extractLineSegments = (line) => {
  if (!line) {
    return [];
  }

  const markdownRegex = /\[([^\]]+)\]\s*\((https?:\/\/[^\s)]+)\)/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = markdownRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }

    segments.push({ type: 'link', value: match[2], label: match[1].trim() });
    lastIndex = markdownRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex) });
  }

  const expanded = [];

  segments.forEach((segment) => {
    if (segment.type === 'link') {
      expanded.push(segment);
      return;
    }

    const text = segment.value;

    if (!text) {
      return;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let cursor = 0;
    let urlMatch;

    while ((urlMatch = urlRegex.exec(text)) !== null) {
      if (urlMatch.index > cursor) {
        expanded.push({ type: 'text', value: text.slice(cursor, urlMatch.index) });
      }

      const rawUrl = urlMatch[0];
      const trimmedUrl = rawUrl.replace(/[),.;!?]+$/g, '');
      expanded.push({ type: 'link', value: trimmedUrl, label: trimmedUrl });

      const trailing = rawUrl.slice(trimmedUrl.length);
      if (trailing) {
        expanded.push({ type: 'text', value: trailing });
      }

      cursor = urlRegex.lastIndex;
    }

    if (cursor < text.length) {
      expanded.push({ type: 'text', value: text.slice(cursor) });
    }
  });

  return expanded;
};
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const renderLine = (line, keyBase) => {
    const segments = extractLineSegments(line);

    if (!segments.length) {
      return (
        <span key={`${keyBase}-empty`} className="chatbot-widget__line-spacer" aria-hidden="true">
          {' '}
        </span>
      );
    }

    return segments.map((segment, index) => {
      if (segment.type === 'link') {
        return (
          <a
            key={`${keyBase}-${index}`}
            href={segment.value}
            target="_blank"
            rel="noopener noreferrer"
            className="chatbot-widget__link"
          >
            {segment.label}
          </a>
        );
      }

      return (
        <span key={`${keyBase}-${index}`}>{segment.value}</span>
      );
    });
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = async (rawText) => {
    const trimmed = typeof rawText === "string" ? rawText.trim() : "";

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = { id: createMessageId(), role: "user", content: trimmed };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    const historyPayload = [...messages, userMessage]
      .slice(-6)
      .map((item) => ({ role: item.role, content: item.content }));

    try {
      const data = await apiClient.post("/chatbot", {
        message: trimmed,
        history: historyPayload,
      });

      const reply = (data?.reply || "").trim()
        ? data.reply.trim()
        : "I'm having trouble finding that information right now. Please try again in a moment.";

      const assistantMessage = {
        id: createMessageId(),
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage = {
        id: createMessageId(),
        role: "assistant",
        content:
          error?.message === "Failed to fetch"
            ? "I couldn’t connect to the server. Please check your connection and try again."
            : error?.message || "Something went wrong. Please try again shortly.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(inputValue);
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(inputValue);
    }
  };

  const toggleWidget = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`chatbot-widget ${isOpen ? "chatbot-widget--open" : ""}`}>
      {isOpen && (
        <div className="chatbot-widget__panel">
          <div className="chatbot-widget__header">
            <div>
              <p className="chatbot-widget__title">GradusAI</p>
              <p className="chatbot-widget__subtitle">AI help for programs, mentors, and placements</p>
            </div>
            <button type="button" className="chatbot-widget__close" onClick={toggleWidget} aria-label="Close chatbot">
              <i className="ph-bold ph-x" />
            </button>
          </div>
          <div className="chatbot-widget__messages" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-widget__message chatbot-widget__message--${message.role}`}>
                <div className="chatbot-widget__bubble">
                  {message.content.split(/\n+/).map((line, index) => (
                    <p key={`${message.id}-${index}`}>{renderLine(line, `${message.id}-${index}`)}</p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-widget__message chatbot-widget__message--assistant">
                <div className="chatbot-widget__bubble chatbot-widget__bubble--typing">
                  <span className="chatbot-widget__typing-dot" />
                  <span className="chatbot-widget__typing-dot" />
                  <span className="chatbot-widget__typing-dot" />
                </div>
              </div>
            )}
          </div>
          <form className="chatbot-widget__form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about admissions, internships, mentors, or anything else"
              rows={2}
              className="chatbot-widget__input"
              disabled={isLoading}
            />
            <div className="chatbot-widget__actions">
              <button type="submit" className="chatbot-widget__send" disabled={isLoading || !inputValue.trim()}>
                <span>Send</span>
                <i className="ph-bold ph-paper-plane-tilt" />
              </button>
            </div>
          </form>
        </div>
      )}
      <button type="button" className="chatbot-widget__toggle chatbot-widget__toggle--left" onClick={toggleWidget} aria-pressed={isOpen} aria-label="Open chatbot">
        <i className="ph-bold ph-chat-circle-dots" />
      </button>
    </div>
  );
};

export default ChatbotWidget;



















