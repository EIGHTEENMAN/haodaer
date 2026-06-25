<script setup lang="ts">
/**
 * 学英语顶部 Header — 直接复用 @shared/HeaderBar（与首页/学国学/学诗词/学通识一致）
 */
import { ref } from 'vue'
import HeaderBar from '@shared/components/HeaderBar.vue'

const searchQuery = ref('')
function handleSearch(q: string) {
  // 跳转主站全局搜索（与其它站点保持一致行为）
  window.location.href = 'https://grandand.com/search?q=' + encodeURIComponent(q)
}
</script>

<template>
  <HeaderBar v-model="searchQuery" :on-search="handleSearch" />
</template>