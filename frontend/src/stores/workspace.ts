import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/lib/api";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; username: string; name: string; avatar?: string; email: string };
}

export interface Workspace {
  id: string; name: string; slug: string; description?: string; icon?: string;
  members: { userId: string; role: WorkspaceRole }[];
  _count: { notes: number; collections: number };
}

export interface Collection {
  id: string; workspaceId: string; parentId?: string;
  name: string; icon?: string; color?: string; position: number;
  _count: { notes: number; children: number };
}

export interface Note {
  id: string; title: string; emoji?: string;
  collectionId?: string; isPinned: boolean;
  author: { id: string; name: string; avatar?: string };
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { comments: number; linksFrom: number; linksTo: number };
  createdAt: string; updatedAt: string;
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const workspaces   = ref<Workspace[]>([]);
  const active       = ref<Workspace | null>(null);
  const collections  = ref<Collection[]>([]);
  const notes        = ref<Note[]>([]);
  const loading      = ref(false);

  async function fetchWorkspaces() {
    const { data } = await api.get<Workspace[]>("/workspaces");
    workspaces.value = data;
    return data;
  }

  async function setActive(workspaceId: string) {
    loading.value = true;
    try {
      const [wsRes, colRes, notesRes] = await Promise.all([
        api.get<Workspace>(`/workspaces/${workspaceId}`),
        api.get<Collection[]>(`/workspaces/${workspaceId}/collections`),
        api.get<Note[]>(`/workspaces/${workspaceId}/notes`),
      ]);
      active.value      = wsRes.data;
      collections.value = colRes.data;
      notes.value       = notesRes.data;
    } finally {
      loading.value = false;
    }
  }

  async function createWorkspace(payload: { name: string; description?: string; icon?: string }) {
    const { data } = await api.post<Workspace>("/workspaces", payload);
    workspaces.value.push(data);
    return data;
  }

  async function createCollection(name: string, parentId?: string) {
    const { data } = await api.post<Collection>(
      `/workspaces/${active.value!.id}/collections`,
      { name, parentId }
    );
    collections.value.push(data);
    return data;
  }

  async function createNote(payload: { title?: string; collectionId?: string }) {
    const { data } = await api.post<Note & { content: string }>(
      `/workspaces/${active.value!.id}/notes`,
      payload
    );
    notes.value.unshift(data);
    return data;
  }

  async function deleteNote(noteId: string) {
    await api.delete(`/workspaces/${active.value!.id}/notes/${noteId}`);
    notes.value = notes.value.filter((n) => n.id !== noteId);
  }

  return {
    workspaces, active, collections, notes, loading,
    fetchWorkspaces, setActive, createWorkspace, createCollection, createNote, deleteNote,
  };
});
