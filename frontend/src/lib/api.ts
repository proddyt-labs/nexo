import axios from "axios";
import { buildAuthorizeUrl } from "@/stores/auth";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Não redireciona pro Gate se estamos no /auth/callback (impede loop durante a troca de code)
    const isCallback = window.location.pathname === "/auth/callback";
    if (err.response?.status === 401 && !isCallback) {
      localStorage.removeItem("auth_token");
      window.location.href = buildAuthorizeUrl();
    }
    return Promise.reject(err);
  }
);
