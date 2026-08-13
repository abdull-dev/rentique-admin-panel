import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// All API calls go through Next.js /api/proxy/* so there are no CORS issues
// regardless of where the admin panel is hosted.
const PROXY_BASE = "/api/proxy";

const api = axios.create({
  baseURL: PROXY_BASE,
  withCredentials: true,
});

// 401 -> refresh -> retry interceptor
let isRefreshing = false;
let failedQueue: {
  resolve: (v?: unknown) => void;
  reject: (e: unknown) => void;
}[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${PROXY_BASE}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { API_URL };
