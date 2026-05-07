<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const query = ref("");

watch(query, (newValue) => {
  emit("input", newValue);
});

export interface SearchBarItem {
  label: string;
  path: string;
  description?: string;
}

interface SearchBarProps {
  items: SearchBarItem[];
  placeholder?: string;
  modelValue?: string;
}

const props = withDefaults(defineProps<SearchBarProps>(), {
  placeholder: "Search ...",
  modelValue: "",
});

const emit = defineEmits<{
  (e: "select", item: SearchBarItem): void;
  (e: "input", value: string): void;
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const normalizedQuery = computed(() => query.value.trim().toLowerCase());

watch(
  () => props.modelValue,
  (value) => {
    if (value !== query.value) {
      query.value = value;
    }
  }
);

const filteredItems = computed(() => {
  // Show nothing until at least 2 characters are typed
  if (normalizedQuery.value.length < 2) {
    return [];
  }

  return props.items.filter((item) => {
    // Only show items whose label matches the full typed code prefix
    return item.label.toLowerCase().startsWith(normalizedQuery.value);
  });
});

const showDropdown = computed(() => isOpen.value);

const onFocus = (): void => {
  isOpen.value = true;
};

const onSelect = (item: SearchBarItem): void => {
  query.value = item.label;
  isOpen.value = false;
  emit("select", item);
};

const onEscape = (): void => {
  isOpen.value = false;
};

const closeOnOutsideClick = (event: MouseEvent): void => {
  if (!rootRef.value) {
    return;
  }

  const target = event.target as Node;
  if (!rootRef.value.contains(target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", closeOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeOnOutsideClick);
});
</script>

<template>
  <div ref="rootRef" class="searchbar">
    <label class="searchbar-field" aria-label="Search">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.8-3.8" />
      </svg>

      <input
        v-model="query"
        type="text"
        class="searchbar-input"
        :placeholder="placeholder"
        @focus="onFocus"
        @keydown.esc="onEscape"
      />
    </label>

    <div v-if="showDropdown" class="searchbar-dropdown">
      <button
        v-for="item in filteredItems"
        :key="item.label"
        type="button"
        class="searchbar-option"
        @mousedown.prevent="onSelect(item)"
      >
        <strong>{{ item.label }}</strong>
        <small v-if="item.description">{{ item.description }}</small>
      </button>

      <p v-if="!filteredItems.length" class="searchbar-empty">No results found</p>
    </div>
  </div>
</template>

<style scoped>
.searchbar {
  position: relative;
  width: min(460px, 52vw);
}

.searchbar-field {
  height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.7rem;
  background: #fff;
  padding: 0 0.75rem;
}

.searchbar-field:focus-within {
  border-color: rgba(91, 183, 0, 0.45);
  box-shadow: 0 0 0 4px rgba(91, 183, 0, 0.14);
}

.searchbar-field svg {
  width: 1rem;
  height: 1rem;
  stroke: #64748b;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.searchbar-input {
  width: 100%;
  border: 0;
  outline: none;
  color: #0f172a;
  background: transparent;
  font-size: 0.9rem;
}

.searchbar-input::placeholder {
  color: #94a3b8;
}

.searchbar-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  max-height: 18rem;
  overflow-y: auto;
  border-radius: 0.8rem;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
  padding: 0.35rem;
  z-index: 50;
}

.searchbar-option {
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  border-radius: 0.6rem;
  padding: 0.6rem 0.7rem;
  cursor: pointer;
  text-align: left;
}

.searchbar-option:hover {
  background: #f8fafc;
}

.searchbar-option strong {
  color: #0f172a;
  font-size: 0.85rem;
}

.searchbar-option small {
  color: #64748b;
  font-size: 0.75rem;
}

.searchbar-empty {
  margin: 0;
  padding: 0.7rem;
  color: #64748b;
  font-size: 0.8rem;
}

@media (max-width: 959px) {
  .searchbar {
    width: min(320px, 56vw);
  }
}

@media (max-width: 639px) {
  .searchbar {
    width: min(230px, 58vw);
  }
}
</style>
