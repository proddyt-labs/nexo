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

export const useAuthStore = defineStore("auth", () => {
  const user  = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("nexo_token"));

  const isLoggedIn  = computed(() => !!token.value && !!user.value);
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

  async function login(login: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>("/auth/login", { login, password });
    token.value = data.token;
    user.value  = data.user;
    localStorage.setItem("nexo_token", data.token);
  }

  async function register(payload: { username: string; email: string; password: string; name: string }) {
    const { data } = await api.post<{ token: string; user: User }>("/auth/register", payload);
    token.value = data.token;
    user.value  = data.user;
    localStorage.setItem("nexo_token", data.token);
  }

  function logout() {
    user.value  = null;
    token.value = null;
    localStorage.removeItem("nexo_token");
  }

  return { user, token, isLoggedIn, displayName, fetchMe, login, register, logout };
});
