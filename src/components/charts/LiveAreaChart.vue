<template>
  <div class="chart-container card glow-cyan">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <span class="chart-count">{{ series.length }} streams</span>
    </div>
    <VChart v-if="series.length" class="chart" :option="chartOption" autoresize />
    <div v-else class="empty-chart">No network datasets enabled</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import VChart from 'vue-echarts';
import type { ChartSeries } from '../../stores/metrics';
import { useMediaQuery } from '../../composables/useMediaQuery';
import './echarts';

const props = defineProps<{
  title: string;
  series: ChartSeries[];
}>();

const isMobile = useMediaQuery('(max-width: 640px)');
const yMax = computed(() => {
  const highest = props.series.reduce((max, item) => {
    return Math.max(max, ...item.data.map(point => point.value[1]));
  }, 0);

  if (highest <= 0) return 100;
  return Math.ceil((highest * 1.15) / 50) * 50;
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
    bottom: isMobile.value ? 30 : '3%',
    top: 34,
    containLabel: true
  },
  xAxis: {
    type: 'time',
    splitLine: { show: false },
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: {
      color: '#94a3b8',
      hideOverlap: true,
      rotate: isMobile.value ? 35 : 0,
      fontSize: isMobile.value ? 10 : 12,
      margin: isMobile.value ? 12 : 8
    }
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
    smooth: true,
    progressive: 500,
    data: item.data,
    itemStyle: { color: item.color },
    lineStyle: { width: 1.5, color: item.color },
    areaStyle: { color: item.color, opacity: 0.18 },
    emphasis: { focus: 'series' }
  }))
}));
</script>

<style scoped>
.chart-container {
  min-width: 0;
  max-width: 100%;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
}

.chart {
  flex: 1;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 240px;
  overflow: hidden;
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
