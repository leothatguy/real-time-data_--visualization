<template>
  <div class="chart-container card glow-cyan">
    <h3 class="chart-title">{{ title }}</h3>
    <VChart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import VChart from 'vue-echarts';
import type { ChartPoint } from '../../stores/metrics';
import { useMediaQuery } from '../../composables/useMediaQuery';
import './echarts';

const props = defineProps<{
  title: string;
  data: ChartPoint[];
}>();

const isMobile = useMediaQuery('(max-width: 640px)');
const yMax = computed(() => {
  const highest = props.data.reduce((max, point) => Math.max(max, point.value[1]), 0);
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
    valueFormatter: value => `${Number(value).toFixed(1)}%`
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: isMobile.value ? 34 : '3%',
    top: 16,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: props.data.map(point => point.name),
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: {
      color: '#94a3b8',
      hideOverlap: true,
      interval: 0,
      rotate: isMobile.value ? 35 : 0,
      fontSize: isMobile.value ? 10 : 12
    }
  },
  yAxis: {
    type: 'value',
    max: yMax.value,
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)' } },
    axisLabel: { color: '#94a3b8' }
  },
  series: [
    {
      name: props.title,
      type: 'bar',
      data: props.data.map(point => point.value[1]),
      barMaxWidth: 36,
      itemStyle: {
        color: '#00e5ff',
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
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

.chart-title {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.chart {
  flex: 1;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 240px;
  overflow: hidden;
}
</style>
