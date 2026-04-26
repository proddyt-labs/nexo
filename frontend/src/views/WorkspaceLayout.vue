<template>
  <div class="flex h-screen bg-slate-950 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-60 flex-shrink-0 bg-slate-900/60 border-r border-slate-800 flex flex-col">
      <!-- Brand -->
      <div class="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <span class="font-mono text-base font-medium" style="color: var(--nx-primary)">{·}</span>
        <span class="font-mono text-xs" style="color: var(--nx-muted)">nexo</span>
      </div>

      <!-- Workspace header -->
      <div class="px-3 py-2.5 border-b border-slate-800">
        <button @click="router.push('/')" class="flex items-center gap-2 w-full hover:bg-slate-800/60 rounded-lg px-2 py-1.5 transition-colors group">
          <span class="text-lg">{{ store.active?.icon ?? "📁" }}</span>
          <span class="text-sm font-medium text-white truncate flex-1 text-left">{{ store.active?.name }}</span>
          <svg class="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="px-2 py-3 flex flex-col gap-0.5">
        <RouterLink :to="`/w/${workspaceId}`" class="sidebar-item" exact-active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Início
        </RouterLink>
        <RouterLink :to="`/w/${workspaceId}/daily`" class="sidebar-item" active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Nota diária
        </RouterLink>
        <RouterLink :to="`/w/${workspaceId}/graph`" class="sidebar-item" active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Grafo
        </RouterLink>
        <RouterLink :to="`/w/${workspaceId}/kanban`" class="sidebar-item" active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </RouterLink>
        <RouterLink :to="`/w/${workspaceId}/members`" class="sidebar-item" active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Membros
        </RouterLink>
        <RouterLink :to="`/w/${workspaceId}/settings`" class="sidebar-item" active-class="active">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configurações
        </RouterLink>
      </nav>

      <div class="h-px bg-slate-800 mx-3" />

      <!-- Collections & Notes tree -->
      <div class="flex-1 overflow-y-auto px-2 py-2">
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs font-medium text-slate-500 uppercase tracking-wider">Coleções</span>
          <button @click="showNewCollection = true" class="text-slate-600 hover:text-slate-300 transition-colors" title="Nova coleção">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <!-- Root collections -->
        <CollectionTree
          v-for="col in rootCollections"
          :key="col.id"
          :collection="col"
          :all-collections="store.collections"
          :active-note-id="route.params.noteId as string"
          :notes="store.notes"
          @open-note="openNote"
          @new-note="newNoteInCollection"
        />

        <!-- Uncollected notes -->
        <div v-if="uncollectedNotes.length" class="mt-2">
          <div class="px-2 py-1 mb-1">
            <span class="text-xs text-slate-600">Sem coleção</span>
          </div>
          <button
            v-for="note in uncollectedNotes"
            :key="note.id"
            @click="openNote(note.id)"
            class="sidebar-item w-full"
            :class="{ active: route.params.noteId === note.id }"
          >
            <span class="text-base leading-none">{{ note.emoji ?? "📄" }}</span>
            <span class="truncate">{{ note.title || "Sem título" }}</span>
          </button>
        </div>
      </div>

      <!-- New note button -->
      <div class="p-3 border-t border-slate-800">
        <button @click="newNote" class="btn-primary w-full justify-center text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nova nota
        </button>
      </div>

      <!-- User footer -->
      <div class="px-3 pb-3 flex items-center gap-2">
        <a href="https://proddyt.site" class="flex items-center gap-1 font-mono text-xs border border-blue-900/40 text-blue-400 hover:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"><span>&lt;·&gt;</span><span>Home</span></a>
        <span class="text-xs text-slate-400 truncate flex-1">{{ auth.displayName }}</span>
        <button @click="auth.logout()" class="text-slate-600 hover:text-slate-300 transition-colors" title="Sair">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-hidden flex flex-col">
      <div v-if="store.loading" class="flex-1 flex items-center justify-center">
        <div class="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
      <RouterView v-else />
    </main>

    <!-- New collection modal -->
    <Teleport to="body">
      <div v-if="showNewCollection" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showNewCollection = false">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
          <h2 class="font-semibold text-white mb-4">Nova coleção</h2>
          <form @submit.prevent="createCollection" class="flex flex-col gap-3">
            <input v-model="collectionName" class="input" placeholder="Nome da coleção" required autofocus />
            <div class="flex gap-2 justify-end">
              <button type="button" @click="showNewCollection = false" class="btn-ghost">Cancelar</button>
              <button type="submit" class="btn-primary">Criar</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import CollectionTree from "@/components/CollectionTree.vue";

const route  = useRoute();
const router = useRouter();
const auth   = useAuthStore();
const store  = useWorkspaceStore();

const workspaceId      = route.params.workspaceId as string;
const showNewCollection = ref(false);
const collectionName    = ref("");

onMounted(async () => {
  if (!store.active || store.active.id !== workspaceId) {
    await store.setActive(workspaceId);
  }
});

// Re-fetch if workspace changes
watch(() => route.params.workspaceId, (id) => {
  if (id) store.setActive(id as string);
});

const rootCollections = computed(() =>
  store.collections.filter((c) => !c.parentId).sort((a, b) => a.position - b.position)
);

const uncollectedNotes = computed(() =>
  store.notes.filter((n) => !n.collectionId)
);

async function newNote() {
  const note = await store.createNote({});
  router.push(`/w/${workspaceId}/notes/${note.id}`);
}

async function newNoteInCollection(collectionId: string) {
  const note = await store.createNote({ collectionId });
  router.push(`/w/${workspaceId}/notes/${note.id}`);
}

function openNote(noteId: string) {
  router.push(`/w/${workspaceId}/notes/${noteId}`);
}

async function createCollection() {
  await store.createCollection(collectionName.value);
  collectionName.value   = "";
  showNewCollection.value = false;
}
</script>
