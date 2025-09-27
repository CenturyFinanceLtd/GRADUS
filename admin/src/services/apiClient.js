const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = async (endpoint, { method = 'GET', data, token, headers } = {}) => {
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  const contentType = response.headers.get('content-type');
  let responseBody = null;

  if (contentType && contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    const message =
      (responseBody && responseBody.message) ||
      (typeof responseBody === 'string' && responseBody) ||
      'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = responseBody;
    throw error;
  }

  return responseBody;
};

export default apiClient;