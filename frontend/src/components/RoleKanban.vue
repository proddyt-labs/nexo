<template>
  <div>
    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gestão de Membros — Arraste para mudar role</p>

    <div class="flex gap-3 overflow-x-auto pb-2">
      <div
        v-for="col in roleCols"
        :key="col.role"
        class="flex flex-col w-52 flex-shrink-0"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 mb-2 px-1">
          <span class="w-2 h-2 rounded-full" :class="col.dot" />
          <span class="text-xs font-semibold" :class="col.text">{{ col.role }}</span>
          <span class="text-xs text-slate-600">{{ membersByRole[col.role]?.length ?? 0 }}</span>
        </div>

        <!-- Drop zone -->
        <div
          class="flex flex-col gap-2 rounded-xl p-2 min-h-16 transition-colors border"
          :class="dragOverRole === col.role
            ? 'bg-slate-800 border-blue-500/40'
            : 'bg-slate-900/30 border-slate-800'"
          @dragover.prevent="dragOverRole = col.role"
          @dragleave="dragOverRole = null"
          @drop.prevent="onDrop(col.role)"
        >
          <div
            v-for="m in membersByRole[col.role] ?? []"
            :key="m.userId"
            draggable="true"
            @dragstart="draggedMember = m; dragSourceRole = col.role"
            @dragend="dragOverRole = null"
            class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing select-none group hover:border-slate-500 transition-colors"
          >
            <div class="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-semibold text-blue-400 flex-shrink-0">
              {{ m.user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-white truncate">{{ m.user.name }}</p>
              <p class="text-xs text-slate-600 truncate">@{{ m.user.username }}</p>
            </div>
            <!-- Can't move OWNER unless you're OWNER -->
            <svg v-if="m.role !== 'OWNER'" class="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
            <svg v-else class="w-3 h-3 text-yellow-500/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>

          <div v-if="!(membersByRole[col.role]?.length)" class="text-xs text-slate-700 text-center py-2">
            Arraste aqui
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { api } from "@/lib/api";
import type { WorkspaceMember, WorkspaceRole } from "@/stores/workspace";

const props = defineProps<{
  wsId: string;
  members: WorkspaceMember[];
  myUserId: string;
}>();

const emit = defineEmits<{
  (e: "role-changed", userId: string, role: WorkspaceRole): void;
}>();

const roleCols = [
  { role: "OWNER"  as WorkspaceRole, dot: "bg-yellow-400", text: "text-yellow-400" },
  { role: "ADMIN"  as WorkspaceRole, dot: "bg-blue-400",   text: "text-blue-400"  },
  { role: "MEMBER" as WorkspaceRole, dot: "bg-green-400",  text: "text-green-400" },
  { role: "VIEWER" as WorkspaceRole, dot: "bg-slate-400",  text: "text-slate-400" },
];

const draggedMember  = ref<WorkspaceMember | null>(null);
const dragSourceRole = ref<WorkspaceRole | null>(null);
const dragOverRole   = ref<WorkspaceRole | null>(null);

const membersByRole = computed(() => {
  const map: Record<string, WorkspaceMember[]> = {};
  for (const m of props.members) {
    if (!map[m.role]) map[m.role] = [];
    map[m.role].push(m);
  }
  return map;
});

async function onDrop(targetRole: WorkspaceRole) {
  dragOverRole.value = null;
  const member = draggedMember.value;
  draggedMember.value = null;

  if (!member || member.role === targetRole) return;
  if (member.role === "OWNER") return; // Can't drag OWNER out
  if (targetRole === "OWNER") return;  // Can't drag into OWNER
  if (member.userId === props.myUserId) return; // Can't change own role

  // Optimistic
  emit("role-changed", member.userId, targetRole);

  try {
    await api.patch(`/admin/workspaces/${props.wsId}/members/${member.userId}`, { role: targetRole });
  } catch {
    // Revert if fails
    emit("role-changed", member.userId, member.role);
  }
}
</script>
