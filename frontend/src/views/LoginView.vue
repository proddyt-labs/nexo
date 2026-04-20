<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950 px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Nexo</h1>
        <p class="text-slate-400 text-sm mt-1">Conhecimento colaborativo</p>
      </div>

      <!-- Card -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <!-- Tabs -->
        <div class="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-6">
          <button
            v-for="tab in ['login', 'register']"
            :key="tab"
            @click="mode = tab as 'login' | 'register'"
            class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="mode === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'"
          >
            {{ tab === 'login' ? 'Entrar' : 'Criar conta' }}
          </button>
        </div>

        <form @submit.prevent="submit" class="flex flex-col gap-3">
          <!-- Register-only fields -->
          <template v-if="mode === 'register'">
            <input v-model="form.name" class="input" placeholder="Nome completo" required />
            <input v-model="form.username" class="input" placeholder="Nome de usuário" required />
          </template>

          <input
            v-model="form.login"
            class="input"
            :placeholder="mode === 'login' ? 'Usuário ou e-mail' : 'E-mail'"
            required
          />
          <input v-model="form.password" type="password" class="input" placeholder="Senha" required />

          <p v-if="error" class="text-red-400 text-xs text-center">{{ error }}</p>

          <button type="submit" class="btn-primary w-full justify-center mt-1" :disabled="loading">
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {{ mode === 'login' ? 'Entrar' : 'Criar conta' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth   = useAuthStore();

const mode    = ref<"login" | "register">("login");
const loading = ref(false);
const error   = ref("");

const form = reactive({ login: "", password: "", name: "", username: "" });

async function submit() {
  error.value   = "";
  loading.value = true;
  try {
    if (mode.value === "login") {
      await auth.login(form.login, form.password);
    } else {
      await auth.register({
        name: form.name,
        username: form.username,
        email: form.login,
        password: form.password,
      });
    }
    router.push("/");
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? "Erro ao autenticar";
  } finally {
    loading.value = false;
  }
}
</script>
