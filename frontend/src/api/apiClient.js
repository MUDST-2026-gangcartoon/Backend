
const BASE_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/+$/, '');

const API_ORIGIN = new URL(
  BASE_URL,
  window.location.origin
).origin;

let csrfToken = null;
let csrfHeaderName = 'X-CSRF-TOKEN';
let csrfPromise = null;

// แปลง URL รูปจาก Backend ให้เป็น URL ที่ browser เปิดได้
export const resolveImageUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) {
    return '';
  }

  const value = url.trim();

  // URL เต็มและ URL สำหรับ preview ในเครื่อง ใช้ตามเดิม
  if (/^(https?:\/\/|blob:|data:)/i.test(value)) {
    return value;
  }

  // รูปที่เก็บอยู่ใน Backend เช่น /uploads/abc123.png
  if (value.startsWith('/uploads/')) {
    return `${API_ORIGIN}${value}`;
  }

  return value;
};

const buildUrl = (endpoint) => {
  const path = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  return `${BASE_URL}${path}`;
};

const parseResponse = async (response) => {
  if (response.status === 204) return null;

  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const createHttpError = (response, data) => {
  const message =
    data && typeof data === 'object'
      ? data.message || data.error || data.detail
      : typeof data === 'string'
        ? data
        : null;

  const error = new Error(
    message || `Request failed with status ${response.status}`
  );

  error.status = response.status;
  error.data = data;

  return error;
};

const getCsrfToken = async () => {
  if (csrfToken) {
    return {
      token: csrfToken,
      headerName: csrfHeaderName,
    };
  }

  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    const response = await fetch(buildUrl('/auth/csrf'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw createHttpError(response, data);
    }

    if (!data?.token) {
      throw new Error(
        'ไม่สามารถดึง CSRF token จาก Backend ได้'
      );
    }

    csrfToken = data.token;
    csrfHeaderName = data.headerName || 'X-CSRF-TOKEN';

    return {
      token: csrfToken,
      headerName: csrfHeaderName,
    };
  })();

  try {
    return await csrfPromise;
  } finally {
    csrfPromise = null;
  }
};

const request = async (method, endpoint, data) => {
  const normalizedMethod = method.toUpperCase();

  const path = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  const requiresCsrf = [
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ].includes(normalizedMethod);

  const refreshCsrfAfterRequest =
    /^\/auth\/(login|signup|logout)$/.test(
      path.split('?')[0]
    );

  const headers = {
    Accept: 'application/json',
  };

  const options = {
    method: normalizedMethod,
    headers,
    credentials: 'include',
  };

  if (data !== undefined && data !== null) {
    const isFormData =
      typeof FormData !== 'undefined' &&
      data instanceof FormData;

    if (isFormData) {
      // อย่ากำหนด Content-Type เอง
      // fetch จะกำหนด multipart boundary ให้อัตโนมัติ
      options.body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  if (requiresCsrf) {
    const csrf = await getCsrfToken();
    headers[csrf.headerName] = csrf.token;
  }

  try {
    const response = await fetch(buildUrl(path), options);
    const result = await parseResponse(response);

    if (!response.ok) {
      throw createHttpError(response, result);
    }

    return result;
  } finally {
    // ล้าง CSRF token หลัง Login, Signup และ Logout
    if (refreshCsrfAfterRequest) {
      csrfToken = null;
      csrfPromise = null;
    }
  }
};

const apiClient = {
  get: (endpoint) => request('GET', endpoint),

  post: (endpoint, data) =>
    request('POST', endpoint, data),

  // สำหรับอัปโหลดไฟล์ด้วย FormData
  postForm: (endpoint, formData) => {
    if (
      typeof FormData === 'undefined' ||
      !(formData instanceof FormData)
    ) {
      throw new TypeError(
        'postForm ต้องรับค่าเป็น FormData'
      );
    }

    return request('POST', endpoint, formData);
  },

  put: (endpoint, data) =>
    request('PUT', endpoint, data),

  patch: (endpoint, data) =>
    request('PATCH', endpoint, data),

  delete: (endpoint, data) =>
    request('DELETE', endpoint, data),
};

export default apiClient;
