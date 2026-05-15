# Real-Time Data Visualization Platform

A Vue 3 + TypeScript real-time analytics dashboard for live system telemetry, operational events, and resilient stream monitoring. The UI simulates a production monitoring surface with live charts, metric cards, event filtering, dataset controls, light/dark mode, validation, and reconnect handling.

## Setup Instructions

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Production build:

```bash
npm run build
```

## Features

- Mock real-time telemetry stream with configurable update frequency.
- Live line, area, bar, and heatmap visualizations using ECharts Canvas rendering.
- Real-time metric cards for CPU, memory, network traffic, latency, active users, and health score.
- Searchable activity feed with severity filtering and newest-first ordering.
- Pause/resume streaming, time range selection, dataset toggles, clear data, and light/dark theme.
- Bounded in-memory buffers to avoid unbounded growth during long-running streams.
- Payload validation, text sanitization, malformed payload rejection, connection interruption simulation, and reconnect backoff.
- Responsive desktop, tablet, and mobile layouts.

## Architecture

- `src/services/DataStreamService.ts` owns the mock streaming engine. It exposes a typed pub/sub API for `metrics`, `logs`, and `status` topics.
- `src/stores/metrics.ts` is the centralized Pinia store. It validates incoming payloads, sanitizes logs, buffers chart history, manages filters, and exposes computed chart series.
- `src/components/charts/*` contains reusable chart wrappers. Charts are async-loaded from `App.vue`, and ECharts registration is isolated in `src/components/charts/echarts.ts`.
- `src/components/DashboardControls.vue` contains stream controls, time range selection, dataset toggles, and theme switching.
- `src/components/ActivityFeed.vue` contains the live log feed, search, severity filtering, and bounded rendering.

## State Management Strategy

Pinia is used as the single source of truth for:

- current metric snapshot
- historical chart buffers
- stream status and reconnect state
- rejected payload count
- activity logs and feed filters
- visible datasets
- selected time range
- theme mode

The store uses `shallowRef` for high-frequency arrays so Vue does not deeply proxy every chart point.

## Rendering Optimization Decisions

- Chart histories are capped at `3000` points per dataset.
- Activity logs are capped at `500`, while the feed renders only the latest matching `120`.
- ECharts uses Canvas rendering, disabled animation for real-time updates, `sampling: 'lttb'`, and progressive rendering hints.
- Chart components are loaded with `defineAsyncComponent`, splitting the dashboard shell from ECharts-heavy chart code.
- Time range filtering is computed from buffered data instead of mutating the raw history.
- Stream subscriptions are cleaned up on pause and component unmount.

## Data Streaming Approach

The app uses a mocked streaming generator instead of a backend WebSocket server. The generator:

- emits system metrics on an interval
- produces random-walk telemetry and anomaly spikes
- emits live operational logs
- occasionally emits malformed payloads
- simulates connection interruption and reconnect attempts with exponential backoff
- publishes connection status updates for the UI

This keeps the submission portable while demonstrating real-time stream architecture.

## Security And Stability

- Incoming metric and log payloads are validated before entering application state.
- Invalid payloads are rejected and counted.
- Log text is sanitized and truncated.
- No unsafe DOM injection is used.
- Intervals and reconnect timers are cleared when streaming stops.
- Store subscriptions are unsubscribed on pause/unmount to prevent leaks.

## Trade-Offs

- The stream is mocked for portability; replacing `DataStreamService` with WebSocket or SSE transport would not require major UI changes.
- ECharts gives strong Canvas performance and advanced charts, but its library chunk remains large. The app mitigates this by lazy-loading chart components and isolating ECharts into a separate chunk.
- Virtual scrolling was approximated with bounded rendering because the retained feed size is intentionally capped. A library such as TanStack Virtual would be useful for much larger retained logs.
