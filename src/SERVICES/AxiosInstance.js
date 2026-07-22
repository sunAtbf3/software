import axios from "axios";

// const DEFAULT_API_BASE_URL = "https://api.bizcentro.cloud/api/v1";
// const DEFAULT_API_BASE_URL = "http://localhost:3443/api/v1";
             

// ✅ Access token stored in memory (set by Redux)
let globalAccessToken = null;

// ✅ Export functions for Redux slice to call
export const setGlobalAccessToken = (token) => {
  globalAccessToken = token;
};

export const clearGlobalAccessToken = () => {
  globalAccessToken = null;
};

const AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  withCredentials: true, // ✅ Refresh token cookie automatically sent
  headers: {
    "Content-Type": "application/json", 
  },
});
console.log(import.meta.env.VITE_API_BASE_URL, "import.meta.env.VITE_API_BASE_URL");

// ✅ Read token from memory, not from cookie
AxiosInstance.interceptors.request.use((config) => {
  if (globalAccessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${globalAccessToken}`;
  }
  return config;
});

// ✅ Handle 401 - token expired
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401 — but NOT for public/unauthenticated auth endpoints
    const isExcludedRoute = ["/auth/login", "/auth/register", "/auth/refresh"].some(route =>
      originalRequest.url?.includes(route)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isExcludedRoute) {

      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return AxiosInstance(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token cookie is sent automatically (withCredentials: true)
        const { data } = await AxiosInstance.post("/auth/refresh");
        const newToken = data?.data?.accessToken || data?.accessToken;

        if (!newToken) throw new Error("No token in refresh response");

        setGlobalAccessToken(newToken);
        processQueue(null, newToken);

        // Dispatch to Redux so slice stays in sync
        window.dispatchEvent(new CustomEvent("auth:tokenRefreshed", { detail: { accessToken: newToken } }));

        // Retry the original failed request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return AxiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearGlobalAccessToken();
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance;
// down code use AxiosInstance for API calls and manage access token via cookies but upper code store in redux
// import axios from "axios";

// const ACCESS_TOKEN_COOKIE_KEY = "vy_access_token";
// const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";

// const isSecureContext = () => window.location.protocol === "https:";

// export const setAccessTokenCookie = (token) => {
//   if (!token) return;
//   const secureFlag = isSecureContext() ? "; Secure" : "";
//   document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secureFlag}`;
// };

// export const getAccessTokenCookie = () => {
//   const cookieParts = document.cookie ? document.cookie.split("; ") : [];
//   const cookie = cookieParts.find((part) => part.startsWith(`${ACCESS_TOKEN_COOKIE_KEY}=`));
//   if (!cookie) return null;
//   const [, value] = cookie.split("=");
//   return value ? decodeURIComponent(value) : null;
// };

// export const clearAccessTokenCookie = () => {
//   document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
// };

// const AxiosInstance = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
//   withCredentials: true,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// AxiosInstance.interceptors.request.use((config) => {
//   const token = getAccessTokenCookie();
//   if (token) {
//     config.headers = config.headers || {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default AxiosInstance;