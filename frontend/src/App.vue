<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
onMounted(() => {
  if (localStorage.getItem("nexo_token")) {
    void auth.fetchMe();
  }
});
</script>
