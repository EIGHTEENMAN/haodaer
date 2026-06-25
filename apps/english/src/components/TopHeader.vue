<script setup lang="ts">
/**
 * 学英语顶部 Header — 复用 @shared/HeaderBar 但用 minimal 变体
 *
 * 儿童学习站不需要主站全功能（搜索框 + 全站导航 + 登录/注册会抢视野、覆盖内容）
 * 只显示「好大儿」logo 点回主站即可
 */
import HeaderBar from '@shared/components/HeaderBar.vue'
</script>

<template>
  <HeaderBar variant="minimal" />
</template>