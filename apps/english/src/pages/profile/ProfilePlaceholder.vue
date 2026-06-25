<script setup lang="ts">
import { wordStore } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
</script>

<template>
  <div class="profile-placeholder">
    <h2 class="title">我的学习</h2>

    <div class="stats-grid">
      <div class="stat-card stat-card--blue">
        <div class="stat-num">{{ wordStore.getMasteredCount() }}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card stat-card--orange">
        <div class="stat-num">{{ wordStore.getCorrectCount() }}</div>
        <div class="stat-label">答对</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-num">{{ wordStore.getAccuracy() }}%</div>
        <div class="stat-label">正确率</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-num">{{ studyStore.sessionsCompleted }}</div>
        <div class="stat-label">完成课次</div>
      </div>
    </div>

    <div class="coming-soon">
      <p>P1 阶段上线：详细统计 + 月历 + 设置面板</p>
    </div>
  </div>
</template>

<style scoped>
.profile-placeholder {
  padding: var(--gap-lg) 0;
}

.title {
  font-size: var(--text-title);
  color: var(--color-text);
  margin-bottom: var(--gap-lg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap-md);
  margin-bottom: var(--gap-lg);
}

.stat-card {
  padding: var(--gap-lg);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-card);
  text-align: center;
  border-bottom: 4px solid;
}

.stat-card--blue { border-color: var(--color-primary); }
.stat-card--orange { border-color: var(--color-secondary); }
.stat-card--green { border-color: var(--color-tertiary); }

.stat-num {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: var(--gap-xs);
}

.stat-label {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

.coming-soon {
  text-align: center;
  padding: var(--gap-lg);
  color: var(--color-text-sub);
  font-style: italic;
  background: var(--color-card);
  border-radius: var(--radius-md);
  border: 2px dashed var(--color-border);
}
</style>