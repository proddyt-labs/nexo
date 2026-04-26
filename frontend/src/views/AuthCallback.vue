<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950 text-gray-200 px-4">
    <div class="text-center space-y-3 max-w-md">
      <div v-if="!error" class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-sm" :class="error ? 'text-red-400' : 'text-gray-400'">
        {{ error || "Autenticando..." }}
      </p>
      <button v-if="error" @click="retry" class="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm">
        Tentar novamente
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const error = ref("");

function retry() {
  error.value = "";
  auth.login();
}

onMounted(async () => {
  const code = route.query.code as string | undefined;
  if (!code) {
    if (auth.isLoggedIn) router.replace("/");
    else auth.login();
    return;
  }
  try {
    await auth.handleCallback(code);
    router.replace("/");
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? "Erro ao autenticar. Tente novamente.";
    // Não redireciona automaticamente — evita loop infinito
  }
});
</script>
