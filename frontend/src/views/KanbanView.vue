<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-3 border-b border-slate-800 flex-shrink-0">
      <h2 class="font-semibold text-white text-sm">Kanban</h2>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="canWrite"
          @click="openCreate()"
          class="btn-primary text-xs"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nova task
        </button>
      </div>
    </div>

    <!-- Board -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden">
      <div class="flex gap-4 h-full p-4 w-max min-w-full">
        <div
          v-for="col in columns"
          :key="col.status"
          class="flex flex-col w-72 flex-shrink-0"
        >
          <!-- Column header -->
          <div class="flex items-center gap-2 mb-3 px-1">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="col.dot" />
            <span class="text-sm font-medium text-white">{{ col.label }}</span>
            <span class="text-xs text-slate-600 ml-1">{{ tasksByStatus[col.status]?.length ?? 0 }}</span>
            <button
              v-if="canWrite"
              @click="openCreate(col.status)"
              class="ml-auto text-slate-600 hover:text-slate-300 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <!-- Drop zone -->
          <div
            class="flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-24 transition-colors"
            :class="dragOver === col.status ? 'bg-slate-800/80 ring-1 ring-blue-500/40' : 'bg-slate-900/40'"
            @dragover.prevent="dragOver = col.status"
            @dragleave="dragOver = null"
            @drop.prevent="onDrop(col.status, $event)"
          >
            <div
              v-for="task in tasksByStatus[col.status] ?? []"
              :key="task.id"
              draggable="true"
              @dragstart="onDragStart(task, $event)"
              @dragend="dragOver = null"
              class="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none group transition-colors"
              @click="openEdit(task)"
            >
              <!-- Priority indicator -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <span
                  class="text-xs font-medium px-1.5 py-0.5 rounded"
                  :class="priorityStyle(task.priority)"
                >{{ task.priority }}</span>
                <button
                  v-if="canWrite"
                  @click.stop="deleteTask(task)"
                  class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p class="text-sm text-white font-medium leading-snug mb-2">{{ task.title }}</p>

              <p v-if="task.description" class="text-xs text-slate-500 line-clamp-2 mb-2">{{ task.description }}</p>

              <!-- Footer -->
              <div class="flex items-center gap-2 mt-1">
                <div
                  v-if="task.assignee"
                  class="w-5 h-5 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-semibold text-blue-400"
                  :title="task.assignee.name"
                >{{ task.assignee.name.charAt(0) }}</div>

                <span v-if="task.dueDate" class="text-xs ml-auto" :class="isOverdue(task.dueDate) ? 'text-red-400' : 'text-slate-600'">
                  {{ formatDate(task.dueDate) }}
                </span>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="!(tasksByStatus[col.status]?.length)" class="text-xs text-slate-700 text-center py-4">
              Arraste aqui
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Task modal -->
  <Teleport to="body">
    <div v-if="modal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="modal = null">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h2 class="font-semibold text-white mb-4">{{ modal.id ? 'Editar task' : 'Nova task' }}</h2>

        <form @submit.prevent="saveModal" class="flex flex-col gap-3">
          <input v-model="modal.title" class="input" placeholder="Título da task" required />
          <textarea v-model="modal.description" class="input resize-none h-20" placeholder="Descrição (opcional)" />

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Status</label>
              <select v-model="modal.status" class="input text-sm">
                <option v-for="c in columns" :key="c.status" :value="c.status">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Prioridade</label>
              <select v-model="modal.priority" class="input text-sm">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-slate-500 mb-1 block">Responsável</label>
            <select v-model="modal.assigneeId" class="input text-sm">
              <option value="">Ninguém</option>
              <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.user.name }}</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-slate-500 mb-1 block">Data limite</label>
            <input v-model="modal.dueDate" type="date" class="input text-sm" />
          </div>

          <div class="flex gap-2 justify-end mt-1">
            <button type="button" @click="modal = null" class="btn-ghost">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {{ modal.id ? 'Salvar' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import type { WorkspaceMember } from "@/stores/workspace";

const route = useRoute();
const auth  = useAuthStore();
const wsId  = route.params.workspaceId as string;

type TaskStatus   = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string; title: string; description: string;
  status: TaskStatus; priority: TaskPriority; position: number;
  assigneeId?: string; dueDate?: string;
  assignee?: { id: string; name: string };
  author: { id: string; name: string };
  createdAt: string; updatedAt: string;
}

const columns = [
  { status: "BACKLOG"     as TaskStatus, label: "Backlog",      dot: "bg-slate-500" },
  { status: "TODO"        as TaskStatus, label: "A fazer",      dot: "bg-blue-400"  },
  { status: "IN_PROGRESS" as TaskStatus, label: "Em andamento", dot: "bg-yellow-400"},
  { status: "IN_REVIEW"   as TaskStatus, label: "Em revisão",   dot: "bg-purple-400"},
  { status: "DONE"        as TaskStatus, label: "Concluído",    dot: "bg-green-400" },
];

const tasks   = ref<Task[]>([]);
const members = ref<WorkspaceMember[]>([]);
const saving  = ref(false);
const dragOver = ref<TaskStatus | null>(null);
let draggedTask: Task | null = null;

type ModalData = Partial<Task> & { title: string; status: TaskStatus; priority: TaskPriority; assigneeId: string; dueDate: string };
const modal = ref<ModalData | null>(null);

const myRole = computed(() => members.value.find(m => m.userId === auth.user?.id)?.role);
const canWrite = computed(() => myRole.value && myRole.value !== "VIEWER");

const tasksByStatus = computed(() => {
  const map: Record<string, Task[]> = {};
  for (const t of tasks.value) {
    if (!map[t.status]) map[t.status] = [];
    map[t.status].push(t);
  }
  for (const key in map) map[key].sort((a, b) => a.position - b.position);
  return map;
});

async function load() {
  const [taskRes, memRes] = await Promise.all([
    api.get<Task[]>(`/workspaces/${wsId}/tasks`),
    api.get<WorkspaceMember[]>(`/admin/workspaces/${wsId}/members`),
  ]);
  tasks.value   = taskRes.data;
  members.value = memRes.data;
}

function openCreate(status: TaskStatus = "TODO") {
  modal.value = { title: "", description: "", status, priority: "MEDIUM", assigneeId: "", dueDate: "" };
}

function openEdit(task: Task) {
  modal.value = {
    ...task,
    assigneeId: task.assigneeId ?? "",
    dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
  } as ModalData;
}

async function saveModal() {
  if (!modal.value) return;
  saving.value = true;
  try {
    const payload = {
      title:       modal.value.title,
      description: modal.value.description || "",
      status:      modal.value.status,
      priority:    modal.value.priority,
      assigneeId:  modal.value.assigneeId || null,
      dueDate:     modal.value.dueDate    || null,
    };
    if (modal.value.id) {
      const { data } = await api.patch<Task>(`/workspaces/${wsId}/tasks/${modal.value.id}`, payload);
      const idx = tasks.value.findIndex(t => t.id === data.id);
      if (idx !== -1) tasks.value[idx] = data;
    } else {
      const { data } = await api.post<Task>(`/workspaces/${wsId}/tasks`, payload);
      tasks.value.push(data);
    }
    modal.value = null;
  } finally {
    saving.value = false;
  }
}

async function deleteTask(task: Task) {
  if (!confirm(`Excluir "${task.title}"?`)) return;
  await api.delete(`/workspaces/${wsId}/tasks/${task.id}`);
  tasks.value = tasks.value.filter(t => t.id !== task.id);
}

function onDragStart(task: Task, e: DragEvent) {
  draggedTask = task;
  e.dataTransfer?.setData("taskId", task.id);
}

async function onDrop(status: TaskStatus, _e: DragEvent) {
  dragOver.value = null;
  if (!draggedTask || draggedTask.status === status) { draggedTask = null; return; }
  const task = draggedTask;
  draggedTask = null;

  // Optimistic update
  const idx = tasks.value.findIndex(t => t.id === task.id);
  if (idx !== -1) tasks.value[idx] = { ...tasks.value[idx], status };

  await api.patch(`/workspaces/${wsId}/tasks/${task.id}`, { status });
}

function priorityStyle(p: TaskPriority) {
  return {
    LOW:    "bg-slate-700/60 text-slate-400",
    MEDIUM: "bg-blue-500/20 text-blue-400",
    HIGH:   "bg-orange-500/20 text-orange-400",
    URGENT: "bg-red-500/20 text-red-400",
  }[p];
}

function isOverdue(d: string) {
  return new Date(d) < new Date();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

onMounted(load);
</script>
