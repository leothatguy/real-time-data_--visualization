<template>
  <div class="chart-container card glow-cyan">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <span class="chart-count">{{ totalPoints }} pts</span>
    </div>
    <VChart v-if="series.length" class="chart" :option="chartOption" autoresize />
    <div v-else class="empty-chart">No visible datasets</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import VChart from 'vue-echarts';
import type { ChartSeries } from '../../stores/metrics';
import './echarts';

const props = defineProps<{
  title: string;
  series: ChartSeries[];
  yMax?: number;
}>();

const totalPoints = computed(() => props.series.reduce((total, item) => total + item.data.length, 0));
const yMax = computed(() => {
  if (props.yMax) return props.yMax;

  const highest = props.series.reduce((max, item) => {
    return Math.max(max, ...item.data.map(point => point.value[1]));
  }, 0);

  if (highest <= 0) return 100;
  return Math.ceil((highest * 1.15) / 10) * 10;
});

const chartOption = computed<EChartsOption>(() => ({
  animation: false,
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    borderColor: '#334155',
    textStyle: { color: '#fff' },
    valueFormatter: value => Number(value).toFixed(1)
  },
  legend: {
    top: 0,
    right: 0,
    textStyle: { color: '#94a3b8' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: 34,
    containLabel: true
  },
  xAxis: {
    type: 'time',
    splitLine: { show: false },
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#94a3b8' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)' } },
    axisLabel: { color: '#94a3b8' },
    max: yMax.value
  },
  series: props.series.map(item => ({
    name: item.name,
    type: 'line',
    showSymbol: false,
    sampling: 'lttb',
    progressive: 500,
    data: item.data,
    itemStyle: { color: item.color },
    lineStyle: { width: 2, color: item.color },
    emphasis: { focus: 'series' }
  }))
}));
</script>

<style scoped>
.chart-container {
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.chart-title {
  font-size: 1rem;
  color: var(--text-secondary);
}

.chart-count {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 260px;
}

.empty-chart {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
}
</style>
