<template>
  <div class="controls-container card glow-cyan">
    <div class="status-indicator" :class="store.streamState.status">
      <div class="dot"></div>
      <div>
        <span>{{ statusLabel }}</span>
        <small>{{ store.streamState.message }}</small>
      </div>
    </div>

    <div class="actions">
      <button
        class="btn btn-primary icon-action stream-action"
        type="button"
        :aria-label="store.isStreaming ? 'Pause stream' : 'Resume stream'"
        :title="store.isStreaming ? 'Pause stream' : 'Resume stream'"
        @click="toggleStream"
      >
        <component :is="store.isStreaming ? Pause : Play" class="icon" />
        <span class="btn-label">{{ store.isStreaming ? 'Pause' : 'Resume' }}</span>
      </button>

      <label class="field">
        <span>Range</span>
        <select
          :value="store.timeRange"
          class="select-input"
          @change="handleTimeRangeChange"
        >
          <option :value="0">Real-time</option>
          <option :value="60000">Last 1 min</option>
          <option :value="300000">Last 5 mins</option>
          <option :value="3600000">Last 1 hour</option>
        </select>
      </label>

      <label class="field">
        <span>Speed</span>
        <select v-model="selectedSpeed" class="select-input" @change="updateSpeed">
          <option :value="100">100ms</option>
          <option :value="500">500ms</option>
          <option :value="1000">1s</option>
          <option :value="2000">2s</option>
        </select>
      </label>

      <button
        class="btn btn-secondary icon-action theme-action"
        type="button"
        :aria-label="store.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="store.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <component :is="store.theme === 'dark' ? Sun : Moon" class="icon" />
        <span class="btn-label">{{ store.theme === 'dark' ? 'Light' : 'Dark' }}</span>
      </button>

      <button
        class="btn btn-secondary icon-action clear-action"
        type="button"
        aria-label="Clear data"
        title="Clear data"
        @click="store.clearData"
      >
        <RotateCcw class="icon" />
        <span class="btn-label">Clear</span>
      </button>
    </div>

    <div class="dataset-toggles" aria-label="Dataset toggles">
      <button
        v-for="key in datasetKeys"
        :key="key"
        class="chip"
        :class="{ active: store.visibleDatasets[key] }"
        :style="{ '--dataset-color': store.datasetMeta[key].color }"
        type="button"
        @click="store.toggleDataset(key)"
      >
        <span class="swatch"></span>
        {{ store.datasetMeta[key].label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Moon, Pause, Play, RotateCcw, Sun } from '@lucide/vue';
import { useMetricsStore } from '../stores/metrics';
import type { DatasetKey, ThemeMode, TimeRange } from '../stores/metrics';

const store = useMetricsStore();
const selectedSpeed = ref(1000);
const datasetKeys: DatasetKey[] = ['cpu', 'memory', 'networkIn', 'networkOut', 'errorRate', 'latency', 'throughput'];

const statusLabel = computed(() => {
  const labels = {
    idle: 'Paused',
    connecting: 'Connecting',
    live: 'Live Streaming',
    degraded: 'Degraded',
    reconnecting: 'Reconnecting',
    error: 'Connection Error'
  };
  return labels[store.streamState.status];
});

function toggleStream() {
  if (store.isStreaming) {
    store.pause();
  } else {
    store.start();
  }
}

function updateSpeed() {
  store.setSpeed(selectedSpeed.value);
}

function handleTimeRangeChange(event: Event) {
  store.setTimeRange(Number((event.target as HTMLSelectElement).value) as TimeRange);
}

function toggleTheme() {
  const nextTheme: ThemeMode = store.theme === 'dark' ? 'light' : 'dark';
  store.setTheme(nextTheme);
}
</script>

<style scoped>
.controls-container {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: var(--spacing-md);
  align-items: center;
  padding: var(--spacing-md);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 0;
}

.status-indicator small {
  display: block;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 42ch;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--text-muted);
  transition: all 0.3s ease;
  flex: 0 0 auto;
}

.live .dot {
  background-color: var(--success);
  box-shadow: 0 0 8px var(--success);
  animation: pulse 1.5s infinite;
}

.connecting .dot,
.reconnecting .dot,
.degraded .dot {
  background-color: var(--warning);
  box-shadow: 0 0 8px var(--warning);
}

.error .dot {
  background-color: var(--danger);
  box-shadow: 0 0 8px var(--danger);
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.7; }
  70% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.actions {
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.btn,
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  min-height: 34px;
  border-radius: var(--border-radius);
  font-weight: 600;
  font-size: 0.86rem;
  transition: all 0.2s ease;
}

.btn {
  padding: 0 var(--spacing-sm);
}

.btn-primary {
  background-color: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
}

.btn-primary:hover {
  background-color: var(--accent);
  color: var(--accent-contrast);
}

.btn-secondary,
.chip {
  background-color: var(--bg-panel-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover,
.chip:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.icon {
  width: 16px;
  height: 16px;
}

.field {
  display: grid;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.select-input {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  min-height: 34px;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
}

.select-input:focus {
  border-color: var(--accent);
}

.dataset-toggles {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.chip {
  padding: 0 var(--spacing-sm);
  background-color: rgba(255, 255, 255, 0.025);
}

.chip.active {
  color: var(--text-primary);
  border-color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 3%, var(--bg-panel-hover));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: var(--dataset-color);
}

@media (max-width: 900px) {
  .controls-container {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .controls-container {
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .status-indicator {
    align-items: flex-start;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
  }

  .status-indicator small {
    max-width: 100%;
    white-space: normal;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .btn,
  .field,
  .select-input {
    width: 100%;
  }

  .btn,
  .chip {
    min-height: 38px;
    border-radius: 10px;
  }

  .icon-action {
    grid-column: span 2;
    height: 40px;
    min-height: 40px;
    padding: 0;
  }

  .stream-action {
    order: 1;
  }

  .theme-action {
    order: 2;
  }

  .clear-action {
    order: 3;
  }

  .field {
    grid-column: span 3;
    order: 4;
    margin-top: var(--spacing-xs);
  }

  .btn-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .dataset-toggles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--border-color);
  }

  .chip {
    justify-content: flex-start;
    padding: 0 10px;
    min-width: 0;
  }
}
</style>
