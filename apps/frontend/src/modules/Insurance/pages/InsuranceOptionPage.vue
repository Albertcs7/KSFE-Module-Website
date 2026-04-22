<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const optionId = computed(() => route.params.optionId)
</script>

<template>
  <div class="option-page">
    <h1>Insurance {{ optionId }}</h1>
    <p>This is a placeholder page for the selected insurance option: {{ optionId }}.</p>
  </div>
</template>

<style scoped>
.option-page {
  padding: 2rem;
  font-family: inherit;
}

h1 {
  color: #1d3a6d;
  font-size: 2rem;
  margin-bottom: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

p {
  color: #4a5568;
  line-height: 1.6;
  font-size: 1.1rem;
}
</style>
