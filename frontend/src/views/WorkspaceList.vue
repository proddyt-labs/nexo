<template>
  <div class="min-h-screen bg-slate-950 flex flex-col">
    <!-- Header -->
    <header class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span class="font-semibold text-white">Nexo</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-400">{{ auth.displayName }}</span>
        <button @click="auth.logout(); router.push('/login')" class="btn-ghost text-xs">Sair</button>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold text-white">Seus vaults</h1>
        <div class="flex items-center gap-2">
          <RouterLink to="/admin" class="btn-ghost text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </RouterLink>
          <button @click="showCreate = true" class="btn-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo vault
          </button>
        </div>
      </div>

      <!-- Workspaces grid -->
      <div v-if="store.workspaces.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="ws in store.workspaces"
          :key="ws.id"
          @click="open(ws.id)"
          class="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 text-left transition-colors group"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl">{{ ws.icon ?? "📁" }}</span>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-white group-hover:text-blue-400 transition-colors truncate">{{ ws.name }}</p>
              <p v-if="ws.description" class="text-xs text-slate-500 mt-0.5 truncate">{{ ws.description }}</p>
              <p class="text-xs text-slate-600 mt-2">
                {{ ws._count.notes }} notas · {{ ws._count.collections }} coleções
              </p>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="text-center py-16 text-slate-500">
        <p class="text-lg mb-1">Nenhum workspace ainda</p>
        <p class="text-sm">Crie seu primeiro workspace para começar</p>
      </div>
    </main>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showCreate = false">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
          <h2 class="font-semibold text-white mb-4">Novo workspace</h2>
          <form @submit.prevent="createWs" class="flex flex-col gap-3">
            <div class="flex gap-2">
              <input v-model="wsForm.icon" class="input w-16 text-center text-lg" placeholder="📁" maxlength="2" />
              <input v-model="wsForm.name" class="input flex-1" placeholder="Nome do workspace" required />
            </div>
            <input v-model="wsForm.description" class="input" placeholder="Descrição (opcional)" />
            <p v-if="createError" class="text-red-400 text-xs">{{ createError }}</p>
            <div class="flex gap-2 justify-end mt-1">
              <button type="button" @click="showCreate = false" class="btn-ghost">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="creating">
                <span v-if="creating" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";

const router = useRouter();
const auth   = useAuthStore();
const store  = useWorkspaceStore();

const showCreate  = ref(false);
const creating    = ref(false);
const createError = ref("");
const wsForm      = reactive({ name: "", description: "", icon: "" });

onMounted(() => store.fetchWorkspaces());

async function open(id: string) {
  await store.setActive(id);
  router.push(`/w/${id}`);
}

async function createWs() {
  createError.value = "";
  creating.value    = true;
  try {
    const ws = await store.createWorkspace({
      name: wsForm.name,
      description: wsForm.description || undefined,
      icon: wsForm.icon || undefined,
    });
    showCreate.value = false;
    wsForm.name = wsForm.description = wsForm.icon = "";
    await open(ws.id);
  } catch (e: any) {
    createError.value = e?.response?.data?.error ?? "Erro ao criar workspace";
  } finally {
    creating.value = false;
  }
}
</script>
