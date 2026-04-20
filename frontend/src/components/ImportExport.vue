<template>
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
    <h3 class="text-sm font-semibold text-white">Importar / Exportar</h3>

    <!-- Export — todos podem -->
    <div class="flex items-center justify-between py-3 border-b border-slate-800">
      <div>
        <p class="text-sm text-white">Exportar vault</p>
        <p class="text-xs text-slate-500">Baixa todas as notas como arquivos .md compactados em .zip</p>
      </div>
      <button @click="doExport" :disabled="exporting" class="btn-ghost text-sm flex-shrink-0">
        <span v-if="exporting" class="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar
      </button>
    </div>

    <!-- Import — somente MEMBER/ADMIN/OWNER -->
    <div v-if="canImport">
      <div class="flex items-center justify-between mb-3">
        <div>
          <p class="text-sm text-white">Importar notas</p>
          <p class="text-xs text-slate-500">Aceita arquivos .md — a estrutura de pastas vira coleções</p>
        </div>
      </div>

      <!-- Drop zone -->
      <div
        class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
        :class="isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500'"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="onFileDrop"
        @click="fileInput?.click()"
      >
        <svg class="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-sm text-slate-400">
          {{ selectedFiles.length ? `${selectedFiles.length} arquivo(s) selecionado(s)` : 'Arraste arquivos .md ou clique para selecionar' }}
        </p>
        <p class="text-xs text-slate-600 mt-1">Inclua arquivos de pastas para preservar a hierarquia</p>
        <input
          ref="fileInput"
          type="file"
          accept=".md"
          multiple
          class="hidden"
          @change="onFileSelect"
        />
      </div>

      <!-- File list preview -->
      <div v-if="selectedFiles.length" class="mt-3 max-h-40 overflow-y-auto flex flex-col gap-1">
        <div
          v-for="(f, i) in selectedFiles"
          :key="i"
          class="flex items-center gap-2 text-xs text-slate-400 px-2 py-1 rounded hover:bg-slate-800"
        >
          <svg class="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="truncate">{{ f.webkitRelativePath || f.name }}</span>
          <span class="ml-auto text-slate-600 flex-shrink-0">{{ formatSize(f.size) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="selectedFiles.length" class="flex items-center gap-2 mt-3">
        <button @click="selectedFiles = []; isDragging = false" class="btn-ghost text-xs">
          Limpar
        </button>
        <button @click="doImport" :disabled="importing" class="btn-primary text-xs ml-auto">
          <span v-if="importing" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar {{ selectedFiles.length }} arquivo(s)
        </button>
      </div>

      <!-- Result -->
      <div v-if="importResult" class="mt-3 rounded-lg px-3 py-2 text-xs" :class="importResult.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'">
        {{ importResult.message }}
      </div>
    </div>

    <div v-else class="text-xs text-slate-600 italic">
      Somente membros com permissão de escrita podem importar notas.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { api } from "@/lib/api";

const props = defineProps<{
  wsId: string;
  canImport: boolean;
}>();

const emit = defineEmits<{ (e: "imported"): void }>();

const fileInput     = ref<HTMLInputElement>();
const selectedFiles = ref<File[]>([]);
const isDragging    = ref(false);
const importing     = ref(false);
const exporting     = ref(false);
const importResult  = ref<{ error: boolean; message: string } | null>(null);

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  selectedFiles.value = Array.from(input.files ?? []);
}

function onFileDrop(e: DragEvent) {
  isDragging.value = false;
  selectedFiles.value = Array.from(e.dataTransfer?.files ?? []).filter(f => f.name.endsWith(".md"));
}

function formatSize(bytes: number) {
  return bytes < 1024 ? bytes + "B" : (bytes / 1024).toFixed(1) + "KB";
}

async function doImport() {
  importing.value   = true;
  importResult.value = null;
  try {
    const form = new FormData();
    for (const f of selectedFiles.value) {
      // Preserve relative path via filename if webkitRelativePath is set
      const name = (f as any).webkitRelativePath || f.name;
      form.append("files", f, name);
    }
    const { data } = await api.post<{ imported: number; collections: number }>(
      `/workspaces/${props.wsId}/import`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    importResult.value = {
      error: false,
      message: `✓ ${data.imported} nota(s) importada(s) em ${data.collections} coleção(ões)`,
    };
    selectedFiles.value = [];
    emit("imported");
  } catch (e: any) {
    importResult.value = { error: true, message: e?.response?.data?.message ?? "Erro ao importar" };
  } finally {
    importing.value = false;
  }
}

async function doExport() {
  exporting.value = true;
  try {
    const res = await api.get(`/workspaces/${props.wsId}/export`, { responseType: "blob" });
    const url  = URL.createObjectURL(new Blob([res.data], { type: "application/zip" }));
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "nexo-export.zip";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}
</script>
