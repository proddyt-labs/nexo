import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
}

const GATE_URL = import.meta.env.VITE_GATE_URL ?? "http://localhost:3100";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? "nexo";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI ?? "http://localhost:5173/auth/callback";

export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile",
  });
  return `${GATE_URL}/oauth/authorize?${params}`;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("nexo_token"));

  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const displayName = computed(() => user.value?.name ?? user.value?.username ?? "");

  async function fetchMe() {
    if (!token.value) return;
    try {
      const { data } = await api.get<User>("/auth/me");
      user.value = data;
    } catch {
      logout();
    }
  }

  // Inicia o fluxo OAuth — redireciona pro Gate
  function login() {
    window.location.href = buildAuthorizeUrl();
  }

  // Troca o code por access_token via backend (mantém client_secret seguro)
  async function handleCallback(code: string) {
    const { data } = await api.post<{ access_token: string }>("/auth/callback", {
      code,
      redirectUri: REDIRECT_URI,
    });
    token.value = data.access_token;
    localStorage.setItem("nexo_token", data.access_token);
    await fetchMe();
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem("nexo_token");
    const postLogout = encodeURIComponent(window.location.origin + "/");
    window.location.href = `${GATE_URL}/auth/logout?post_logout_redirect_uri=${postLogout}`;
  }

  return { user, token, isLoggedIn, displayName, fetchMe, login, handleCallback, logout };
});
