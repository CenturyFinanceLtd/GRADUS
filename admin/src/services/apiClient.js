/*
  Admin fetch wrapper
  - Uses API_BASE_URL from config/env and supports JSON or FormData bodies
  - Includes credentials/cookies for session-based flows
*/
import { API_BASE_URL } from '../config/env';

const apiClient = async (endpoint, { method = 'GET', data, token, headers } = {}) => {
  const hasFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const requestHeaders = new Headers(headers || {});

  if (!hasFormData) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', 'Bearer ' + token);
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (data !== undefined) {
    fetchOptions.body = hasFormData ? data : JSON.stringify(data);
  }

  const response = await fetch(API_BASE_URL + endpoint, fetchOptions);

  const contentType = response.headers.get('content-type');
  let responseBody = null;

  if (contentType && contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    let message = 'Request failed';
    if (responseBody && typeof responseBody === 'object' && responseBody.message) {
      message = responseBody.message;
    } else if (typeof responseBody === 'string') {
      const trimmed = responseBody.trim();
      const looksLikeHtml = /^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed);
      if (looksLikeHtml) {
        message = `${response.status} ${response.statusText || ''}`.trim() || 'Request failed';
      } else {
        message = trimmed || message;
      }
    } else if (response.status) {
      message = `${response.status} ${response.statusText || ''}`.trim() || message;
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = responseBody;
    throw error;
  }

  return responseBody;
};

export default apiClient;
