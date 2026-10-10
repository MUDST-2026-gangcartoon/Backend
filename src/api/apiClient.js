
const BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
).replace(/\/+$/, '');

const buildUrl = (endpoint) => {
  const path = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  return `${BASE_URL}${path}`;
};

const parseResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, endpoint, data) => {
  const headers = {
    Accept: 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(buildUrl(endpoint), options);
  const result = await parseResponse(response);

  if (!response.ok) {
    const message =
      result && typeof result === 'object'
        ? result.message || result.error || result.detail
        : typeof result === 'string'
          ? result
          : null;

    const error = new Error(
      message || `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = result;

    throw error;
  }

  return result;
};

const apiClient = {
  get: (endpoint) => request('GET', endpoint),

  post: (endpoint, data) => request('POST', endpoint, data),

  put: (endpoint, data) => request('PUT', endpoint, data),

  patch: (endpoint, data) => request('PATCH', endpoint, data),

  delete: (endpoint, data) => request('DELETE', endpoint, data),
};

export default apiClient;
