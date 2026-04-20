<template>
  <section class="dashboard-layout">
    <header class="dashboard-layout__header">Dashboard</header>
    <main class="dashboard-layout__content">
      <router-view />
    </main>
  </section>
</template>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  padding: 1rem;
}

.dashboard-layout__header {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
</style>
