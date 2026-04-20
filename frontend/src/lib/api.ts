import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const had = !!localStorage.getItem("nexo_token");
      localStorage.removeItem("nexo_token");
      if (had) window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
