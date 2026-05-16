import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { dataStream } from '../services/DataStreamService';
import type { ActivityLog, MetricsEnvelope, StreamState, SystemMetrics } from '../services/DataStreamService';

export interface ChartPoint {
  name: string;
  value: [number, number];
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartPoint[];
  color: string;
}

export type DatasetKey = 'cpu' | 'memory' | 'networkIn' | 'networkOut' | 'errorRate' | 'latency' | 'throughput';
export type TimeRange = 0 | 60_000 | 300_000 | 3_600_000;
export type SeverityFilter = 'all' | ActivityLog['level'];
export type ThemeMode = 'dark' | 'light';

const MAX_DATA_POINTS = 3000;
const MAX_LOGS = 500;

const DATASET_META: Record<DatasetKey, { label: string; color: string; max: number }> = {
  cpu: { label: 'CPU', color: '#00e5ff', max: 100 },
  memory: { label: 'Memory', color: '#22c55e', max: 100 },
  networkIn: { label: 'Network In', color: '#38bdf8', max: 900 },
  networkOut: { label: 'Network Out', color: '#a78bfa', max: 650 },
  errorRate: { label: 'Error Rate', color: '#ef4444', max: 25 },
  latency: { label: 'Latency', color: '#f59e0b', max: 900 },
  throughput: { label: 'Throughput', color: '#f472b6', max: 2500 }
};

const INITIAL_METRICS: SystemMetrics = {
  cpu: 0,
  memory: 0,
  networkIn: 0,
  networkOut: 0,
  activeUsers: 0,
  errorRate: 0,
  latency: 0,
  throughput: 0
};

const INITIAL_STATUS: StreamState = {
  status: 'idle',
  message: 'Stream paused',
  attempt: 0,
  lastConnectedAt: null,
  lastErrorAt: null
};

export const useMetricsStore = defineStore('metrics', () => {
  const histories = shallowRef<Record<DatasetKey, ChartPoint[]>>({
    cpu: [],
    memory: [],
    networkIn: [],
    networkOut: [],
    errorRate: [],
    latency: [],
    throughput: []
  });

  const currentMetrics = ref<SystemMetrics>({ ...INITIAL_METRICS });
  const logs = shallowRef<ActivityLog[]>([]);
  const streamState = ref<StreamState>({ ...INITIAL_STATUS });
  const isStreaming = ref(false);
  const timeRange = ref<TimeRange>(300_000);
  const visibleDatasets = ref<Record<DatasetKey, boolean>>({
    cpu: true,
    memory: true,
    networkIn: true,
    networkOut: false,
    errorRate: true,
    latency: true,
    throughput: false
  });
  const severityFilter = ref<SeverityFilter>('all');
  const logSearch = ref('');
  const theme = ref<ThemeMode>('dark');
  const rejectedPayloads = ref(0);

  let unsubs: (() => void)[] = [];

  const datasetMeta = DATASET_META;

  const visibleSeries = computed<ChartSeries[]>(() => {
    const keys: DatasetKey[] = ['cpu', 'memory', 'latency', 'errorRate'];
    return keys.filter(key => visibleDatasets.value[key]).map(key => ({
      name: DATASET_META[key].label,
      data: filterByTime(histories.value[key]),
      color: DATASET_META[key].color
    }));
  });

  const networkSeries = computed<ChartSeries[]>(() => {
    const keys: DatasetKey[] = ['networkIn', 'networkOut', 'throughput'];
    return keys.filter(key => visibleDatasets.value[key]).map(key => ({
      name: DATASET_META[key].label,
      data: filterByTime(histories.value[key]),
      color: DATASET_META[key].color
    }));
  });

  const errorBars = computed<ChartPoint[]>(() => {
    const now = Date.now();
    return [
      ['CPU', currentMetrics.value.cpu, DATASET_META.cpu.color],
      ['Memory', currentMetrics.value.memory, DATASET_META.memory.color],
      ['Errors', currentMetrics.value.errorRate * 4, DATASET_META.errorRate.color],
      ['Latency', Math.min(100, currentMetrics.value.latency / 9), DATASET_META.latency.color],
      ['Users', Math.min(100, currentMetrics.value.activeUsers / 25), DATASET_META.throughput.color]
    ].map(([name, value, color], index) => ({
      name: String(name),
      value: [now + index, Number(value)],
      color: String(color)
    }));
  });

  const filteredLogs = computed(() => {
    const needle = logSearch.value.trim().toLowerCase();

    return logs.value.filter(log => {
      const matchesSeverity = severityFilter.value === 'all' || log.level === severityFilter.value;
      const matchesSearch = !needle || `${log.source} ${log.message} ${log.level}`.toLowerCase().includes(needle);
      return matchesSeverity && matchesSearch;
    });
  });

  const healthScore = computed(() => {
    const cpuPenalty = currentMetrics.value.cpu * 0.28;
    const memoryPenalty = currentMetrics.value.memory * 0.22;
    const errorPenalty = currentMetrics.value.errorRate * 2.4;
    const latencyPenalty = Math.min(35, currentMetrics.value.latency / 20);
    return Math.max(0, Math.round(100 - cpuPenalty - memoryPenalty - errorPenalty - latencyPenalty));
  });

  function start() {
    if (unsubs.length > 0) {
      dataStream.start();
      isStreaming.value = true;
      return;
    }

    isStreaming.value = true;

    const unsubMetrics = dataStream.subscribe('metrics', payload => {
      if (!isMetricsEnvelope(payload)) {
        rejectedPayloads.value += 1;
        pushLog({
          id: `rejected-${Date.now()}-${rejectedPayloads.value}`,
          timestamp: Date.now(),
          level: 'warning',
          message: 'Rejected malformed telemetry payload',
          source: 'Payload Validator'
        });
        return;
      }

      const metrics = sanitizeMetrics(payload.metrics);
      currentMetrics.value = metrics;
      histories.value = appendMetrics(histories.value, payload.timestamp, metrics);
    });

    const unsubLogs = dataStream.subscribe('logs', payload => {
      if (isActivityLog(payload)) {
        pushLog(sanitizeLog(payload));
      } else {
        rejectedPayloads.value += 1;
      }
    });

    const unsubStatus = dataStream.subscribe('status', status => {
      streamState.value = status;
      isStreaming.value = status.status !== 'idle';
    });

    unsubs = [unsubMetrics, unsubLogs, unsubStatus];
    dataStream.start();
  }

  function pause() {
    dataStream.stop();
    isStreaming.value = false;
    unsubs.forEach(unsub => unsub());
    unsubs = [];
  }

  function setSpeed(ms: number) {
    dataStream.setFrequency(ms);
  }

  function setTimeRange(value: TimeRange) {
    timeRange.value = value;
  }

  function toggleDataset(key: DatasetKey) {
    visibleDatasets.value = {
      ...visibleDatasets.value,
      [key]: !visibleDatasets.value[key]
    };
  }

  function setSeverityFilter(value: SeverityFilter) {
    severityFilter.value = value;
  }

  function setLogSearch(value: string) {
    logSearch.value = value.slice(0, 80);
  }

  function setTheme(value: ThemeMode) {
    theme.value = value;
    document.documentElement.dataset.theme = value;
  }

  function clearData() {
    histories.value = {
      cpu: [],
      memory: [],
      networkIn: [],
      networkOut: [],
      errorRate: [],
      latency: [],
      throughput: []
    };
    logs.value = [];
    rejectedPayloads.value = 0;
  }

  function filterByTime(points: ChartPoint[]) {
    if (timeRange.value === 0) return points.slice(-240);

    const cutoff = Date.now() - timeRange.value;
    return points.filter(point => point.value[0] >= cutoff);
  }

  function appendMetrics(
    current: Record<DatasetKey, ChartPoint[]>,
    timestamp: number,
    metrics: SystemMetrics
  ): Record<DatasetKey, ChartPoint[]> {
    const next = { ...current };
    (Object.keys(DATASET_META) as DatasetKey[]).forEach(key => {
      const point = { name: String(timestamp), value: [timestamp, metrics[key]] as [number, number] };
      const series = [...current[key], point];
      if (series.length > MAX_DATA_POINTS) series.splice(0, series.length - MAX_DATA_POINTS);
      next[key] = series;
    });
    return next;
  }

  function pushLog(log: ActivityLog) {
    const next = [log, ...logs.value];
    if (next.length > MAX_LOGS) next.length = MAX_LOGS;
    logs.value = next;
  }

  return {
    histories,
    currentMetrics,
    logs,
    filteredLogs,
    streamState,
    isStreaming,
    timeRange,
    visibleDatasets,
    severityFilter,
    logSearch,
    theme,
    rejectedPayloads,
    datasetMeta,
    visibleSeries,
    networkSeries,
    errorBars,
    healthScore,
    start,
    pause,
    setSpeed,
    setTimeRange,
    toggleDataset,
    setSeverityFilter,
    setLogSearch,
    setTheme,
    clearData
  };
});

function isMetricsEnvelope(value: unknown): value is MetricsEnvelope {
  if (!isRecord(value) || typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return false;
  const metrics = value.metrics;
  if (!isRecord(metrics)) return false;

  return ['cpu', 'memory', 'networkIn', 'networkOut', 'activeUsers', 'errorRate', 'latency', 'throughput'].every(key => {
    const metric = metrics[key];
    return typeof metric === 'number' && Number.isFinite(metric);
  });
}

function isActivityLog(value: unknown): value is ActivityLog {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.timestamp === 'number' &&
    Number.isFinite(value.timestamp) &&
    isLogLevel(value.level) &&
    typeof value.message === 'string' &&
    typeof value.source === 'string'
  );
}

function isLogLevel(value: unknown): value is ActivityLog['level'] {
  return value === 'info' || value === 'warning' || value === 'error' || value === 'critical';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeMetrics(metrics: SystemMetrics): SystemMetrics {
  return {
    cpu: clamp(metrics.cpu, 0, 100),
    memory: clamp(metrics.memory, 0, 100),
    networkIn: clamp(metrics.networkIn, 0, 1000),
    networkOut: clamp(metrics.networkOut, 0, 1000),
    activeUsers: clamp(metrics.activeUsers, 0, 100_000),
    errorRate: clamp(metrics.errorRate, 0, 100),
    latency: clamp(metrics.latency, 0, 5000),
    throughput: clamp(metrics.throughput, 0, 10_000)
  };
}

function sanitizeLog(log: ActivityLog): ActivityLog {
  return {
    ...log,
    message: sanitizeText(log.message),
    source: sanitizeText(log.source)
  };
}

function sanitizeText(value: string) {
  return value.replace(/[<>]/g, '').slice(0, 140);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
