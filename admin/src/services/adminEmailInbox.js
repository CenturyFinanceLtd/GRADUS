import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return searchParams ? `?${searchParams}` : "";
};

export const fetchEmailAccounts = async (token) =>
  apiClient("/admin/email/accounts", {
    token,
  });

export const fetchEmailMessages = async ({
  token,
  account,
  labelId,
  pageToken,
  maxResults,
  search,
}) =>
  apiClient(`/admin/email/messages${buildQueryString({ account, labelId, pageToken, maxResults, search })}`, {
    token,
  });

export const fetchEmailMessage = async ({ token, account, messageId }) =>
  apiClient(`/admin/email/messages/${encodeURIComponent(messageId)}${buildQueryString({ account })}`, {
    token,
  });

export const fetchEmailAttachment = async ({ token, account, messageId, attachmentId }) =>
  apiClient(
    `/admin/email/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}${buildQueryString({
      account,
    })}`,
    { token }
  );
