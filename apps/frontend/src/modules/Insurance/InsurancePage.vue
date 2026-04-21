<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchBar, { type SearchBarItem } from '../../components/searchBar/SearchBar.vue'
import { getVisibleModules } from '../../modules'

const router = useRouter()

const searchItems: SearchBarItem[] = [
  'sreeHari',
  'sarvesh',
  'abhinav'
]

const goToSearchItem = (item: SearchBarItem): void => {
  router.push(item.path)
}
</script>

<template>
  <section>
    <SearchBar :items="searchItems" @select="goToSearchItem" />
  </section>
</template>