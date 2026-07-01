<script setup lang="ts">
/**
 * 学英语顶部 Header — 跟主站/学诗词/学国学/学通识 统一完整版
 *
 * 之前用 minimal（只 logo）导致用户视觉割裂；
 * 改回 full 后内容会留出 header 高度的顶部 padding。
 */
import { ref } from 'vue'
import HeaderBar from '@shared/components/HeaderBar.vue'

const searchQuery = ref('')
function handleSearch(q: string) {
  // 2026-07-01：之前跳主站 grandand.com/search 但主站没索引学英语 3340 单词
  // 改为站内搜索：跳到 ReviewPage（已有 searchQuery 输入框 + 单词过滤逻辑）
  window.location.href = '/#/study/__review__?q=' + encodeURIComponent(q)
}
</script>

<template>
  <HeaderBar v-model="searchQuery" :on-search="handleSearch" />
</template>