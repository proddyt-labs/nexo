<template>
  <div class="flex h-full">
    <!-- Editor principal -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Toolbar -->
      <div v-if="editor" class="flex items-center gap-1 px-4 py-2 border-b border-slate-800 flex-wrap">
        <button
          v-for="btn in toolbarButtons"
          :key="btn.label"
          @click="btn.action()"
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          :class="btn.active?.() ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
        >{{ btn.label }}</button>

        <div class="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span v-if="saving" class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 border border-slate-600 border-t-blue-500 rounded-full animate-spin" />
            Salvando…
          </span>
          <span v-else class="text-slate-600">✓ Salvo</span>

          <button
            @click="showDetails = !showDetails"
            class="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            :class="showDetails ? 'text-blue-400' : 'text-slate-500'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Detalhes
          </button>
        </div>
      </div>

      <!-- Area do editor -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-8 py-8">
          <!-- Emoji -->
          <div class="mb-3">
            <button
              @click="pickEmoji"
              class="text-4xl leading-none hover:opacity-70 transition-opacity"
              title="Clique para alterar emoji"
            >{{ note?.emoji ?? "📄" }}</button>
          </div>

          <!-- Título -->
          <input
            v-model="title"
            @blur="saveTitle"
            @keydown.enter.prevent="editor?.commands.focus()"
            class="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-700 outline-none mb-6"
            placeholder="Título da nota"
          />

          <!-- TipTap editor -->
          <EditorContent v-if="editor" :editor="editor" class="prose prose-invert prose-sm max-w-none" />
        </div>
      </div>
    </div>

    <!-- Painel lateral de detalhes -->
    <aside
      v-if="showDetails && note"
      class="w-64 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 overflow-y-auto"
    >
      <div class="p-4 flex flex-col gap-5">
        <!-- Tags -->
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</p>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="nt in note.tags"
              :key="nt.tag.id"
              class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              :style="{ backgroundColor: nt.tag.color + '22', color: nt.tag.color }"
            >
              {{ nt.tag.name }}
              <button @click="removeTag(nt.tag.id)" class="hover:opacity-70">×</button>
            </span>
          </div>

          <!-- Adicionar tag -->
          <div class="relative">
            <input
              v-model="tagSearch"
              @focus="showTagDropdown = true"
              @blur="() => delay(() => showTagDropdown = false, 150)"
              class="input text-xs py-1"
              placeholder="Adicionar tag…"
            />
            <div
              v-if="showTagDropdown && filteredTags.length"
              class="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10"
            >
              <button
                v-for="tag in filteredTags"
                :key="tag.id"
                @click="addTag(tag)"
                class="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-700 transition-colors"
              >
                <span class="w-2 h-2 rounded-full" :style="{ background: tag.color }" />
                {{ tag.name }}
              </button>
            </div>
          </div>

          <!-- Criar nova tag -->
          <div v-if="tagSearch && !filteredTags.find(t => t.name === tagSearch)" class="mt-1">
            <button @click="createAndAddTag" class="text-xs text-blue-400 hover:underline">
              + Criar "{{ tagSearch }}"
            </button>
          </div>
        </div>

        <!-- Links para outras notas -->
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Links de notas</p>

          <div v-if="note.linksFrom?.length" class="flex flex-col gap-1 mb-2">
            <div
              v-for="lf in note.linksFrom"
              :key="lf.to.id"
              class="flex items-center gap-1 justify-between group"
            >
              <RouterLink
                :to="`/w/${workspaceId}/notes/${lf.to.id}`"
                class="flex items-center gap-1 text-xs text-slate-400 hover:text-white truncate"
              >
                <span>{{ lf.to.emoji ?? "📄" }}</span>
                <span class="truncate">{{ lf.to.title || "Sem título" }}</span>
              </RouterLink>
              <button
                @click="removeLink(lf.to.id)"
                class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs"
              >×</button>
            </div>
          </div>

          <div v-if="note.linksTo?.length" class="flex flex-col gap-1 mb-2">
            <p class="text-xs text-slate-600 mb-1">Mencionado em:</p>
            <RouterLink
              v-for="lt in note.linksTo"
              :key="lt.from.id"
              :to="`/w/${workspaceId}/notes/${lt.from.id}`"
              class="flex items-center gap-1 text-xs text-slate-500 hover:text-white"
            >
              <span>{{ lt.from.emoji ?? "📄" }}</span>
              <span class="truncate">{{ lt.from.title || "Sem título" }}</span>
            </RouterLink>
          </div>

          <!-- Vincular nota -->
          <div class="relative">
            <input
              v-model="linkSearch"
              @focus="showLinkDropdown = true"
              @blur="() => delay(() => showLinkDropdown = false, 150)"
              class="input text-xs py-1"
              placeholder="Vincular nota…"
            />
            <div
              v-if="showLinkDropdown && filteredNotes.length"
              class="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10 max-h-40 overflow-y-auto"
            >
              <button
                v-for="n in filteredNotes"
                :key="n.id"
                @click="addLink(n.id)"
                class="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-700 transition-colors"
              >
                <span>{{ n.emoji ?? "📄" }}</span>
                <span class="truncate">{{ n.title || "Sem título" }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Pin / info -->
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Opções</p>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="note.isPinned" @change="togglePin" class="accent-blue-500" />
            <span class="text-xs text-slate-400">Fixar nota</span>
          </label>
        </div>

        <!-- Datas -->
        <div class="text-xs text-slate-600 flex flex-col gap-1">
          <span>Criado: {{ formatDate(note.createdAt) }}</span>
          <span>Atualizado: {{ formatDate(note.updatedAt) }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { io, type Socket } from "socket.io-client";

const delay = (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms);
const route   = useRoute();
const store   = useWorkspaceStore();
const noteId  = computed(() => route.params.noteId as string);
const wsId    = route.params.workspaceId as string;
const workspaceId = wsId;

interface Tag { id: string; name: string; color: string }
interface NoteRef { id: string; title: string; emoji?: string }
interface FullNote {
  id: string; title: string; emoji?: string; content: any;
  isPinned: boolean; collectionId?: string; createdAt: string; updatedAt: string;
  tags: { tag: Tag }[];
  linksFrom: { to: NoteRef }[];
  linksTo: { from: NoteRef }[];
}

const note        = ref<FullNote | null>(null);
const title       = ref("");
const saving      = ref(false);
const showDetails = ref(false);

// Tags
const allTags        = ref<Tag[]>([]);
const tagSearch      = ref("");
const showTagDropdown = ref(false);
const filteredTags   = computed(() =>
  allTags.value.filter(t =>
    t.name.toLowerCase().includes(tagSearch.value.toLowerCase()) &&
    !note.value?.tags.find(nt => nt.tag.id === t.id)
  )
);

// Links
const linkSearch      = ref("");
const showLinkDropdown = ref(false);
const filteredNotes   = computed(() =>
  store.notes.filter(n =>
    n.id !== noteId.value &&
    (n.title || "Sem título").toLowerCase().includes(linkSearch.value.toLowerCase()) &&
    !note.value?.linksFrom.find(lf => lf.to.id === n.id)
  ).slice(0, 8)
);

let saveTimer: ReturnType<typeof setTimeout>;
let socket: Socket;

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: "Comece a escrever…" }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Link.configure({ openOnClick: false }),
  ],
  editorProps: { attributes: { class: "outline-none min-h-[400px]" } },
  onUpdate({ editor }) {
    scheduleSave(editor.getJSON());
  },
});

const toolbarButtons = [
  { label: "B",       action: () => editor.value?.chain().focus().toggleBold().run(),              active: () => editor.value?.isActive("bold") },
  { label: "I",       action: () => editor.value?.chain().focus().toggleItalic().run(),            active: () => editor.value?.isActive("italic") },
  { label: "~~",      action: () => editor.value?.chain().focus().toggleStrike().run(),            active: () => editor.value?.isActive("strike") },
  { label: "H1",      action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => editor.value?.isActive("heading", { level: 1 }) },
  { label: "H2",      action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor.value?.isActive("heading", { level: 2 }) },
  { label: "H3",      action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor.value?.isActive("heading", { level: 3 }) },
  { label: "• Lista", action: () => editor.value?.chain().focus().toggleBulletList().run(),        active: () => editor.value?.isActive("bulletList") },
  { label: "1. Lista",action: () => editor.value?.chain().focus().toggleOrderedList().run(),       active: () => editor.value?.isActive("orderedList") },
  { label: "☑ Tasks", action: () => editor.value?.chain().focus().toggleTaskList().run(),          active: () => editor.value?.isActive("taskList") },
  { label: "</>",     action: () => editor.value?.chain().focus().toggleCode().run(),              active: () => editor.value?.isActive("code") },
  { label: "Bloco",   action: () => editor.value?.chain().focus().toggleCodeBlock().run(),         active: () => editor.value?.isActive("codeBlock") },
  { label: "Quote",   action: () => editor.value?.chain().focus().toggleBlockquote().run(),        active: () => editor.value?.isActive("blockquote") },
];

async function loadNote() {
  const { data } = await api.get<FullNote>(`/workspaces/${wsId}/notes/${noteId.value}`);
  note.value  = data;
  title.value = data.title;
  if (editor.value) {
    editor.value.commands.setContent(data.content || { type: "doc", content: [] }, false);
  }
}

async function loadTags() {
  const { data } = await api.get<Tag[]>(`/workspaces/${wsId}/tags`);
  allTags.value = data;
}

function scheduleSave(content: any) {
  clearTimeout(saveTimer);
  saving.value = true;
  saveTimer = setTimeout(async () => {
    try {
      await api.patch(`/workspaces/${wsId}/notes/${noteId.value}`, { content });
      // Broadcast realtime
      socket?.emit("note:update", { noteId: noteId.value, content });
    } finally {
      saving.value = false;
    }
  }, 800);
}

async function saveTitle() {
  if (!note.value || title.value === note.value.title) return;
  await api.patch(`/workspaces/${wsId}/notes/${noteId.value}`, { title: title.value });
  const n = store.notes.find(n => n.id === noteId.value);
  if (n) n.title = title.value;
  if (note.value) note.value.title = title.value;
}

function pickEmoji() {
  const emoji = prompt("Digite um emoji para a nota:", note.value?.emoji ?? "📄");
  if (emoji && note.value) {
    note.value.emoji = emoji;
    api.patch(`/workspaces/${wsId}/notes/${noteId.value}`, { emoji });
  }
}

async function togglePin() {
  if (!note.value) return;
  const newVal = !note.value.isPinned;
  note.value.isPinned = newVal;
  await api.patch(`/workspaces/${wsId}/notes/${noteId.value}`, { isPinned: newVal });
  const n = store.notes.find(n => n.id === noteId.value);
  if (n) n.isPinned = newVal;
}

async function addTag(tag: Tag) {
  await api.post(`/workspaces/${wsId}/tags/notes/${noteId.value}`, { tagId: tag.id });
  note.value?.tags.push({ tag });
  tagSearch.value = "";
  showTagDropdown.value = false;
}

async function removeTag(tagId: string) {
  await api.delete(`/workspaces/${wsId}/tags/notes/${noteId.value}/${tagId}`);
  if (note.value) note.value.tags = note.value.tags.filter(t => t.tag.id !== tagId);
}

async function createAndAddTag() {
  const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4"];
  const color  = colors[Math.floor(Math.random() * colors.length)];
  const { data } = await api.post<Tag>(`/workspaces/${wsId}/tags`, { name: tagSearch.value, color });
  allTags.value.push(data);
  await addTag(data);
}

async function addLink(toId: string) {
  await api.post(`/workspaces/${wsId}/notes/${noteId.value}/links`, { toId });
  const linked = store.notes.find(n => n.id === toId);
  if (linked && note.value) {
    note.value.linksFrom.push({ to: { id: linked.id, title: linked.title, emoji: linked.emoji } });
  }
  linkSearch.value = "";
  showLinkDropdown.value = false;
}

async function removeLink(toId: string) {
  await api.delete(`/workspaces/${wsId}/notes/${noteId.value}/links/${toId}`);
  if (note.value) note.value.linksFrom = note.value.linksFrom.filter(l => l.to.id !== toId);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initSocket() {
  socket = io({ path: "/socket.io" });
  socket.emit("note:join", { noteId: noteId.value });
  socket.on("note:updated", ({ content }: { content: any }) => {
    const current = JSON.stringify(editor.value?.getJSON());
    if (JSON.stringify(content) !== current) {
      editor.value?.commands.setContent(content, false);
    }
  });
}

onMounted(async () => {
  await Promise.all([loadNote(), loadTags()]);
  initSocket();
});

onBeforeUnmount(() => {
  socket?.emit("note:leave", { noteId: noteId.value });
  socket?.disconnect();
  editor.value?.destroy();
  clearTimeout(saveTimer);
});

watch(noteId, async (id) => {
  if (!id) return;
  clearTimeout(saveTimer);
  socket?.emit("note:leave", { noteId: id });
  await loadNote();
  socket?.emit("note:join", { noteId: id });
});
</script>
