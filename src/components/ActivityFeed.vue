<template>
  <div class="card feed-container glow-cyan">
    <div class="feed-header">
      <div>
        <h3>Live Activity Feed</h3>
        <span class="subtle">{{ store.filteredLogs.length }} shown / {{ store.logs.length }} retained</span>
      </div>
      <span class="badge">{{ store.rejectedPayloads }} rejected</span>
    </div>

    <div class="feed-tools">
      <div class="search-field">
        <Search class="search-icon" />
        <input
          :value="store.logSearch"
          type="search"
          placeholder="Search events"
          @input="handleSearch"
        />
      </div>

      <select
        :value="store.severityFilter"
        class="select-input"
        @change="handleSeverityChange"
      >
        <option value="all">All severities</option>
        <option value="critical">Critical</option>
        <option value="error">Errors</option>
        <option value="warning">Warnings</option>
        <option value="info">Info</option>
      </select>
    </div>

    <div class="feed-list">
      <TransitionGroup name="list">
        <div v-for="log in visibleLogs" :key="log.id" class="feed-item" :class="log.level">
          <div class="item-time">{{ formatTime(log.timestamp) }}</div>
          <div class="item-source">{{ log.source }}</div>
          <div class="item-message">{{ log.message }}</div>
          <div class="item-level">{{ log.level.toUpperCase() }}</div>
        </div>
      </TransitionGroup>

      <div v-if="store.filteredLogs.length > visibleLogs.length" class="feed-more">
        Showing latest {{ visibleLogs.length }} matching events
      </div>

      <div v-if="store.filteredLogs.length === 0" class="empty-state">
        No matching activity
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Search } from '@lucide/vue';
import { useMetricsStore } from '../stores/metrics';
import type { SeverityFilter } from '../stores/metrics';

const store = useMetricsStore();
const visibleLogs = computed(() => store.filteredLogs.slice(0, 120));

function handleSearch(event: Event) {
  store.setLogSearch((event.target as HTMLInputElement).value);
}

function handleSeverityChange(event: Event) {
  store.setSeverityFilter((event.target as HTMLSelectElement).value as SeverityFilter);
}

function formatTime(ts: number) {
  const date = new Date(ts);
  return `${date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}.${date.getMilliseconds().toString().padStart(3, '0')}`;
}
</script>

<style scoped>
.feed-container {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100vh - 196px));
  min-height: 460px;
  overflow: hidden;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--spacing-sm);
}

.feed-header h3 {
  font-size: 1rem;
}

.subtle {
  display: inline-block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.badge {
  background: var(--bg-panel-hover);
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.76rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.feed-tools {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-field {
  position: relative;
}

.search-field input,
.select-input {
  width: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  min-height: 36px;
  border-radius: 4px;
  outline: none;
}

.search-field input {
  padding: 4px 10px 4px 32px;
}

.select-input {
  padding: 4px 8px;
}

.search-field input:focus,
.select-input:focus {
  border-color: var(--accent);
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.feed-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding-right: 2px;
}

.feed-item {
  display: grid;
  grid-template-columns: 96px minmax(92px, 135px) minmax(140px, 1fr) 74px;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-panel-hover);
  border-radius: 4px;
  font-size: 0.8rem;
  align-items: center;
  border-left: 3px solid transparent;
}

.feed-item.info {
  border-left-color: var(--accent);
}

.feed-item.warning {
  border-left-color: var(--warning);
}

.feed-item.error {
  border-left-color: var(--danger);
}

.feed-item.critical {
  border-left-color: #ff2d55;
}

.item-time {
  color: var(--text-muted);
  font-family: var(--mono-font);
  font-variant-numeric: tabular-nums;
}

.item-source {
  color: var(--text-secondary);
  font-weight: 600;
}

.item-message {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.item-level {
  font-size: 0.68rem;
  font-weight: 800;
  text-align: right;
}

.info .item-level { color: var(--accent); }
.warning .item-level { color: var(--warning); }
.error .item-level { color: var(--danger); }
.critical .item-level { color: #ff2d55; }

.empty-state,
.feed-more {
  text-align: center;
  color: var(--text-muted);
  padding: var(--spacing-lg);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.24s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 560px) {
  .feed-container {
    min-height: 500px;
  }

  .feed-item {
    grid-template-columns: 1fr auto;
  }

  .item-time,
  .item-source,
  .item-message {
    grid-column: 1 / -1;
  }
}
</style>
