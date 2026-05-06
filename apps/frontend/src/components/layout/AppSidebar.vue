<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getVisibleModules } from "../../modules";

interface SidebarProps {
  collapsed?: boolean;
  isMobile?: boolean;
  isMobileOpen?: boolean;
}

interface SidebarMenuItem {
  label: string;
  to: string;
  icon: string;
  children?: { label: string; to: string }[];
}

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsed: false,
  isMobile: false,
  isMobileOpen: false,
});

const emit = defineEmits<{
  (e: "close-mobile"): void;
}>();

const route = useRoute();
const router = useRouter();

// Only show modules the current user has access to.
// Reactive — updates automatically when auth state changes.
const menuItems = computed<SidebarMenuItem[]>(() =>
  getVisibleModules().map((m) => ({
    label: m.label,
    to: m.path,
    icon: m.icon,
    children: m.children?.map((c) => ({
      label: c.label,
      to: c.path,
    })),
  }))
);

const expandedItems = ref<Record<string, boolean>>({});

const toggleExpand = (label: string) => {
  expandedItems.value[label] = !expandedItems.value[label];
};

const sidebarClasses = computed(() => ({
  collapsed: props.collapsed && !props.isMobile,
  mobile: props.isMobile,
  open: props.isMobileOpen,
}));

const isActive = (path: string): boolean => {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
};

const handleMenuClick = (): void => {
  if (props.isMobile) {
    emit("close-mobile");
  }
};
</script>

<template>
  <aside class="sidebar" :class="sidebarClasses">
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <RouterLink to="/" class="brand-link">
          <img src="/KSFE SIDE LOGO.png" alt="KSFE Logo" class="brand-logo" />
        </RouterLink>
      </div>

      <p class="menu-title">Workspace</p>

      <nav class="menu-list" aria-label="Primary navigation">
        <div v-for="item in menuItems" :key="item.to" class="menu-item-wrapper">
          <RouterLink
            v-if="!item.children || item.children.length === 0"
            :to="item.to"
            class="menu-link"
            :class="{ active: isActive(item.to) }"
            @click="handleMenuClick"
          >
            <span class="menu-icon" aria-hidden="true">
              <svg v-if="item.icon === 'grid'" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="3" width="7" height="7" rx="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
              </svg>
              <svg v-else-if="item.icon === 'chart'" viewBox="0 0 24 24" fill="none">
                <path d="M4 19h16" />
                <path d="M7 16V9" />
                <path d="M12 16V5" />
                <path d="M17 16v-7" />
              </svg>
              <svg v-else-if="item.icon === 'folder'" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 8.5A2.5 2.5 0 0 1 5.5 6h4l2 2h7A2.5 2.5 0 0 1 21 10.5v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"
                />
              </svg>
              <svg v-else-if="item.icon === 'card'" viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
                <path d="M3.5 10h17" />
                <path d="M7 14h4" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none">
                <path d="M12 3v3" />
                <path d="M12 18v3" />
                <path d="M4.93 4.93l2.12 2.12" />
                <path d="M16.95 16.95l2.12 2.12" />
                <path d="M3 12h3" />
                <path d="M18 12h3" />
                <path d="M4.93 19.07l2.12-2.12" />
                <path d="M16.95 7.05l2.12-2.12" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </span>

            <span class="menu-label">
              {{ item.label }}
            </span>
          </RouterLink>

          <div v-else class="menu-group">
            <button
              class="menu-link"
              :class="{ 'active-parent': isActive(item.to) || expandedItems[item.label] }"
              @click="toggleExpand(item.label)"
              style="justify-content: space-between; width: 100%; border: none; background: transparent; cursor: pointer; font-family: inherit; font-size: inherit; text-align: left;"
            >
              <div class="menu-link-content" style="display: flex; align-items: center; gap: 0.9rem;">
                <span class="menu-icon" aria-hidden="true">
                  <svg v-if="item.icon === 'grid'" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="2" />
                    <rect x="14" y="3" width="7" height="7" rx="2" />
                    <rect x="3" y="14" width="7" height="7" rx="2" />
                    <rect x="14" y="14" width="7" height="7" rx="2" />
                  </svg>
                  <svg v-else-if="item.icon === 'chart'" viewBox="0 0 24 24" fill="none">
                    <path d="M4 19h16" />
                    <path d="M7 16V9" />
                    <path d="M12 16V5" />
                    <path d="M17 16v-7" />
                  </svg>
                  <svg v-else-if="item.icon === 'folder'" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 8.5A2.5 2.5 0 0 1 5.5 6h4l2 2h7A2.5 2.5 0 0 1 21 10.5v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"
                    />
                  </svg>
                  <svg v-else-if="item.icon === 'card'" viewBox="0 0 24 24" fill="none">
                    <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
                    <path d="M3.5 10h17" />
                    <path d="M7 14h4" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v3" />
                    <path d="M12 18v3" />
                    <path d="M4.93 4.93l2.12 2.12" />
                    <path d="M16.95 16.95l2.12 2.12" />
                    <path d="M3 12h3" />
                    <path d="M18 12h3" />
                    <path d="M4.93 19.07l2.12-2.12" />
                    <path d="M16.95 7.05l2.12-2.12" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </span>
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <span class="dropdown-chevron" :class="{ 'rotate-180': expandedItems[item.label] }">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            <div v-show="expandedItems[item.label]" class="menu-children">
              <RouterLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                class="menu-child-link"
                :class="{ active: isActive(child.to) }"
                @click="handleMenuClick"
              >
                {{ child.label }}
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>


    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 272px;
  padding: 1.25rem 1rem 1rem;
  background-color: #1d3a6d;
  box-shadow: 18px 0 40px rgba(91, 183, 0, 0.18);
  transition: width 0.28s ease, transform 0.28s ease;
  z-index: 35;
  overflow: hidden;
  font-size: 1.05rem;
}

.sidebar.collapsed {
  width: 96px;
}

.sidebar.mobile {
  width: min(272px, calc(100vw - 2rem));
  transform: translateX(-100%);
}

.sidebar.mobile.open {
  transform: translateX(0);
}

.sidebar-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 5.5rem;
  padding: 0.5rem 0.6rem 1.5rem;
  border-bottom: 1px solid rgba(198, 234, 169, 0.18);
}

.brand-link {
  display: block;
  text-decoration: none;
}

.brand-logo {
  height: 4.8rem;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  transition: opacity 0.2s ease, transform 0.28s ease;
}

.menu-title {
  margin: 0;
  padding: 0.25rem 0.75rem 0;
  color: rgba(219, 234, 254, 0.8);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 3.25rem;
  padding: 0 0.9rem;
  border-radius: 0.7rem;
  color: rgba(239, 246, 255, 0.82);
  text-decoration: none;
  transition: background 0.28s ease, color 0.28s ease, transform 0.28s ease,
    padding 0.28s ease;
}

.menu-link:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateX(2px);
}

.menu-link.active {
  background: #ccf25c;
  color: #0f172a;
  box-shadow: inset 0 0 0 1px rgba(204, 242, 92, 0.8);
}

.menu-link.active-parent {
  color: #ccf25c;
}

.menu-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex: 0 0 1.35rem;
}

.menu-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu-label {
  font-weight: 600;
  font-size: 1.02rem;
  white-space: nowrap;
}

/* ── Smooth Collapse Transitions ── */
.brand-copy,
.menu-title,
.menu-label {
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.sidebar.collapsed:not(.mobile) .brand-copy,
.sidebar.collapsed:not(.mobile) .menu-label {
  opacity: 0;
  pointer-events: none;
}

.sidebar.collapsed:not(.mobile) .menu-link {
  padding-left: 1.3rem; /* centers the icon within the 96px width */
}

.menu-group {
  display: flex;
  flex-direction: column;
}

.dropdown-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.dropdown-chevron.rotate-180 {
  transform: rotate(180deg);
}

.menu-children {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-left: 3.2rem;
  margin-top: 0.2rem;
  margin-bottom: 0.4rem;
}

.menu-child-link {
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 0.9rem;
  border-radius: 0.5rem;
  color: rgba(239, 246, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.menu-child-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.menu-child-link.active {
  color: #0f172a;
  background: #ccf25c;
  font-weight: 600;
}

/* Hide children and chevron when sidebar is collapsed */
.sidebar.collapsed:not(.mobile) .dropdown-chevron,
.sidebar.collapsed:not(.mobile) .menu-children {
  display: none;
}



@media (max-width: 959px) {
  .sidebar {
    padding: 1rem 0.85rem;
  }
}
</style>