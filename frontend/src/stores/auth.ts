import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/lib/api";

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string | null;
}

const GATE_URL = import.meta.env.VITE_GATE_URL ?? "http://localhost:3100";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID ?? "nexo";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI ?? "http://localhost:5173/auth/callback";

const TOKEN_KEY = "auth_token";

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
  const loading = ref(false);

  const isLoggedIn = computed(() => !!localStorage.getItem(TOKEN_KEY));
  const displayName = computed(() => user.value?.name ?? user.value?.username ?? "Usuário");

  function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function login() {
    window.location.href = buildAuthorizeUrl();
  }

  async function handleCallback(code: string) {
    loading.value = true;
    try {
      const { data } = await api.post<{ access_token: string }>("/auth/callback", {
        code,
        redirectUri: REDIRECT_URI,
      });
      setToken(data.access_token);
      await fetchMe();
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      user.value = data.user;
    } catch {
      clearToken();
      user.value = null;
    }
  }

  function logout() {
    clearToken();
    user.value = null;
    const postLogout = encodeURIComponent(window.location.origin + "/");
    window.location.href = `${GATE_URL}/auth/logout?post_logout_redirect_uri=${postLogout}`;
  }

  return { user, loading, isLoggedIn, displayName, login, logout, fetchMe, handleCallback };
});
