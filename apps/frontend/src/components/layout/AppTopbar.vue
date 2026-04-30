<script setup lang="ts">
import { useAuthStore } from "@/store/auth.store";
import { computed } from "vue";
import { useRouter } from "vue-router";

interface TopbarProps {
  isMobile?: boolean;
  isSidebarCollapsed?: boolean;
  isMobileSidebarOpen?: boolean;
}

withDefaults(defineProps<TopbarProps>(), {
  isMobile: false,
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
});

const emit = defineEmits<{
  (e: "toggle-sidebar"): void;
}>();

const router = useRouter();
const authStore = useAuthStore();

const firstName = computed(() => {
  const fullName = authStore.user?.first_name?.trim() ?? "";
  return fullName ? fullName.split(" ")[0] ?? "User" : "User";
});

const roleLabel = computed(() => authStore.roleName || "Employee");
const initials = computed(() => firstName.value.charAt(0).toUpperCase());

const logout = async (): Promise<void> => {
  await authStore.logout();
  router.push("/login");
};
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="menu-toggle"
        type="button"
        @click="emit('toggle-sidebar')"
        :aria-label="isMobile ? 'Toggle navigation menu' : 'Collapse sidebar'"
        :aria-expanded="isMobile ? isMobileSidebarOpen : !isSidebarCollapsed"
      >
        <span />
        <span />
        <span />
      </button>
      <img src="/KSFE TOP LOGO.png" alt="KSFE Top Logo" class="topbar-logo" />
    </div>

    <div class="profile">
      <button class="profile-action" type="button">
        <span class="profile-avatar">{{ initials }}</span>
        <span class="profile-text">
          <strong>{{ firstName }}</strong>
          <small>{{ roleLabel }}</small>
        </span>
      </button>

      <button
        id="topbar-logout"
        class="logout-btn"
        type="button"
        title="Sign out"
        @click="logout"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width, 272px);
  right: 0;
  height: 4.75rem;
  padding: 0 1.5rem;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  z-index: 40;
  transition: left 0.28s ease;
}

.topbar-left,
.profile {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.topbar-logo {
  height: 2.5rem;
  width: auto;
  max-width: 150px;
  object-fit: contain;
  margin-left: 0.5rem;
}

.menu-toggle {
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 0.6rem;
  background: #f4fbf0;
  color: #4a9500;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.menu-toggle:hover {
  background: #e3f4d6;
  box-shadow: 0 10px 20px rgba(91, 183, 0, 0.18);
}

.menu-toggle span {
  display: block;
  width: 1rem;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.profile-action {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.5rem 0.45rem 0.45rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.profile-action:hover {
  transform: translateY(-1px);
  border-color: rgba(91, 183, 0, 0.25);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.profile-avatar {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #9bda71, #5bb700);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.76rem;
  font-weight: 700;
}

.profile-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  line-height: 1.1;
}

.profile-text strong {
  color: #0f172a;
  font-size: 0.84rem;
}

.profile-text small {
  color: #64748b;
  font-size: 0.7rem;
}

.logout-btn {
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.65rem;
  background: #fff;
  color: #64748b;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease,
    transform 0.2s ease;
  flex-shrink: 0;
}

.logout-btn:hover {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.3);
  background: #fef2f2;
  transform: translateY(-1px);
}

.logout-btn svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 639px) {
  .topbar {
    padding: 0 1rem;
  }

  .profile-text {
    display: none;
  }
}

@media (max-width: 959px) {
  .topbar {
    left: 0;
  }
}
</style>
