import apiClient from "./apiClient";

export const fetchEmailTemplates = ({ token } = {}) =>
  apiClient("/admin/email-templates", {
    token,
  });

export const fetchEmailTemplate = ({ token, key } = {}) =>
  apiClient(`/admin/email-templates/${key}`, {
    token,
  });

export const saveEmailTemplate = ({ token, key, data } = {}) =>
  apiClient(`/admin/email-templates/${key}`, {
    method: "PUT",
    token,
    data,
  });

export const resetEmailTemplate = ({ token, key } = {}) =>
  apiClient(`/admin/email-templates/${key}`, {
    method: "DELETE",
    token,
  });

export default {
  fetchEmailTemplates,
  fetchEmailTemplate,
  saveEmailTemplate,
  resetEmailTemplate,
};
