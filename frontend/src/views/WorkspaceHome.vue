<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-1">
        {{ store.active?.icon }} {{ store.active?.name }}
      </h1>
      <p v-if="store.active?.description" class="text-slate-400 mb-8">{{ store.active.description }}</p>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-10">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-2xl font-bold text-white">{{ store.active?._count.notes ?? 0 }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Notas</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-2xl font-bold text-white">{{ store.active?._count.collections ?? 0 }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Coleções</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p class="text-2xl font-bold text-white">{{ pinnedNotes.length }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Fixadas</p>
        </div>
      </div>

      <!-- Pinned notes -->
      <div v-if="pinnedNotes.length" class="mb-8">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notas fixadas</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <RouterLink
            v-for="note in pinnedNotes"
            :key="note.id"
            :to="`/w/${workspaceId}/notes/${note.id}`"
            class="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-xl p-3 transition-colors group"
          >
            <div class="flex items-start gap-2">
              <span class="text-lg">{{ note.emoji ?? "📌" }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                  {{ note.title || "Sem título" }}
                </p>
                <p class="text-xs text-slate-600 mt-0.5">{{ formatDate(note.updatedAt) }}</p>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Recent notes -->
      <div>
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recentes</h2>
        <div class="flex flex-col gap-1">
          <RouterLink
            v-for="note in recentNotes"
            :key="note.id"
            :to="`/w/${workspaceId}/notes/${note.id}`"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors group"
          >
            <span class="text-base">{{ note.emoji ?? "📄" }}</span>
            <span class="flex-1 text-sm text-slate-300 group-hover:text-white truncate">{{ note.title || "Sem título" }}</span>
            <span class="text-xs text-slate-600">{{ formatDate(note.updatedAt) }}</span>
          </RouterLink>
        </div>
        <p v-if="!recentNotes.length" class="text-slate-600 text-sm text-center py-8">
          Nenhuma nota ainda.
          <button @click="newNote" class="text-blue-500 hover:underline ml-1">Criar a primeira</button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWorkspaceStore } from "@/stores/workspace";

const route  = useRoute();
const router = useRouter();
const store  = useWorkspaceStore();
const workspaceId = route.params.workspaceId as string;

const pinnedNotes = computed(() => store.notes.filter((n) => n.isPinned));
const recentNotes = computed(() => [...store.notes].sort(
  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
).slice(0, 10));

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

async function newNote() {
  const note = await store.createNote({});
  router.push(`/w/${workspaceId}/notes/${note.id}`);
}
</script>
