<template>
  <div>
    <!-- Collection header -->
    <div
      class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer transition-colors group"
      @click="expanded = !expanded"
    >
      <svg
        class="w-3 h-3 text-slate-600 transition-transform flex-shrink-0"
        :class="{ 'rotate-90': expanded }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-base leading-none">{{ collection.icon ?? "📂" }}</span>
      <span class="flex-1 truncate">{{ collection.name }}</span>
      <button
        @click.stop="emit('new-note', collection.id)"
        class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"
        title="Nova nota"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Children -->
    <div v-if="expanded" class="ml-3 border-l border-slate-800 pl-1">
      <!-- Sub-collections -->
      <CollectionTree
        v-for="child in childCollections"
        :key="child.id"
        :collection="child"
        :all-collections="allCollections"
        :active-note-id="activeNoteId"
        :notes="notes"
        @open-note="emit('open-note', $event)"
        @new-note="emit('new-note', $event)"
      />

      <!-- Notes in this collection -->
      <button
        v-for="note in collectionNotes"
        :key="note.id"
        @click="emit('open-note', note.id)"
        class="sidebar-item w-full"
        :class="{ active: activeNoteId === note.id }"
      >
        <span class="text-base leading-none">{{ note.emoji ?? "📄" }}</span>
        <span class="truncate">{{ note.title || "Sem título" }}</span>
      </button>

      <p v-if="!childCollections.length && !collectionNotes.length" class="text-xs text-slate-600 px-2 py-1">
        Vazio
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Collection, Note } from "@/stores/workspace";

const props = defineProps<{
  collection: Collection;
  allCollections: Collection[];
  notes: Note[];
  activeNoteId?: string;
}>();

const emit = defineEmits<{
  (e: "open-note", noteId: string): void;
  (e: "new-note", collectionId: string): void;
}>();

const expanded = ref(true);

const childCollections = computed(() =>
  props.allCollections
    .filter((c) => c.parentId === props.collection.id)
    .sort((a, b) => a.position - b.position)
);

const collectionNotes = computed(() =>
  props.notes.filter((n) => n.collectionId === props.collection.id)
);
</script>
