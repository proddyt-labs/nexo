import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
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
        {
          path: "",
          name: "workspace-home",
          component: () => import("@/views/WorkspaceHome.vue"),
        },
        {
          path: "notes/:noteId",
          name: "note",
          component: () => import("@/views/NoteEditor.vue"),
        },
        {
          path: "daily",
          name: "daily",
          component: () => import("@/views/DailyNoteView.vue"),
        },
        {
          path: "graph",
          name: "graph",
          component: () => import("@/views/GraphView.vue"),
        },
        {
          path: "members",
          name: "members",
          component: () => import("@/views/MembersView.vue"),
        },
        {
          path: "kanban",
          name: "kanban",
          component: () => import("@/views/KanbanView.vue"),
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/views/SettingsView.vue"),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.user && auth.token) {
    await auth.fetchMe();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) return "/login";
  if (to.meta.guest && auth.isLoggedIn) return "/";
});

export default router;
