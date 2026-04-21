<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getVisibleModules } from '../../modules'

interface SidebarProps {
  collapsed?: boolean
  isMobile?: boolean
  isMobileOpen?: boolean
}

interface SidebarMenuItem {
  label: string
  to: string
  icon: string
}

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsed: false,
  isMobile: false,
  isMobileOpen: false,
})

const emit = defineEmits<{
  (e: 'close-mobile'): void
}>()

const route = useRoute()

// Only show modules the current user has access to.
// Reactive — updates automatically when auth state changes.
const menuItems = computed<SidebarMenuItem[]>(() =>
  getVisibleModules().map((m) => ({
    label: m.label,
    to: m.path,
    icon: m.icon,
  })),
)

const sidebarClasses = computed(() => ({
  collapsed: props.collapsed && !props.isMobile,
  mobile: props.isMobile,
  open: props.isMobileOpen,
}))

const isActive = (path: string): boolean => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleMenuClick = (): void => {
  if (props.isMobile) {
    emit('close-mobile')
  }
}
</script>

<template>
  <aside class="sidebar" :class="sidebarClasses">
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <div class="brand-mark" aria-hidden="true">D</div>
        <div class="brand-copy">
          <strong>DashFlow</strong>
          <span>Operations dashboard</span>
        </div>
      </div>

      <p class="menu-title">Workspace</p>

      <nav class="menu-list" aria-label="Primary navigation">
        <RouterLink
          v-for="item in menuItems"
          :key="item.to"
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
              <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h4l2 2h7A2.5 2.5 0 0 1 21 10.5v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
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
  transition:
    width 0.28s ease,
    transform 0.28s ease;
  z-index: 35;
  overflow: hidden;
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
  gap: 0.9rem;
  min-height: 4.25rem;
  padding: 0.25rem 0.6rem 1rem;
  border-bottom: 1px solid rgba(198, 234, 169, 0.18);
}

.brand-mark {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-copy strong {
  color: #fff;
  font-size: 0.92rem;
}

.brand-copy span {
  color: rgba(219, 234, 254, 0.82);
  font-size: 0.76rem;
}

.menu-title {
  margin: 0;
  padding: 0.25rem 0.75rem 0;
  color: rgba(219, 234, 254, 0.8);
  font-size: 0.68rem;
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
  transition:
    background 0.28s ease,
    color 0.28s ease,
    transform 0.28s ease,
    padding 0.28s ease;
}

.menu-link:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateX(2px);
}

.menu-link.active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(198, 234, 169, 0.16);
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
  white-space: nowrap;
}

.sidebar-card {
  margin-top: auto;
  padding: 1rem;
  border-radius: 0.8rem;
  background: rgba(255, 255, 255, 0.14);
  color: #f4fbf0;
  box-shadow: inset 0 0 0 1px rgba(198, 234, 169, 0.15);
  transition: opacity 0.2s ease;
}

/* ── Smooth Collapse Transitions ── */
.brand-copy,
.menu-title,
.menu-label {
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.sidebar.collapsed:not(.mobile) .brand-copy,
.sidebar.collapsed:not(.mobile) .menu-title,
.sidebar.collapsed:not(.mobile) .menu-label,
.sidebar.collapsed:not(.mobile) .sidebar-card {
  opacity: 0;
  pointer-events: none;
}

.sidebar.collapsed:not(.mobile) .menu-link {
  padding-left: 1.3rem; /* centers the icon within the 96px width */
}

.sidebar-card small,
.sidebar-card strong,
.sidebar-card p {
  display: block;
}

.sidebar-card small {
  margin-bottom: 0.35rem;
  color: rgba(219, 234, 254, 0.82);
}

.sidebar-card strong {
  margin-bottom: 0.45rem;
}

.sidebar-card p {
  margin: 0;
  color: rgba(239, 246, 255, 0.88);
  line-height: 1.5;
  font-size: 0.82rem;
}

@media (max-width: 959px) {
  .sidebar {
    padding: 1rem 0.85rem;
  }
}
</style>
