import { Icon } from "@iconify/react/dist/iconify.js";
import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  fetchEmailAccounts,
  fetchEmailMessage,
  fetchEmailMessages,
  fetchEmailAttachment,
} from "../services/adminEmailInbox";

const DEFAULT_LABELS = [
  { id: "INBOX", name: "Inbox" },
  { id: "STARRED", name: "Starred" },
  { id: "SNOOZED", name: "Snoozed" },
  { id: "IMPORTANT", name: "Important" },
  { id: "SENT", name: "Sent" },
  { id: "DRAFT", name: "Drafts" },
  { id: "SPAM", name: "Spam" },
  { id: "TRASH", name: "Bin" },
  { id: "CATEGORY_SOCIAL", name: "Social" },
  { id: "CATEGORY_PROMOTIONS", name: "Promotions" },
  { id: "CATEGORY_UPDATES", name: "Updates" },
  { id: "CATEGORY_FORUMS", name: "Forums" },
];

const LABEL_ICON_MAP = {
  INBOX: "material-symbols:inbox-rounded",
  STARRED: "ph:star-bold",
  SNOOZED: "mdi:alarm",
  IMPORTANT: "mdi:label-important-outline",
  SENT: "ion:paper-plane-outline",
  DRAFT: "mdi:file-document-edit-outline",
  SPAM: "ph:warning-bold",
  TRASH: "material-symbols:delete-outline",
  CATEGORY_SOCIAL: "mdi:account-group-outline",
  CATEGORY_PROMOTIONS: "mdi:tag-outline",
  CATEGORY_UPDATES: "mdi:bell-outline",
  CATEGORY_FORUMS: "mdi:forum-outline",
};

const MAIN_LABELS = [
  { id: "INBOX", name: "Inbox" },
  { id: "STARRED", name: "Starred" },
  { id: "SNOOZED", name: "Snoozed" },
  { id: "IMPORTANT", name: "Important" },
  { id: "SENT", name: "Sent" },
  { id: "DRAFT", name: "Drafts" },
];

const SECONDARY_LABELS = [
  { id: "ALL", name: "All Mail", icon: "mdi:archive-arrow-down-outline" },
  { id: "SPAM", name: "Spam" },
  { id: "TRASH", name: "Bin" },
];

const CATEGORY_NAV_ITEMS = [
  { key: "primary", label: "Primary", labelId: "INBOX", icon: "mdi:inbox-full-outline" },
  { key: "social", label: "Social", labelId: "CATEGORY_SOCIAL", icon: "mdi:account-group-outline" },
  { key: "promotions", label: "Promotions", labelId: "CATEGORY_PROMOTIONS", icon: "mdi:tag-outline" },
  { key: "updates", label: "Updates", labelId: "CATEGORY_UPDATES", icon: "mdi:bell-outline" },
  { key: "forums", label: "Forums", labelId: "CATEGORY_FORUMS", icon: "mdi:forum-outline" },
];

const TOP_CATEGORY_TABS = CATEGORY_NAV_ITEMS.slice(0, 3);

const sanitizeLabels = (labels = []) =>
  labels.map((label) => ({
    id: label.id,
    name: label.name || label.id,
    icon: LABEL_ICON_MAP[label.id] || "mdi:label-outline",
  }));

const formatEmailDate = (isoValue) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const ellipsize = (value, maxLength = 120) => {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const formatAddress = (address) => {
  if (!address) return "";
  const name = address.name?.trim();
  if (name && address.email) {
    return `${name} <${address.email}>`;
  }
  return address.email || address.value || "";
};

const recipientListToString = (recipients = []) =>
  recipients
    .map((recipient) => formatAddress(recipient))
    .filter(Boolean)
    .join(", ");

const gmailBase64ToBlob = (base64Data, mimeType = "application/octet-stream") => {
  if (!base64Data) {
    return null;
  }
  const normalized = base64Data.replace(/-/g, "+").replace(/_/g, "/");
  const binaryString = window.atob(normalized);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[unitIndex]}`;
};

const EmailLayer = () => {
  const { token } = useAuthContext();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [supportedLabels, setSupportedLabels] = useState(
    sanitizeLabels(DEFAULT_LABELS)
  );
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [labelId, setLabelId] = useState(DEFAULT_LABELS[0].id);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagesMeta, setMessagesMeta] = useState({
    nextPageToken: null,
    resultSizeEstimate: 0,
    fetchedAt: null,
  });
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [messageDetail, setMessageDetail] = useState(null);
  const [messageDetailLoading, setMessageDetailLoading] = useState(false);
  const [messageDetailError, setMessageDetailError] = useState(null);
  const [attachmentDownloads, setAttachmentDownloads] = useState({});
  const [showMoreLabels, setShowMoreLabels] = useState(false);
  const previousAccountRef = useRef(null);
  const requestedAccountParam = searchParams.get("account");
  const normalizedRequestedAccount = requestedAccountParam
    ? requestedAccountParam.trim().toLowerCase()
    : "";

  const handleLabelSelect = useCallback((targetLabelId) => {
    setLabelId(targetLabelId);
    setSearchInput("");
    setAppliedSearch("");
    setMessages([]);
    setMessagesMeta({ nextPageToken: null, resultSizeEstimate: 0, fetchedAt: null });
    setMessagesError(null);
    setSelectedMessageId(null);
    setMessageDetail(null);
    setMessageDetailError(null);
  }, []);

  const activeAccount = useMemo(
    () => accounts.find((acct) => acct.email === selectedAccount) || null,
    [accounts, selectedAccount]
  );

  const activeLabelSummary = useMemo(() => {
    const summary = {};
    if (activeAccount?.labels) {
      activeAccount.labels.forEach((label) => {
        const normalizedId = (label.id || '').toUpperCase();
        summary[normalizedId] = label;
      });
    }
    return summary;
  }, [activeAccount]);

  const getLabelStats = useCallback(
    (labelKey) => {
      const normalized = (labelKey || '').toUpperCase();
      if (!normalized || normalized === 'ALL') {
        return null;
      }
      return activeLabelSummary[normalized] || null;
    },
    [activeLabelSummary]
  );

  const getLabelCount = useCallback(
    (labelKey, { preferUnread = true } = {}) => {
      const stats = getLabelStats(labelKey);
      if (!stats) {
        return null;
      }

      if (preferUnread && typeof stats.messagesUnread === 'number') {
        return stats.messagesUnread;
      }

      if (typeof stats.messagesTotal === 'number') {
        return stats.messagesTotal;
      }

      if (typeof stats.messagesUnread === 'number') {
        return stats.messagesUnread;
      }

      return null;
    },
    [getLabelStats]
  );

  const formatLabelCount = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (value > 999) {
      return '999+';
    }
    return `${value}`;
  };

  const activeCategoryKey = useMemo(() => {
    const match = CATEGORY_NAV_ITEMS.find((item) => item.labelId === labelId);
    return match?.key || null;
  }, [labelId]);
  const normalizedActiveLabelId = (labelId || "").toUpperCase();

  const sanitizedHtmlBody = useMemo(() => {
    const html = messageDetail?.message?.htmlBody;
    if (!html) {
      return null;
    }
    return DOMPurify.sanitize(html);
  }, [messageDetail]);

  useEffect(() => {
    if (!normalizedRequestedAccount) {
      return;
    }
    setSelectedAccount((current) => {
      if (accounts.some((account) => account.email === normalizedRequestedAccount)) {
        return normalizedRequestedAccount;
      }
      return current;
    });
  }, [normalizedRequestedAccount, accounts]);

  const fetchAccounts = useCallback(async () => {
    if (!token) {
      setAccounts([]);
      setSelectedAccount(null);
      setAccountsLoading(false);
      setAccountsError(null);
      return;
    }
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const response = await fetchEmailAccounts(token);
      const list = Array.isArray(response?.accounts) ? response.accounts : [];
      setAccounts(list);
      if (Array.isArray(response?.supportedLabels) && response.supportedLabels.length) {
        setSupportedLabels(sanitizeLabels(response.supportedLabels));
      }
      setSelectedAccount((current) => {
        if (current && list.some((account) => account.email === current)) {
          return current;
        }
        const preferred =
          list.find((account) => account.status === "connected") ||
          list[0];
        return preferred?.email || null;
      });
    } catch (error) {
      setAccounts([]);
      setSelectedAccount(null);
      setAccountsError(error?.message || "Failed to load mailboxes.");
    } finally {
      setAccountsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!selectedAccount) {
      previousAccountRef.current = null;
      setMessages([]);
      setMessagesMeta({ nextPageToken: null, resultSizeEstimate: 0, fetchedAt: null });
      setSelectedMessageId(null);
      setMessageDetail(null);
      setMessageDetailError(null);
      return;
    }
    if (previousAccountRef.current === selectedAccount) {
      return;
    }
    previousAccountRef.current = selectedAccount;
    handleLabelSelect(supportedLabels[0]?.id || DEFAULT_LABELS[0].id);
  }, [selectedAccount, supportedLabels, handleLabelSelect]);

  useEffect(() => {
    if (!token || !selectedAccount) {
      setMessages([]);
      setSelectedMessageId(null);
      setMessagesMeta({ nextPageToken: null, resultSizeEstimate: 0, fetchedAt: null });
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const response = await fetchEmailMessages({
          token,
          account: selectedAccount,
          labelId,
          search: appliedSearch,
        });
        if (cancelled) return;
        setMessages(Array.isArray(response?.messages) ? response.messages : []);
        setMessagesMeta({
          nextPageToken: response?.nextPageToken || null,
          resultSizeEstimate: response?.resultSizeEstimate ?? 0,
          fetchedAt: response?.fetchedAt || null,
        });
        setSelectedMessageId((current) => {
          if (response?.messages?.length) {
            return response.messages[0].id;
          }
          return current && response?.messages?.some((msg) => msg.id === current)
            ? current
            : null;
        });
      } catch (error) {
        if (cancelled) return;
        setMessages([]);
        setSelectedMessageId(null);
        setMessagesMeta({ nextPageToken: null, resultSizeEstimate: 0, fetchedAt: null });
        setMessagesError(error?.message || "Failed to load emails.");
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [token, selectedAccount, labelId, appliedSearch, refreshNonce]);

  useEffect(() => {
    if (!token || !selectedAccount || !selectedMessageId) {
      setMessageDetail(null);
      setMessageDetailError(null);
      setAttachmentDownloads({});
      return;
    }

    let cancelled = false;
    const loadMessage = async () => {
      setMessageDetailLoading(true);
      setMessageDetailError(null);
      try {
        const response = await fetchEmailMessage({
          token,
          account: selectedAccount,
          messageId: selectedMessageId,
        });
        if (cancelled) return;
        setMessageDetail(response);
        setAttachmentDownloads({});
      } catch (error) {
        if (cancelled) return;
        setMessageDetail(null);
        setMessageDetailError(error?.message || "Failed to load email.");
      } finally {
        if (!cancelled) {
          setMessageDetailLoading(false);
        }
      }
    };
    loadMessage();
    return () => {
      cancelled = true;
    };
  }, [token, selectedAccount, selectedMessageId]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleSearchReset = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  const handleRefresh = () => {
    setRefreshNonce((prev) => prev + 1);
  };

  const handleLoadMore = async () => {
    if (!token || !selectedAccount || !messagesMeta.nextPageToken) return;
    setLoadingMore(true);
    try {
      const response = await fetchEmailMessages({
        token,
        account: selectedAccount,
        labelId,
        search: appliedSearch,
        pageToken: messagesMeta.nextPageToken,
      });
      setMessages((current) => [
        ...current,
        ...(Array.isArray(response?.messages) ? response.messages : []),
      ]);
      setMessagesMeta({
        nextPageToken: response?.nextPageToken || null,
        resultSizeEstimate: response?.resultSizeEstimate ?? 0,
        fetchedAt: response?.fetchedAt || null,
      });
    } catch (error) {
      setMessagesError(error?.message || "Failed to load additional emails.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCompose = () => {
    if (!selectedAccount) return;
    const url = `https://mail.google.com/mail/?authuser=${encodeURIComponent(
      selectedAccount
    )}&view=cm&fs=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleDownloadAttachment = useCallback(
    async (attachment) => {
      if (!token || !selectedAccount || !messageDetail?.message?.id) {
        return;
      }
      const { attachmentId } = attachment;
      if (!attachmentId) {
        return;
      }
      setAttachmentDownloads((prev) => ({
        ...prev,
        [attachmentId]: { loading: true, error: null },
      }));
      try {
        const response = await fetchEmailAttachment({
          token,
          account: selectedAccount,
          messageId: messageDetail.message.id,
          attachmentId,
        });
        const base64Data = response?.attachment?.data;
        const blob = gmailBase64ToBlob(base64Data, attachment.mimeType || "application/octet-stream");
        if (!blob) {
          throw new Error("Attachment data is empty.");
        }
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = attachment.filename || "attachment";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setAttachmentDownloads((prev) => ({
          ...prev,
          [attachmentId]: { loading: false, error: null },
        }));
      } catch (error) {
        setAttachmentDownloads((prev) => ({
          ...prev,
          [attachmentId]: {
            loading: false,
            error: error?.message || "Failed to download attachment.",
          },
        }));
      }
    },
    [selectedAccount, messageDetail, token]
  );

  const renderAccounts = () => {
    if (accountsLoading) {
      return (
        <div className='d-flex justify-content-center py-4'>
          <div className='spinner-border text-primary' role='status' />
        </div>
      );
    }
    if (accountsError) {
      return <p className='text-danger mb-0'>{accountsError}</p>;
    }
    if (!accounts.length) {
      return <p className='text-secondary-light mb-0'>No Gmail accounts configured.</p>;
    }
    return (
      <ul className='list-unstyled mb-0'>
        {accounts.map((account) => {
          const isActive = account.email === selectedAccount;
          const status = account.status || "connected";
          const disabled = status !== "connected";
          const inboxLabel = account.labels?.find((label) => label.id === "INBOX");
          let mailboxCount = null;
          if (inboxLabel) {
            if (typeof inboxLabel.messagesUnread === "number") {
              mailboxCount = inboxLabel.messagesUnread;
            } else if (typeof inboxLabel.messagesTotal === "number") {
              mailboxCount = inboxLabel.messagesTotal;
            }
          }
          const displayCount = formatLabelCount(mailboxCount);
          return (
            <li key={account.email} className='mb-8'>
              <button
                type='button'
                className={`w-100 d-flex align-items-center justify-content-between px-12 py-10 radius-8 border text-start ${
                  isActive
                    ? "bg-primary-50 border-primary-200 text-primary-800"
                    : "bg-transparent border-neutral-200 text-secondary-light bg-hover-primary-50"
                }`}
                onClick={() => !disabled && setSelectedAccount(account.email)}
                disabled={disabled}
                >
                  <span className='d-flex flex-column'>
                    <span className='fw-semibold text-sm'>{account.displayName || account.email}</span>
                    <span className='text-xxs text-secondary-light'>{account.email}</span>
                  </span>
                  {disabled ? (
                    <span className='text-xs fw-medium text-danger'>Error</span>
                  ) : (
                    <span className='text-xs fw-medium text-secondary-light'>
                      {displayCount ?? "--"}
                    </span>
                  )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderLabelButton = (label) => {
    const icon = label.icon || LABEL_ICON_MAP[label.id] || "mdi:label-outline";
    const isActive =
      label.id === labelId || (label.id === "ALL" && normalizedActiveLabelId === "ALL");
    const prefersUnread = !["SENT", "DRAFT"].includes((label.id || "").toUpperCase());
    const countValue = getLabelCount(label.id, { preferUnread: prefersUnread });
    const formattedCount = formatLabelCount(countValue);

    return (
      <li key={label.id} className='mb-2'>
        <button
          type='button'
          className={`w-100 d-flex align-items-center justify-content-between px-12 py-8 radius-8 text-start ${
            isActive ? "bg-primary-50 text-primary-800 fw-semibold" : "bg-transparent text-secondary-light bg-hover-primary-50"
          }`}
          onClick={() => handleLabelSelect(label.id)}
        >
          <span className='d-flex align-items-center gap-10'>
            <Icon icon={icon} className='text-lg' />
            {label.name}
          </span>
          {formattedCount !== null ? (
            <span className='text-sm fw-medium'>{formattedCount}</span>
          ) : null}
        </button>
      </li>
    );
  };

  const renderLabelNavigation = () => (
    <>
      <ul className='list-unstyled mb-2'>
        {MAIN_LABELS.map((label) => renderLabelButton(label))}
      </ul>
      <button
        type='button'
        className='btn btn-link text-start text-sm px-12 py-6 text-secondary-light'
        onClick={() => setShowMoreLabels((prev) => !prev)}
      >
        <Icon
          icon={showMoreLabels ? "mdi:chevron-up" : "mdi:chevron-down"}
          className='me-2 text-lg'
        />
        {showMoreLabels ? "Less" : "More"}
      </button>
      {showMoreLabels ? (
        <ul className='list-unstyled mt-2'>
          {SECONDARY_LABELS.map((label) => renderLabelButton(label))}
        </ul>
      ) : null}
    </>
  );

  const renderCategoryList = () => (
    <ul className='list-unstyled mb-0'>
      {CATEGORY_NAV_ITEMS.map((category) => {
        const unread = formatLabelCount(getLabelCount(category.labelId, { preferUnread: true }));
        const isActive = labelId === category.labelId;

        return (
          <li key={category.key} className='mb-2'>
            <button
              type='button'
              className={`w-100 d-flex align-items-center justify-content-between px-12 py-8 radius-8 text-start ${
                isActive ? "bg-primary-50 text-primary-800 fw-semibold" : "bg-transparent text-secondary-light bg-hover-primary-50"
              }`}
              onClick={() => handleLabelSelect(category.labelId)}
            >
              <span className='d-flex align-items-center gap-10'>
                <Icon icon={category.icon} className='text-lg' />
                {category.label}
              </span>
              {unread !== null ? (
                <span className='text-sm fw-medium'>{unread}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderToolbar = () => (
    <div className='d-flex align-items-center justify-content-between flex-wrap gap-3 px-24 py-12 border-bottom bg-base'>
      <div className='d-flex align-items-center gap-2'>
        <div className='form-check style-check d-flex align-items-center mb-0'>
          <input
            className='form-check-input radius-4 border input-form-dark'
            type='checkbox'
            name='selectAllMessages'
            disabled
          />
        </div>
        <button type='button' className='btn btn-link text-secondary-light px-2'>
          <Icon icon='mdi:chevron-down' className='text-lg' />
        </button>
        <button
          type='button'
          className='btn btn-outline-light border-neutral-200 text-secondary-light btn-sm d-flex align-items-center justify-content-center'
          onClick={handleRefresh}
        >
          <Icon icon='mdi:refresh' className='text-lg' />
        </button>
        <button
          type='button'
          className='btn btn-outline-light border-neutral-200 text-secondary-light btn-sm d-flex align-items-center justify-content-center'
        >
          <Icon icon='mdi:dots-vertical' className='text-lg' />
        </button>
      </div>
      {messagesMeta?.fetchedAt ? (
        <span className='text-xxs text-secondary-light'>
          Updated {formatEmailDate(messagesMeta.fetchedAt)}
        </span>
      ) : null}
    </div>
  );

  const renderCategoryTabs = () => (
    <div className='d-flex flex-wrap gap-3 px-24 py-16 border-bottom bg-base category-tab-row'>
      {TOP_CATEGORY_TABS.map((tab) => {
        const isActive = activeCategoryKey === tab.key;
        const unread = formatLabelCount(getLabelCount(tab.labelId, { preferUnread: true }));

        return (
          <button
            key={tab.key}
            type='button'
            className={`flex-grow-1 text-start border radius-8 px-16 py-12 d-flex align-items-center justify-content-between gap-3 ${
              isActive ? "border-primary-200 bg-primary-50" : "border-neutral-200 bg-base"
            }`}
            onClick={() => handleLabelSelect(tab.labelId)}
          >
            <span className='d-flex align-items-center gap-3'>
              <Icon icon={tab.icon} className='text-xl' />
              <span className='fw-semibold'>{tab.label}</span>
            </span>
            {unread !== null ? (
              <span className='badge bg-soft-primary text-primary-800 text-xxs'>
                {unread} new
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const renderMessageList = () => {
    if (!selectedAccount) {
      return <p className='text-secondary-light m-0 p-24'>Choose an account to load emails.</p>;
    }
    if (messagesLoading && !messages.length) {
      return (
        <div className='d-flex justify-content-center align-items-center py-5'>
          <div className='spinner-border text-primary' role='status' />
        </div>
      );
    }
    if (messagesError && !messages.length) {
      return <p className='text-danger m-0 p-24'>{messagesError}</p>;
    }
    if (!messages.length) {
      return <p className='text-secondary-light m-0 p-24'>No emails found.</p>;
    }
    return (
      <>
        <ul className='list-unstyled mb-0'>
          {messages.map((message) => {
            const isActive = message.id === selectedMessageId;
            return (
              <li key={message.id} className='border-bottom border-neutral-200'>
                <button
                  type='button'
                  className={`w-100 text-start px-24 py-16 d-flex gap-3 ${
                    isActive ? "bg-primary-50" : "bg-transparent bg-hover-neutral-100"
                  }`}
                  onClick={() => setSelectedMessageId(message.id)}
                >
                  <div className='flex-grow-1'>
                    <div className='d-flex align-items-center justify-content-between mb-4'>
                      <span className={`fw-semibold text-sm ${message.unread ? "text-primary-800" : "text-secondary-light"}`}>
                        {formatAddress(message.from) || "Unknown sender"}
                      </span>
                      <span className='text-xxs text-secondary-light'>
                        {formatEmailDate(message.receivedAt)}
                      </span>
                    </div>
                    <p className='mb-0 text-md fw-semibold text-primary-light text-line-1'>
                      {message.subject || "(No subject)"}
                    </p>
                    <p className='mb-0 text-sm text-secondary-light text-line-2'>
                      {ellipsize(message.snippet || message.textBody)}
                    </p>
                    {message.hasAttachments ? (
                      <span className='text-xxs text-secondary-light d-inline-flex align-items-center gap-1 mt-1'>
                        <Icon icon='mdi:paperclip' className='text-base' />
                        Attachments
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {messagesError ? <p className='text-danger text-sm px-24 mb-0 mt-2'>{messagesError}</p> : null}
      </>
    );
  };

  const renderMessageDetail = () => {
    if (!selectedMessageId) {
      return <p className='text-secondary-light m-0'>Select an email to read the contents.</p>;
    }
    if (messageDetailLoading) {
      return (
        <div className='d-flex justify-content-center align-items-center py-5'>
          <div className='spinner-border text-primary' role='status' />
        </div>
      );
    }
    if (messageDetailError) {
      return <p className='text-danger m-0'>{messageDetailError}</p>;
    }
    const message = messageDetail?.message;
    if (!message) {
      return <p className='text-secondary-light m-0'>Unable to display this email.</p>;
    }
    const recipients = recipientListToString(message.to);
    const ccRecipients = recipientListToString(message.cc);

    return (
      <div className='h-100 d-flex flex-column'>
        <div className='border-bottom border-neutral-200 pb-16 mb-16'>
          <h5 className='mb-3'>{message.subject}</h5>
          <div className='d-flex justify-content-between align-items-start flex-wrap gap-2'>
            <div>
              <p className='mb-1 text-sm'>
                <span className='fw-semibold'>From: </span>
                <span className='text-secondary-light'>{formatAddress(message.from)}</span>
              </p>
              {recipients ? (
                <p className='mb-1 text-sm'>
                  <span className='fw-semibold'>To: </span>
                  <span className='text-secondary-light'>{recipients}</span>
                </p>
              ) : null}
              {ccRecipients ? (
                <p className='mb-1 text-sm'>
                  <span className='fw-semibold'>Cc: </span>
                  <span className='text-secondary-light'>{ccRecipients}</span>
                </p>
              ) : null}
            </div>
            <div className='text-end'>
              <p className='mb-1 text-sm text-secondary-light'>
                {formatEmailDate(message.receivedAt)}
              </p>
              <p className='mb-0 text-xxs text-muted'>{message.id}</p>
            </div>
          </div>
        </div>
        <div className='flex-grow-1 overflow-auto'>
          {sanitizedHtmlBody ? (
            <div
              className='email-body'
              dangerouslySetInnerHTML={{ __html: sanitizedHtmlBody }}
            />
          ) : (
            <pre className='email-body text-sm text-secondary-light'>{message.textBody}</pre>
          )}
        </div>
        {message.attachments?.length ? (
          <div className='border-top border-neutral-200 pt-16 mt-16'>
            <h6 className='text-sm fw-semibold d-flex align-items-center gap-2 mb-3'>
              <Icon icon='mdi:paperclip' className='text-base' />
              Attachments
            </h6>
            <ul className='list-unstyled mb-0'>
              {message.attachments.map((file) => {
                const downloadState = attachmentDownloads[file.attachmentId] || { loading: false, error: null };
                return (
                  <li key={file.attachmentId} className='mb-3 border rounded-3 px-16 py-10'>
                    <div className='d-flex align-items-center justify-content-between flex-wrap gap-3'>
                      <div>
                        <p className='mb-1 fw-semibold text-sm text-primary-light'>
                          {file.filename || file.mimeType || "Attachment"}
                        </p>
                        <div className='text-xxs text-secondary-light d-flex gap-3'>
                          <span>{file.mimeType || "application/octet-stream"}</span>
                          {typeof file.size === "number" ? <span>{formatFileSize(file.size)}</span> : null}
                        </div>
                      </div>
                      <button
                        type='button'
                        className='btn btn-outline-primary btn-sm d-flex align-items-center gap-2'
                        onClick={() => handleDownloadAttachment(file)}
                        disabled={downloadState.loading}
                      >
                        {downloadState.loading ? (
                          <>
                            <span className='spinner-border spinner-border-sm' role='status' />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Icon icon='mdi:download' className='text-lg' />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                    {downloadState.error ? (
                      <p className='text-danger text-xxs mb-0 mt-2'>{downloadState.error}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className='row gy-4'>
      <div className='col-xxl-3'>
        <div className='card h-100 p-0'>
          <div className='card-body p-20 d-flex flex-column h-100'>
            <button
              type='button'
              className='btn btn-primary text-base fw-semibold px-16 py-12 w-100 radius-8 d-flex align-items-center gap-2 mb-12'
              onClick={handleCompose}
              disabled={!selectedAccount}
            >
              <Icon icon='fa6-regular:pen-to-square' className='text-lg' />
              Compose
            </button>
            <div className='flex-grow-1 overflow-auto gmail-nav'>
              {renderLabelNavigation()}
              <div className='mt-24'>
                <h6 className='text-sm fw-semibold text-uppercase text-secondary-light mb-8'>
                  Categories
                </h6>
                {renderCategoryList()}
              </div>
              <div className='mt-24'>
                <h6 className='text-sm fw-semibold text-uppercase text-secondary-light mb-8'>
                  Accounts
                </h6>
                {renderAccounts()}
              </div>
              <div className='mt-24'>
                <button type='button' className='btn btn-link d-flex align-items-center gap-2 px-12 text-secondary-light'>
                  <Icon icon='mdi:label-multiple-outline' />
                  Manage labels
                </button>
                <button type='button' className='btn btn-link d-flex align-items-center gap-2 px-12 text-secondary-light'>
                  <Icon icon='mdi:shape-circle-plus' />
                  Create new label
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='col-xxl-9'>
        <div className='card h-100 p-0 email-card d-flex flex-column'>
          <div className='card-header border-bottom bg-base py-16 px-24'>
            <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
              <form
                className='d-flex align-items-center gap-2 flex-grow-1'
                onSubmit={handleSearchSubmit}
              >
                <div className='search-input flex-grow-1 d-flex align-items-center gap-2'>
                  <Icon icon='mdi:magnify' className='text-lg text-secondary-light' />
                  <input
                    type='text'
                    className='form-control border-0'
                    placeholder='Search mail'
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
                <button type='submit' className='btn btn-outline-primary btn-sm'>
                  Search
                </button>
                {appliedSearch ? (
                  <button
                    type='button'
                    className='btn btn-link btn-sm text-danger'
                    onClick={handleSearchReset}
                  >
                    Clear
                  </button>
                ) : null}
              </form>
              <div className='d-flex align-items-center gap-2'>
                <button
                  type='button'
                  className='btn btn-outline-light border-neutral-200 text-secondary-light btn-sm d-flex align-items-center justify-content-center'
                >
                  <Icon icon='mdi:tune-vertical' className='text-lg' />
                </button>
                <button
                  type='button'
                  className='btn btn-outline-light border-neutral-200 text-secondary-light btn-sm d-flex align-items-center justify-content-center'
                >
                  <Icon icon='mdi:gear-outline' className='text-lg' />
                </button>
              </div>
            </div>
          </div>
          {renderToolbar()}
          {renderCategoryTabs()}
          {appliedSearch ? (
            <div className='px-24 pt-3'>
              <span className='badge bg-soft-primary text-primary-800 text-xxs'>
                Filtering by: {appliedSearch}
              </span>
            </div>
          ) : null}
          <div className='card-body p-0 flex-grow-1'>
            <div className='row g-0 h-100'>
              <div className='col-xl-5 border-end border-neutral-200'>
                <div style={{ maxHeight: "70vh", overflowY: "auto" }}>{renderMessageList()}</div>
                {messagesMeta.nextPageToken ? (
                  <div className='p-24 border-top border-neutral-200 text-center'>
                    <button
                      type='button'
                      className='btn btn-outline-primary btn-sm w-100'
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <span
                            className='spinner-border spinner-border-sm me-2'
                            role='status'
                          />
                          Loading…
                        </>
                      ) : (
                        "Load more"
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className='col-xl-7'>
                <div
                  className='p-24'
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {renderMessageDetail()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailLayer;
