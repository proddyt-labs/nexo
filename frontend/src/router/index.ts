import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, buildAuthorizeUrl } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/auth/callback",
      name: "callback",
      component: () => import("@/views/AuthCallback.vue"),
      meta: { guest: true },
    },
    {
      path: "/",
      name: "workspaces",
      component: () => import("@/views/WorkspaceList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/AdminView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/w/:workspaceId",
      component: () => import("@/views/WorkspaceLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        { path: "", name: "workspace-home", component: () => import("@/views/WorkspaceHome.vue") },
        { path: "notes/:noteId", name: "note", component: () => import("@/views/NoteEditor.vue") },
        { path: "daily", name: "daily", component: () => import("@/views/DailyNoteView.vue") },
        { path: "graph", name: "graph", component: () => import("@/views/GraphView.vue") },
        { path: "members", name: "members", component: () => import("@/views/MembersView.vue") },
        { path: "kanban", name: "kanban", component: () => import("@/views/KanbanView.vue") },
        { path: "settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.guest) return true;

  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.token) {
    window.location.href = buildAuthorizeUrl();
    return false;
  }
  return true;
});

export default router;
