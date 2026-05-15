<template>
  <div class="card metric-card" :class="`glow-${color}`">
    <div class="metric-header">
      <div class="metric-title">
        <component :is="icon" class="icon" v-if="icon" />
        <span>{{ title }}</span>
      </div>
      <div class="metric-trend" :class="trend > 0 ? 'up' : 'down'">
        {{ trend > 0 ? '+' : '' }}{{ trend.toFixed(1) }}%
      </div>
    </div>
    <div class="metric-value">
      {{ formattedValue }}
      <span class="unit">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  value: number;
  unit?: string;
  trend: number;
  color?: 'cyan' | 'blue' | 'green' | 'magenta';
  icon?: any;
  format?: 'number' | 'percent';
}>();

const formattedValue = computed(() => {
  if (props.format === 'number') {
    return new Intl.NumberFormat('en-US').format(Math.round(props.value));
  }
  return props.value.toFixed(1);
});
</script>

<style scoped>
.metric-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.metric-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.icon {
  width: 16px;
  height: 16px;
}

.metric-trend {
  font-size: 0.8rem;
  font-weight: 600;
}

.metric-trend.up {
  color: var(--neon-cyan);
}

.metric-trend.down {
  color: var(--neon-blue);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.unit {
  font-size: 1rem;
  color: var(--text-muted);
  font-weight: 400;
}
</style>
