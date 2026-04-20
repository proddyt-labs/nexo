<template>
  <div class="min-h-screen bg-slate-950">
    <!-- Header -->
    <header class="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
      <button @click="router.back()" class="text-slate-500 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="font-semibold text-white">Painel de administração</h1>
        <p class="text-xs text-slate-500">Gestão global de vaults e usuários</p>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">

      <!-- Vaults -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Vaults</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="ws in workspaces"
            :key="ws.id"
            class="bg-slate-900 border rounded-xl overflow-hidden transition-colors"
            :class="expandedWs === ws.id ? 'border-blue-500/40' : 'border-slate-800 hover:border-slate-700'"
          >
            <!-- Vault header -->
            <button
              @click="expandedWs = expandedWs === ws.id ? null : ws.id"
              class="flex items-center gap-3 w-full px-4 py-3 text-left"
            >
              <span class="text-2xl">{{ ws.icon ?? "📁" }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-white">{{ ws.name }}</p>
                <p class="text-xs text-slate-500 truncate">{{ ws.description }}</p>
              </div>
              <div class="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                <span>{{ ws._count.notes }} notas</span>
                <span>{{ ws.members.length }} membros</span>
                <svg
                  class="w-3.5 h-3.5 transition-transform"
                  :class="{ 'rotate-180': expandedWs === ws.id }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <!-- Members expanded -->
            <div v-if="expandedWs === ws.id" class="border-t border-slate-800">
              <!-- Member rows -->
              <div
                v-for="(m, i) in ws.members"
                :key="m.id"
                class="flex items-center gap-3 px-4 py-2.5"
                :class="{ 'border-t border-slate-800/50': i > 0 }"
              >
                <div class="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-semibold text-blue-400 flex-shrink-0">
                  {{ m.user.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-sm text-white">{{ m.user.name }}</span>
                  <span class="text-xs text-slate-600 ml-1.5">@{{ m.user.username }}</span>
                </div>

                <!-- Role badge / selector -->
                <select
                  v-if="isOwnerOf(ws)"
                  :value="m.role"
                  @change="changeRole(ws.id, m.userId, ($event.target as HTMLSelectElement).value, ws)"
                  :disabled="m.role === 'OWNER'"
                  class="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2 py-1 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="OWNER"  :disabled="true">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
                <span v-else class="text-xs px-2 py-0.5 rounded-full" :class="roleStyle(m.role)">{{ m.role }}</span>

                <button
                  v-if="isOwnerOf(ws) && m.role !== 'OWNER'"
                  @click="kickMember(ws, m)"
                  class="text-slate-600 hover:text-red-400 transition-colors"
                  title="Remover do vault"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Add member inline -->
              <div v-if="isOwnerOf(ws) || isAdminOf(ws)" class="px-4 py-3 border-t border-slate-800 bg-slate-800/30">
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <input
                      v-model="addForm[ws.id].search"
                      @input="searchUsersFor(ws.id)"
                      class="input text-xs py-1.5"
                      placeholder="Adicionar usuário…"
                    />
                    <div
                      v-if="addForm[ws.id].results.length && addForm[ws.id].search"
                      class="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-20"
                    >
                      <button
                        v-for="u in addForm[ws.id].results"
                        :key="u.id"
                        @click="selectForAdd(ws.id, u)"
                        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-700 text-xs text-left"
                      >
                        <span class="w-5 h-5 rounded-full bg-blue-600/30 flex items-center justify-center font-semibold text-blue-400">{{ u.name.charAt(0) }}</span>
                        <span class="text-white">{{ u.name }}</span>
                        <span class="text-slate-500">@{{ u.username }}</span>
                      </button>
                    </div>
                  </div>
                  <select
                    v-model="addForm[ws.id].role"
                    class="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER" selected>MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                  <button
                    @click="addMemberTo(ws)"
                    :disabled="!addForm[ws.id].selected"
                    class="btn-primary text-xs py-1 disabled:opacity-40"
                  >+ Add</button>
                </div>
                <p v-if="addForm[ws.id].selected" class="text-xs text-blue-400 mt-1">
                  ✓ {{ addForm[ws.id].selected?.name }} selecionado
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- All users -->
      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Todos os usuários</h2>
        <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-800">
            <input v-model="userSearch" @input="loadUsers" class="input text-sm" placeholder="Buscar usuário…" />
          </div>
          <div v-for="(u, i) in allUsers" :key="u.id" class="flex items-center gap-3 px-4 py-3" :class="{ 'border-t border-slate-800': i > 0 }">
            <div class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center font-semibold text-blue-400">
              {{ u.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm text-white font-medium">{{ u.name }}</span>
                <span class="text-xs text-slate-500">@{{ u.username }}</span>
              </div>
              <p class="text-xs text-slate-600">{{ u.email }}</p>
            </div>
            <!-- Vaults que este user está -->
            <div class="flex gap-1 flex-wrap justify-end">
              <span
                v-for="ws in workspacesForUser(u.id)"
                :key="ws.id"
                class="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                :title="ws.name"
              >{{ ws.icon }}</span>
            </div>
          </div>
          <p v-if="!allUsers.length" class="px-4 py-6 text-center text-slate-600 text-sm">Nenhum usuário encontrado</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import type { WorkspaceRole } from "@/stores/workspace";

const router = useRouter();
const auth   = useAuthStore();

interface AdminWorkspace {
  id: string; name: string; icon?: string; description?: string;
  _count: { notes: number; collections: number };
  members: {
    id: string; userId: string; role: WorkspaceRole;
    user: { id: string; username: string; name: string; email: string; avatar?: string };
  }[];
}
interface User { id: string; username: string; name: string; email: string }

const workspaces  = ref<AdminWorkspace[]>([]);
const allUsers    = ref<User[]>([]);
const expandedWs  = ref<string | null>(null);
const userSearch  = ref("");

// Per-workspace add-member forms
const addForm = reactive<Record<string, {
  search: string;
  results: User[];
  selected: User | null;
  role: WorkspaceRole;
}>>({});

async function load() {
  const [wsRes, usersRes] = await Promise.all([
    api.get<AdminWorkspace[]>("/admin/workspaces"),
    api.get<User[]>("/admin/users"),
  ]);
  workspaces.value = wsRes.data;
  allUsers.value   = usersRes.data;
  wsRes.data.forEach(ws => {
    addForm[ws.id] = { search: "", results: [], selected: null, role: "MEMBER" };
  });
}

async function loadUsers() {
  const { data } = await api.get<User[]>(`/admin/users?search=${encodeURIComponent(userSearch.value)}`);
  allUsers.value = data;
}

function isOwnerOf(ws: AdminWorkspace) {
  return ws.members.find(m => m.userId === auth.user?.id)?.role === "OWNER";
}
function isAdminOf(ws: AdminWorkspace) {
  const role = ws.members.find(m => m.userId === auth.user?.id)?.role;
  return role === "OWNER" || role === "ADMIN";
}

function roleStyle(role: WorkspaceRole) {
  const map: Record<WorkspaceRole, string> = {
    OWNER:  "bg-yellow-400/10 text-yellow-400",
    ADMIN:  "bg-blue-400/10 text-blue-400",
    MEMBER: "bg-green-400/10 text-green-400",
    VIEWER: "bg-slate-600/40 text-slate-400",
  };
  return map[role] ?? "";
}

function workspacesForUser(userId: string) {
  return workspaces.value.filter(ws => ws.members.find(m => m.userId === userId));
}

async function changeRole(wsId: string, userId: string, role: string, ws: AdminWorkspace) {
  await api.patch(`/admin/workspaces/${wsId}/members/${userId}`, { role });
  const m = ws.members.find(m => m.userId === userId);
  if (m) m.role = role as WorkspaceRole;
}

async function kickMember(ws: AdminWorkspace, member: AdminWorkspace["members"][0]) {
  if (!confirm(`Remover ${member.user.name} de ${ws.name}?`)) return;
  await api.delete(`/admin/workspaces/${ws.id}/members/${member.userId}`);
  ws.members = ws.members.filter(m => m.userId !== member.userId);
}

let searchTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function searchUsersFor(wsId: string) {
  addForm[wsId].selected = null;
  clearTimeout(searchTimers[wsId]);
  searchTimers[wsId] = globalThis.setTimeout(async () => {
    const q = addForm[wsId].search;
    if (!q.trim()) { addForm[wsId].results = []; return; }
    const { data } = await api.get<User[]>(`/admin/users?search=${encodeURIComponent(q)}`);
    const ws = workspaces.value.find(w => w.id === wsId);
    addForm[wsId].results = data.filter(u => !ws?.members.find(m => m.userId === u.id));
  }, 300);
}

function selectForAdd(wsId: string, u: User) {
  addForm[wsId].selected = u;
  addForm[wsId].search   = u.name;
  addForm[wsId].results  = [];
}

async function addMemberTo(ws: AdminWorkspace) {
  const form = addForm[ws.id];
  if (!form.selected) return;
  const { data } = await api.post(`/admin/workspaces/${ws.id}/members`, {
    userId: form.selected.id,
    role:   form.role,
  });
  ws.members.push(data);
  form.selected = null;
  form.search   = "";
}

onMounted(load);
</script>
