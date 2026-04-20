<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-xl font-semibold text-white mb-1">Membros do workspace</h1>
      <p class="text-sm text-slate-400 mb-6">Gerencie quem tem acesso a <strong class="text-white">{{ store.active?.icon }} {{ store.active?.name }}</strong></p>

      <!-- Role legend -->
      <div class="flex gap-3 flex-wrap mb-6">
        <span v-for="r in ROLES" :key="r.role" class="flex items-center gap-1.5 text-xs">
          <span class="w-2 h-2 rounded-full" :class="r.dot" />
          <span class="font-medium" :class="r.text">{{ r.role }}</span>
          <span class="text-slate-600">— {{ r.desc }}</span>
        </span>
      </div>

      <!-- Member list -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div
          v-for="(m, i) in members"
          :key="m.id"
          class="flex items-center gap-3 px-4 py-3"
          :class="{ 'border-t border-slate-800': i > 0 }"
        >
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-sm font-semibold text-blue-400 flex-shrink-0">
            {{ m.user.name.charAt(0).toUpperCase() }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-white">{{ m.user.name }}</span>
              <span class="text-xs text-slate-600">@{{ m.user.username }}</span>
              <span v-if="m.userId === auth.user?.id" class="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">você</span>
            </div>
            <p class="text-xs text-slate-500">{{ m.user.email }}</p>
          </div>

          <!-- Role selector (só OWNER pode mudar) -->
          <div v-if="myRole === 'OWNER' && m.userId !== auth.user?.id">
            <select
              :value="m.role"
              @change="updateRole(m.userId, ($event.target as HTMLSelectElement).value)"
              class="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2 py-1.5 text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option v-for="r in editableRoles" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div v-else>
            <span class="text-xs px-2 py-1 rounded-full font-medium" :class="roleStyle(m.role)">{{ m.role }}</span>
          </div>

          <!-- Remover (OWNER/ADMIN, não pode remover a si mesmo) -->
          <button
            v-if="(myRole === 'OWNER' || myRole === 'ADMIN') && m.userId !== auth.user?.id && m.role !== 'OWNER'"
            @click="removeMember(m.userId, m.user.name)"
            class="text-slate-600 hover:text-red-400 transition-colors ml-1"
            title="Remover membro"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div v-else class="w-5" />
        </div>

        <div v-if="!members.length" class="px-4 py-8 text-center text-slate-600 text-sm">
          Nenhum membro ainda
        </div>
      </div>

      <!-- Convidar usuário (OWNER/ADMIN) -->
      <div v-if="myRole === 'OWNER' || myRole === 'ADMIN'" class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 class="text-sm font-semibold text-white mb-3">Convidar usuário</h2>
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input
              v-model="inviteSearch"
              @input="searchUsers"
              class="input text-sm"
              placeholder="Buscar por nome, @usuário ou e-mail…"
            />
            <div
              v-if="userResults.length && inviteSearch"
              class="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10"
            >
              <button
                v-for="u in userResults"
                :key="u.id"
                @click="selectUser(u)"
                class="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-slate-700 transition-colors text-left"
              >
                <div class="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-semibold text-blue-400">
                  {{ u.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm text-white">{{ u.name }}</p>
                  <p class="text-xs text-slate-500">@{{ u.username }} · {{ u.email }}</p>
                </div>
              </button>
            </div>
          </div>

          <select v-model="inviteRole" class="bg-slate-800 border border-slate-700 rounded-lg text-sm px-3 text-white outline-none focus:border-blue-500">
            <option v-for="r in editableRoles" :key="r" :value="r">{{ r }}</option>
          </select>

          <button
            @click="inviteMember"
            :disabled="!selectedUser || inviting"
            class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span v-if="inviting" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Adicionar
          </button>
        </div>

        <!-- Usuário selecionado -->
        <div v-if="selectedUser" class="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Selecionado: <span class="text-white font-medium">{{ selectedUser.name }}</span> (@{{ selectedUser.username }})
          <button @click="selectedUser = null; inviteSearch = ''" class="text-slate-600 hover:text-white">×</button>
        </div>

        <p v-if="inviteError" class="text-red-400 text-xs mt-2">{{ inviteError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore, type WorkspaceMember, type WorkspaceRole } from "@/stores/workspace";
import { api } from "@/lib/api";

const route = useRoute();
const auth  = useAuthStore();
const store = useWorkspaceStore();
const wsId  = route.params.workspaceId as string;

const members      = ref<WorkspaceMember[]>([]);
const inviteSearch = ref("");
const inviteRole   = ref<WorkspaceRole>("MEMBER");
const inviting     = ref(false);
const inviteError  = ref("");
const userResults  = ref<{ id: string; username: string; name: string; email: string }[]>([]);
const selectedUser = ref<{ id: string; username: string; name: string; email: string } | null>(null);

const myRole = computed<WorkspaceRole | null>(() => {
  const me = members.value.find(m => m.userId === auth.user?.id);
  return (me?.role ?? null) as WorkspaceRole | null;
});

const editableRoles: WorkspaceRole[] = ["ADMIN", "MEMBER", "VIEWER"];

const ROLES = [
  { role: "OWNER",  desc: "controle total, pode excluir workspace", dot: "bg-yellow-400", text: "text-yellow-400" },
  { role: "ADMIN",  desc: "gerencia membros e conteúdo",            dot: "bg-blue-400",   text: "text-blue-400"  },
  { role: "MEMBER", desc: "lê e edita notas",                       dot: "bg-green-400",  text: "text-green-400" },
  { role: "VIEWER", desc: "somente leitura",                        dot: "bg-slate-400",  text: "text-slate-400" },
];

function roleStyle(role: WorkspaceRole) {
  const map: Record<WorkspaceRole, string> = {
    OWNER:  "bg-yellow-400/10 text-yellow-400",
    ADMIN:  "bg-blue-400/10 text-blue-400",
    MEMBER: "bg-green-400/10 text-green-400",
    VIEWER: "bg-slate-600/40 text-slate-400",
  };
  return map[role] ?? "";
}

async function load() {
  const { data } = await api.get<WorkspaceMember[]>(`/admin/workspaces/${wsId}/members`);
  members.value = data;
}

let searchTimer: ReturnType<typeof setTimeout>;
function searchUsers() {
  selectedUser.value = null;
  clearTimeout(searchTimer);
  searchTimer = globalThis.setTimeout(async () => {
    if (!inviteSearch.value.trim()) { userResults.value = []; return; }
    const { data } = await api.get(`/admin/users?search=${encodeURIComponent(inviteSearch.value)}`);
    // Filter out already members
    userResults.value = data.filter((u: any) => !members.value.find(m => m.userId === u.id));
  }, 300);
}

function selectUser(u: typeof userResults.value[0]) {
  selectedUser.value = u;
  inviteSearch.value = u.name;
  userResults.value  = [];
}

async function inviteMember() {
  if (!selectedUser.value) return;
  inviteError.value = "";
  inviting.value    = true;
  try {
    const { data } = await api.post(`/admin/workspaces/${wsId}/members`, {
      userId: selectedUser.value.id,
      role:   inviteRole.value,
    });
    members.value.push(data);
    selectedUser.value = null;
    inviteSearch.value = "";
  } catch (e: any) {
    inviteError.value = e?.response?.data?.message ?? "Erro ao adicionar";
  } finally {
    inviting.value = false;
  }
}

async function updateRole(userId: string, role: string) {
  await api.patch(`/admin/workspaces/${wsId}/members/${userId}`, { role });
  const m = members.value.find(m => m.userId === userId);
  if (m) m.role = role as WorkspaceRole;
}

async function removeMember(userId: string, name: string) {
  if (!confirm(`Remover ${name} do workspace?`)) return;
  await api.delete(`/admin/workspaces/${wsId}/members/${userId}`);
  members.value = members.value.filter(m => m.userId !== userId);
}

onMounted(load);
</script>
