<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800">
      <button @click="prevDay" class="text-slate-500 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <input
        type="date"
        v-model="dateStr"
        class="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer"
      />
      <button @click="nextDay" class="text-slate-500 hover:text-white transition-colors" :disabled="isToday">
        <svg class="w-4 h-4" :class="{ 'opacity-30': isToday }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span v-if="isToday" class="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">Hoje</span>
    </div>

    <!-- Editor -->
    <div v-if="editor" class="flex items-center gap-1 px-6 py-2 border-b border-slate-800 flex-wrap">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.label"
        @click="btn.action()"
        class="px-2 py-1 rounded text-xs font-medium transition-colors"
        :class="btn.active?.() ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
      >
        {{ btn.label }}
      </button>
      <div class="ml-auto text-xs text-slate-600">
        <span v-if="saving" class="flex items-center gap-1">
          <span class="w-2.5 h-2.5 border border-slate-500 border-t-blue-500 rounded-full animate-spin" />
          Salvando...
        </span>
        <span v-else>Salvo</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto px-8 py-8">
        <h1 class="text-2xl font-bold text-white mb-6">{{ formattedDate }}</h1>
        <EditorContent :editor="editor" class="prose prose-invert prose-sm max-w-none" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { api } from "@/lib/api";

const route = useRoute();
const wsId  = route.params.workspaceId as string;

const today   = new Date().toISOString().split("T")[0];
const dateStr = ref(today);
const dailyId = ref<string | null>(null);
const saving  = ref(false);
let saveTimer: ReturnType<typeof setTimeout>;

const isToday       = computed(() => dateStr.value === today);
const formattedDate = computed(() =>
  new Date(dateStr.value + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
);

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: "Como foi seu dia?" }),
    TaskList,
    TaskItem.configure({ nested: true }),
  ],
  editorProps: { attributes: { class: "outline-none min-h-[300px]" } },
  onUpdate({ editor }) {
    scheduleSave(editor.getJSON());
  },
});

const toolbarButtons = [
  { label: "B",       action: () => editor.value?.chain().focus().toggleBold().run(),        active: () => editor.value?.isActive("bold") },
  { label: "I",       action: () => editor.value?.chain().focus().toggleItalic().run(),      active: () => editor.value?.isActive("italic") },
  { label: "H1",      action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => editor.value?.isActive("heading", { level: 1 }) },
  { label: "H2",      action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor.value?.isActive("heading", { level: 2 }) },
  { label: "• Lista", action: () => editor.value?.chain().focus().toggleBulletList().run(),  active: () => editor.value?.isActive("bulletList") },
  { label: "☑ Tasks", action: () => editor.value?.chain().focus().toggleTaskList().run(),    active: () => editor.value?.isActive("taskList") },
  { label: "Quote",   action: () => editor.value?.chain().focus().toggleBlockquote().run(),  active: () => editor.value?.isActive("blockquote") },
];

async function loadDay() {
  const { data } = await api.get(`/workspaces/${wsId}/daily?date=${dateStr.value}`);
  dailyId.value = data.id;
  editor.value?.commands.setContent(data.content ?? {}, false);
}

function scheduleSave(content: any) {
  if (!dailyId.value) return;
  clearTimeout(saveTimer);
  saving.value = true;
  saveTimer = setTimeout(async () => {
    await api.patch(`/workspaces/${wsId}/daily/${dailyId.value}`, { content });
    saving.value = false;
  }, 800);
}

function prevDay() {
  const d = new Date(dateStr.value + "T12:00:00");
  d.setDate(d.getDate() - 1);
  dateStr.value = d.toISOString().split("T")[0];
}

function nextDay() {
  if (isToday.value) return;
  const d = new Date(dateStr.value + "T12:00:00");
  d.setDate(d.getDate() + 1);
  dateStr.value = d.toISOString().split("T")[0];
}

watch(dateStr, () => loadDay());
onMounted(() => loadDay());
onBeforeUnmount(() => {
  editor.value?.destroy();
  clearTimeout(saveTimer);
});
</script>
