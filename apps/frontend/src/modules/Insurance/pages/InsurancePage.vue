<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchBar, { type SearchBarItem } from '../../../components/searchBar/SearchBar.vue'

const router = useRouter()

const searchItems: SearchBarItem[] = [
  { label: 'sreeHari',
    path:'',
    description:''
   },
  { label: 'sarvesh',
    path:'',
    description:''
   },
  { label: 'abhinav',
    path:'',
    description:''
   }
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
