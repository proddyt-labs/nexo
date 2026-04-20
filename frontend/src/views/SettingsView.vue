<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 class="text-xl font-semibold text-white">Configurações do vault</h1>
        <p class="text-sm text-slate-400">{{ store.active?.icon }} {{ store.active?.name }}</p>
      </div>

      <!-- Import/Export -->
      <ImportExport
        :ws-id="workspaceId"
        :can-import="canWrite"
        @imported="store.setActive(workspaceId)"
      />

      <!-- Role Kanban -->
      <div v-if="members.length" class="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <RoleKanban
          :ws-id="workspaceId"
          :members="members"
          :my-user-id="auth.user?.id ?? ''"
          @role-changed="applyRoleChange"
        />
      </div>

      <!-- Danger zone (só OWNER) -->
      <div v-if="myRole === 'OWNER'" class="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <p class="text-sm font-semibold text-red-400 mb-1">Zona de perigo</p>
        <p class="text-xs text-slate-500 mb-3">Ações irreversíveis neste vault</p>
        <button @click="deleteWorkspace" class="btn-danger text-sm">
          Excluir vault permanentemente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore, type WorkspaceMember, type WorkspaceRole } from "@/stores/workspace";
import ImportExport from "@/components/ImportExport.vue";
import RoleKanban from "@/components/RoleKanban.vue";
import { api } from "@/lib/api";

const route  = useRoute();
const router = useRouter();
const auth   = useAuthStore();
const store  = useWorkspaceStore();
const workspaceId = route.params.workspaceId as string;

const members = ref<WorkspaceMember[]>([]);

const myRole = computed<WorkspaceRole | null>(() =>
  (members.value.find(m => m.userId === auth.user?.id)?.role ?? null) as WorkspaceRole | null
);
const canWrite = computed(() => !!myRole.value && myRole.value !== "VIEWER");

async function load() {
  const { data } = await api.get<WorkspaceMember[]>(`/admin/workspaces/${workspaceId}/members`);
  members.value = data;
}

function applyRoleChange(userId: string, role: WorkspaceRole) {
  const m = members.value.find(m => m.userId === userId);
  if (m) m.role = role;
}

async function deleteWorkspace() {
  if (!confirm(`Tem certeza que deseja excluir o vault "${store.active?.name}"? Isso apaga todas as notas permanentemente.`)) return;
  await api.delete(`/workspaces/${workspaceId}`);
  store.workspaces = store.workspaces.filter(w => w.id !== workspaceId);
  router.push("/");
}

onMounted(load);
</script>
