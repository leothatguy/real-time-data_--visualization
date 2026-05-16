<template>
  <div class="dashboard-layout">
    <header class="header">
      <div class="logo">
        <Activity class="icon logo-icon" />
        <div>
          <h1>NeonData <span>Live</span></h1>
          <p>Real-time telemetry, alerts, and operational signals</p>
        </div>
      </div>
      <div class="header-right">
        <span class="system-status" :class="store.streamState.status">
          {{ store.streamState.status }}
        </span>
      </div>
    </header>

    <main class="main-content">
      <DashboardControls />

      <section class="metrics-grid" aria-label="Live metrics">
        <MetricCard
          title="CPU Usage"
          :value="store.currentMetrics.cpu"
          unit="%"
          :trend="trendFor('cpu')"
          color="cyan"
          :icon="Cpu"
        />
        <MetricCard
          title="Memory Load"
          :value="store.currentMetrics.memory"
          unit="%"
          :trend="trendFor('memory')"
          color="cyan"
          :icon="Server"
        />
        <MetricCard
          title="Network Traffic"
          :value="store.currentMetrics.networkIn + store.currentMetrics.networkOut"
          unit="MB/s"
          :trend="trendFor('networkIn')"
          color="cyan"
          :icon="Network"
        />
        <MetricCard
          title="Latency"
          :value="store.currentMetrics.latency"
          unit="ms"
          :trend="trendFor('latency')"
          color="cyan"
          :icon="Gauge"
        />
        <MetricCard
          title="Active Users"
          :value="store.currentMetrics.activeUsers"
          :trend="2.8"
          color="cyan"
          :icon="Users"
          format="number"
        />
        <MetricCard
          title="Health Score"
          :value="store.healthScore"
          unit="/100"
          :trend="store.healthScore > 72 ? 4.1 : -6.4"
          color="cyan"
          :icon="ShieldCheck"
          format="number"
        />
      </section>

      <section class="insight-strip" aria-label="Stream resilience">
        <div class="insight">
          <span>Connection</span>
          <strong>{{ store.streamState.message }}</strong>
        </div>
        <div class="insight">
          <span>Rejected Payloads</span>
          <strong>{{ store.rejectedPayloads }}</strong>
        </div>
        <div class="insight">
          <span>Buffered Points</span>
          <strong>{{ bufferedPoints }}</strong>
        </div>
      </section>

      <div class="dashboard-grid">
        <div class="charts-section">
          <LiveLineChart
            title="Systems Load, Latency & Error Rate"
            :series="store.visibleSeries"
          />
          <div class="split-charts">
            <LiveAreaChart
              title="Network Throughput"
              :series="store.networkSeries"
            />
            <LiveBarChart
              title="Current Risk Distribution"
              :data="store.errorBars"
            />
          </div>
          <LiveHeatmapChart
            title="Recent Risk Heatmap"
            :data="heatmapData"
            :x-labels="heatmapXLabels"
            :y-labels="heatmapYLabels"
          />
        </div>

        <aside class="side-panel">
          <ActivityFeed />
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { Activity, Cpu, Gauge, Network, Server, ShieldCheck, Users } from '@lucide/vue';
import { useMetricsStore } from './stores/metrics';
import type { DatasetKey } from './stores/metrics';
import ActivityFeed from './components/ActivityFeed.vue';
import DashboardControls from './components/DashboardControls.vue';
import MetricCard from './components/MetricCard.vue';

const store = useMetricsStore();
const LiveAreaChart = defineAsyncComponent(() => import('./components/charts/LiveAreaChart.vue'));
const LiveBarChart = defineAsyncComponent(() => import('./components/charts/LiveBarChart.vue'));
const LiveHeatmapChart = defineAsyncComponent(() => import('./components/charts/LiveHeatmapChart.vue'));
const LiveLineChart = defineAsyncComponent(() => import('./components/charts/LiveLineChart.vue'));

const bufferedPoints = computed(() => {
  return Object.values(store.histories).reduce((total, series) => total + series.length, 0);
});

const heatmapKeys: DatasetKey[] = ['cpu', 'memory', 'errorRate', 'latency'];
const heatmapYLabels = computed(() => heatmapKeys.map(key => store.datasetMeta[key].label));
const heatmapXLabels = computed(() => {
  const points = store.histories.cpu.slice(-12);
  const padded = Array.from({ length: 12 }, (_, index) => points[index - (12 - points.length)]);

  return padded.map((point, index) => {
    if (!point) return '';
    if (index === padded.length - 1) return 'Now';
    return formatHeatmapTime(point.value[0]);
  });
});
const heatmapData = computed(() => {
  return heatmapKeys.flatMap((key, yIndex) => {
    const max = store.datasetMeta[key].max;
    const points = store.histories[key].slice(-12);
    const padded = Array.from({ length: 12 }, (_, index) => points[index - (12 - points.length)]);

    return padded.map((point, xIndex) => [
      xIndex,
      yIndex,
      point ? Math.min(100, (point.value[1] / max) * 100) : 0
    ]);
  });
});

function formatHeatmapTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  });
}

function trendFor(key: DatasetKey) {
  const series = store.histories[key];
  if (series.length < 2) return 0;

  const latest = series[series.length - 1]?.value[1] ?? 0;
  const previous = series[Math.max(0, series.length - 8)]?.value[1] ?? latest;
  if (previous === 0) return 0;
  return ((latest - previous) / previous) * 100;
}

onMounted(() => {
  store.setTheme(store.theme);
  store.start();
});

onUnmounted(() => {
  store.pause();
});
</script>

<style scoped>
.dashboard-layout {
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: var(--bg-glass);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.logo-icon {
  color: var(--accent);
  filter: drop-shadow(0 0 5px var(--accent));
  flex: 0 0 auto;
}

.logo h1 {
  font-size: 1.45rem;
  margin: 0;
  color: var(--text-primary);
}

.logo h1 span {
  color: var(--accent);
}

.logo p {
  color: var(--text-muted);
  font-size: 0.82rem;
  margin-top: 2px;
}

.system-status {
  color: var(--accent);
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  padding: 5px 10px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  background-color: var(--accent-soft);
}

.system-status.reconnecting,
.system-status.degraded,
.system-status.connecting {
  color: var(--warning);
  border-color: var(--warning);
  background-color: var(--warning-soft);
}

.system-status.error {
  color: var(--danger);
  border-color: var(--danger);
  background-color: var(--danger-soft);
}

.main-content {
  min-width: 0;
  width: 100%;
  flex: 1;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--spacing-md);
  min-width: 0;
}

.insight-strip {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--spacing-md);
  min-width: 0;
}

.insight {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.insight span {
  display: block;
  color: var(--text-muted);
  font-size: 0.76rem;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 4px;
}

.insight strong {
  color: var(--text-primary);
  font-size: 0.94rem;
  overflow-wrap: anywhere;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 0.85fr);
  gap: var(--spacing-lg);
  align-items: stretch;
  min-width: 0;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.split-charts {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--spacing-md);
  min-width: 0;
}

.charts-section > *,
.split-charts > * {
  min-width: 0;
  max-width: 100%;
}

.side-panel {
  min-width: 0;
  align-self: start;
}

@media (max-width: 1280px) {
  .metrics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .main-content {
    padding: var(--spacing-md);
  }

  .metrics-grid,
  .insight-strip,
  .split-charts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .header {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--spacing-md);
  }
}
</style>
