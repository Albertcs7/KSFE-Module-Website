<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import AppSidebar from "../../../components/layout/AppSidebar.vue";
import AppTopbar from "../../../components/layout/AppTopbar.vue";

const MOBILE_BREAKPOINT = 960;

const isMobile = ref(false);
const isSidebarCollapsed = ref(false);
const isMobileSidebarOpen = ref(false);

const syncViewport = (): void => {
  const mobile = window.innerWidth < MOBILE_BREAKPOINT;
  isMobile.value = mobile;

  if (!mobile) {
    isMobileSidebarOpen.value = false;
  }
};

const toggleSidebar = (): void => {
  if (isMobile.value) {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
    return;
  }

  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const closeMobileSidebar = (): void => {
  isMobileSidebarOpen.value = false;
};

onMounted(() => {
  syncViewport();
  window.addEventListener("resize", syncViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncViewport);
});
</script>

<template>
  <section
    class="dashboard-layout"
    :class="{
      'is-mobile': isMobile,
      'is-collapsed': isSidebarCollapsed && !isMobile,
    }"
  >
    <AppTopbar
      :is-mobile="isMobile"
      :is-sidebar-collapsed="isSidebarCollapsed"
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @toggle-sidebar="toggleSidebar"
    />

    <div
      v-if="isMobile && isMobileSidebarOpen"
      class="layout-backdrop"
      @click="closeMobileSidebar"
    />

    <AppSidebar
      :collapsed="isSidebarCollapsed"
      :is-mobile="isMobile"
      :is-mobile-open="isMobileSidebarOpen"
      @close-mobile="closeMobileSidebar"
    />

    <main class="dashboard-layout__content">
      <router-view />
    </main>
  </section>
</template>

<style scoped>
.dashboard-layout {
  --sidebar-width: 272px;
  min-height: 100vh;
  background: #f7f9fc;
}

.dashboard-layout.is-collapsed {
  --sidebar-width: 96px;
}

.dashboard-layout.is-mobile {
  --sidebar-width: 0px;
}

.layout-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
  z-index: 30;
}

.dashboard-layout__content {
  margin-left: var(--sidebar-width);
  padding: calc(4.75rem + 1rem) 1rem 1rem;
  transition: margin-left 0.28s ease;
}

@media (max-width: 959px) {
  .dashboard-layout__content {
    margin-left: 0;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
</style>
