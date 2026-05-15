export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  activeUsers: number;
  errorRate: number;
  latency: number;
  throughput: number;
}

export interface MetricsEnvelope {
  timestamp: number;
  metrics: SystemMetrics;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
}

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'degraded' | 'reconnecting' | 'error';

export interface StreamState {
  status: StreamStatus;
  message: string;
  attempt: number;
  lastConnectedAt: number | null;
  lastErrorAt: number | null;
}

type TopicPayloads = {
  metrics: MetricsEnvelope | unknown;
  logs: ActivityLog | unknown;
  status: StreamState;
};

type Subscriber<T> = (data: T) => void;

class DataStreamService {
  private isStreaming = false;
  private intervalId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private subscribers: { [K in keyof TopicPayloads]: Set<Subscriber<TopicPayloads[K]>> } = {
    metrics: new Set(),
    logs: new Set(),
    status: new Set()
  };
  private updateFrequency = 1000;
  private reconnectAttempt = 0;
  private consecutiveMalformed = 0;
  private lastConnectedAt: number | null = null;
  private currentStatus: StreamStatus = 'idle';

  private state: SystemMetrics = {
    cpu: 40,
    memory: 60,
    networkIn: 100,
    networkOut: 50,
    activeUsers: 1000,
    errorRate: 1,
    latency: 120,
    throughput: 900
  };

  public subscribe<Topic extends keyof TopicPayloads>(
    topic: Topic,
    callback: Subscriber<TopicPayloads[Topic]>
  ): () => void {
    this.subscribers[topic].add(callback);

    return () => {
      this.subscribers[topic].delete(callback);
    };
  }

  public start() {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.emitStatus('connecting', 'Opening mock telemetry channel');

    window.setTimeout(() => {
      if (!this.isStreaming) return;
      this.lastConnectedAt = Date.now();
      this.reconnectAttempt = 0;
      this.emitStatus('live', 'Receiving telemetry');
      this.intervalId = window.setInterval(() => this.generateTick(), this.updateFrequency);
    }, 350);
  }

  public stop() {
    this.isStreaming = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.emitStatus('idle', 'Stream paused');
  }

  public setFrequency(ms: number) {
    this.updateFrequency = Math.max(100, Math.min(5000, ms));

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = window.setInterval(() => this.generateTick(), this.updateFrequency);
    }
  }

  public getStatus() {
    return this.isStreaming;
  }

  private generateTick() {
    if (Math.random() > 0.997) {
      this.simulateDisconnect();
      return;
    }

    const timestamp = Date.now();

    this.state.cpu = this.clamp(this.state.cpu + (Math.random() - 0.5) * 10, 5, 100);
    this.state.memory = this.clamp(this.state.memory + (Math.random() - 0.5) * 5, 10, 100);
    this.state.networkIn = this.clamp(this.state.networkIn + (Math.random() - 0.5) * 50, 0, 900);
    this.state.networkOut = this.clamp(this.state.networkOut + (Math.random() - 0.5) * 30, 0, 650);
    this.state.activeUsers = Math.max(100, this.state.activeUsers + Math.floor((Math.random() - 0.5) * 50));
    this.state.errorRate = this.clamp(this.state.errorRate + (Math.random() - 0.5) * 2, 0, 25);
    this.state.latency = this.clamp(this.state.latency + (Math.random() - 0.5) * 30, 20, 900);
    this.state.throughput = this.clamp(this.state.throughput + (Math.random() - 0.5) * 120, 80, 2500);

    if (Math.random() > 0.95) {
      this.state.cpu = this.clamp(this.state.cpu + 35, 5, 100);
      this.state.errorRate = this.clamp(this.state.errorRate + 12, 0, 25);
      this.state.latency = this.clamp(this.state.latency + 250, 20, 900);
      this.generateLog('critical', 'High CPU utilization detected', 'System Monitor');
    }

    if (Math.random() > 0.995) {
      this.consecutiveMalformed += 1;
      this.notifySubscribers('metrics', { timestamp, metrics: { cpu: 'NaN', source: '<script>' } });
      this.emitStatus('degraded', `Rejected malformed telemetry payload (${this.consecutiveMalformed})`);
    } else {
      if (this.currentStatus === 'degraded') {
        this.emitStatus('live', 'Receiving telemetry');
      }
      this.consecutiveMalformed = 0;
      this.notifySubscribers('metrics', {
        timestamp,
        metrics: { ...this.state }
      });
    }

    if (Math.random() > 0.7) {
      const levels: ActivityLog['level'][] = ['info', 'info', 'warning', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)] ?? 'info';
      const sources = ['Auth Service', 'Database', 'API Gateway', 'Payment Processor', 'Edge Collector'];
      const source = sources[Math.floor(Math.random() * sources.length)] ?? 'Telemetry';
      const messages: Record<'info' | 'warning' | 'error', string[]> = {
        info: ['User login successful', 'Cache refreshed', 'Scheduled task completed', 'New connection established'],
        warning: ['High memory usage', 'Slow query execution', 'Rate limit approaching', 'Queue depth rising'],
        error: ['Connection refused', 'Invalid payload received', 'Timeout occurred', 'Packet loss threshold exceeded']
      };
      const message = messages[level === 'critical' ? 'error' : level][
        Math.floor(Math.random() * messages[level === 'critical' ? 'error' : level].length)
      ] ?? 'Telemetry event received';

      this.generateLog(level, message, source);
    }
  }

  private simulateDisconnect() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.reconnectAttempt += 1;
    const delay = Math.min(8000, 500 * 2 ** (this.reconnectAttempt - 1));
    this.emitStatus('reconnecting', `Connection interrupted. Reconnecting in ${delay / 1000}s`);
    this.generateLog('warning', 'Telemetry connection interrupted', 'Stream Gateway');

    this.reconnectTimeoutId = window.setTimeout(() => {
      if (!this.isStreaming) return;

      if (Math.random() > 0.85 && this.reconnectAttempt < 3) {
        this.emitStatus('error', 'Reconnect attempt failed');
        this.simulateDisconnect();
        return;
      }

      this.lastConnectedAt = Date.now();
      this.emitStatus('live', 'Telemetry stream recovered');
      this.generateLog('info', 'Telemetry stream recovered', 'Stream Gateway');
      this.intervalId = window.setInterval(() => this.generateTick(), this.updateFrequency);
    }, delay);
  }

  private generateLog(level: ActivityLog['level'], message: string, source: string) {
    const log: ActivityLog = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
      timestamp: Date.now(),
      level,
      message,
      source
    };
    this.notifySubscribers('logs', log);
  }

  private emitStatus(status: StreamStatus, message: string) {
    this.currentStatus = status;
    this.notifySubscribers('status', {
      status,
      message,
      attempt: this.reconnectAttempt,
      lastConnectedAt: this.lastConnectedAt,
      lastErrorAt: status === 'error' || status === 'reconnecting' || status === 'degraded' ? Date.now() : null
    });
  }

  private notifySubscribers<Topic extends keyof TopicPayloads>(topic: Topic, data: TopicPayloads[Topic]) {
    this.subscribers[topic].forEach(subscriber => subscriber(data));
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }
}

export const dataStream = new DataStreamService();
