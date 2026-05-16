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
import { useMediaQuery } from '../../composables/useMediaQuery';
import './echarts';

const props = defineProps<{
  title: string;
  data: number[][];
  xLabels: string[];
  yLabels: string[];
}>();

const isMobile = useMediaQuery('(max-width: 640px)');

function formatTooltip(params: unknown) {
  const value = Array.isArray(params)
    ? (params[0] as { value?: unknown } | undefined)?.value
    : (params as { value?: unknown }).value;

  if (!Array.isArray(value)) return '';

  const [xIndex, yIndex, intensity] = value.map(Number);
  const metric = props.yLabels[yIndex] ?? 'Metric';
  const time = props.xLabels[xIndex] || 'warming up';

  return `${metric}<br/>${time}: ${intensity.toFixed(1)}% intensity`;
}

const chartOption = computed<EChartsOption>(() => ({
  animation: false,
  tooltip: {
    position: 'top',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderColor: '#00e5ff',
    textStyle: { color: '#fff' },
    formatter: formatTooltip
  },
  grid: {
    left: isMobile.value ? 62 : 84,
    right: isMobile.value ? 8 : 12,
    top: 12,
    bottom: isMobile.value ? 54 : 38
  },
  xAxis: {
    type: 'category',
    data: props.xLabels,
    splitArea: { show: true },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.22)' } },
    axisLabel: {
      color: '#94a3b8',
      hideOverlap: true,
      interval: isMobile.value ? 2 : 1,
      rotate: isMobile.value ? 35 : 0,
      fontSize: isMobile.value ? 10 : 12,
      margin: isMobile.value ? 12 : 8
    }
  },
  yAxis: {
    type: 'category',
    data: props.yLabels,
    splitArea: { show: true },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.22)' } },
    axisLabel: {
      color: '#cbd5e1',
      fontWeight: 600,
      fontSize: isMobile.value ? 10 : 12
    }
  },
  visualMap: {
    min: 0,
    max: 100,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: 0,
    itemWidth: 15,
    itemHeight: 140,
    text: ['High', 'Low'],
    textStyle: { color: '#94a3b8' },
    inRange: {
      color: ['#00e5ff', '#22c55e', '#f59e0b', '#ef4444']
    }
  },
  series: [
    {
      name: props.title,
      type: 'heatmap',
      data: props.data,
      itemStyle: {
        borderWidth: 2,
        borderColor: '#000000'
      },
      emphasis: {
        itemStyle: {
          borderColor: '#00e5ff',
          borderWidth: 1,
          shadowBlur: 0
        }
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
